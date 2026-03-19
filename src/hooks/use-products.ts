"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { DashboardProduct } from "@/types/product";

/**
 * Continuous rolling refresh with server-side KV cache:
 * - On mount, loads cached products from KV via API for instant display
 * - Loops forever through all (domain × batch) combinations
 * - Checks tokens before each batch, waits if needed
 * - Merges results incrementally (updates existing products, adds new)
 * - Persists products to KV after each batch
 * - Never stops unless paused or cancelled
 */

const BASE_PATH = "/amazon-tracker";
const BATCH_SIZE = 20;
const TOKENS_PER_PRODUCT = 6;
const TOKEN_SAFETY_MARGIN = 5;
const DELAY_BETWEEN_BATCHES = 500; // ms

interface BatchProgress {
  total: number;
  completed: number;
  currentDomain: string;
  currentBatch: number;
  waitingForTokens: boolean;
  waitSeconds: number;
  /** Which cycle we're on (1st full pass, 2nd, etc.) */
  cycle: number;
}

interface UseProductsResult {
  products: DashboardProduct[];
  isLoading: boolean;
  error: string | null;
  tokensLeft: number | null;
  tokensConsumed: number | null;
  progress: BatchProgress | null;
  isRunning: boolean;
  startContinuousRefresh: (asins: string[], domains: number[]) => void;
  stopRefresh: () => void;
}

const DOMAIN_NAMES: Record<number, string> = {
  1: "US", 2: "UK", 3: "DE", 4: "FR", 5: "JP",
  6: "CA", 8: "IT", 9: "ES", 10: "IN",
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function checkTokens(): Promise<{ tokensLeft: number; refillRate: number }> {
  const res = await fetch(`${BASE_PATH}/api/keepa/tokens`);
  if (!res.ok) throw new Error("Failed to check token status");
  const data = await res.json();
  return { tokensLeft: data.tokensLeft ?? 0, refillRate: data.refillRate ?? 20 };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Create a unique key for a product (asin + domain) */
function productKey(p: DashboardProduct): string {
  return `${p.asin}::${p.domain}`;
}

/** Save products to server (debounced via caller) */
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
function debouncedSaveToServer(products: DashboardProduct[]): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    fetch(`${BASE_PATH}/api/products-cache`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(products),
    }).catch(() => {});
  }, 2000); // Save every 2s at most to avoid hammering KV
}

export function useProducts(): UseProductsResult {
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokensLeft, setTokensLeft] = useState<number | null>(null);
  const [tokensConsumed, setTokensConsumed] = useState<number | null>(null);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const cancelRef = useRef(false);
  const runningRef = useRef(false);
  const isInitializedRef = useRef(false);

  // Load cached products from server on mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    fetch(`${BASE_PATH}/api/products-cache`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Ensure backwards compatibility with cached data missing new fields
          const normalized = data.map((p: DashboardProduct) => ({
            ...p,
            allImageUrls: p.allImageUrls ?? [],
            features: p.features ?? [],
            variation: p.variation ?? null,
          }));
          setProducts(normalized);
        }
      })
      .catch(() => {});
  }, []);

  // Persist products to server whenever they change
  useEffect(() => {
    if (products.length > 0 && isInitializedRef.current) {
      debouncedSaveToServer(products);
    }
  }, [products]);

  const stopRefresh = useCallback(() => {
    cancelRef.current = true;
    runningRef.current = false;
    setIsRunning(false);
  }, []);

  const startContinuousRefresh = useCallback(
    (asins: string[], domains: number[]) => {
      if (asins.length === 0 || domains.length === 0) return;
      if (runningRef.current) return; // already running

      cancelRef.current = false;
      runningRef.current = true;
      setIsRunning(true);
      setError(null);

      const run = async () => {
        const batches = chunkArray(asins, BATCH_SIZE);
        const totalBatches = batches.length * domains.length;
        let cycle = 1;

        // Continuous loop
        while (!cancelRef.current) {
          let completedBatches = 0;
          let cycleConsumed = 0;
          setIsLoading(true);

          try {
            for (const domain of domains) {
              const domainName = DOMAIN_NAMES[domain] ?? String(domain);

              for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
                if (cancelRef.current) break;

                const batch = batches[batchIdx];
                const tokensNeeded = batch.length * TOKENS_PER_PRODUCT + TOKEN_SAFETY_MARGIN;

                // Check tokens
                let tokenStatus = await checkTokens();
                setTokensLeft(tokenStatus.tokensLeft);

                // Wait for tokens if needed
                if (tokenStatus.tokensLeft < tokensNeeded) {
                  const tokensToWait = tokensNeeded - tokenStatus.tokensLeft;
                  const refillRate = tokenStatus.refillRate || 20;
                  const waitMs = Math.ceil((tokensToWait / refillRate) * 60 * 1000) + 2000;

                  setProgress({
                    total: totalBatches,
                    completed: completedBatches,
                    currentDomain: domainName,
                    currentBatch: batchIdx + 1,
                    waitingForTokens: true,
                    waitSeconds: Math.ceil(waitMs / 1000),
                    cycle,
                  });

                  const waitEnd = Date.now() + waitMs;
                  while (Date.now() < waitEnd) {
                    if (cancelRef.current) break;
                    const remaining = Math.ceil((waitEnd - Date.now()) / 1000);
                    setProgress((prev) =>
                      prev ? { ...prev, waitSeconds: remaining, waitingForTokens: true } : null
                    );
                    await sleep(1000);
                  }

                  if (cancelRef.current) break;

                  tokenStatus = await checkTokens();
                  setTokensLeft(tokenStatus.tokensLeft);
                }

                // Update progress
                setProgress({
                  total: totalBatches,
                  completed: completedBatches,
                  currentDomain: domainName,
                  currentBatch: batchIdx + 1,
                  waitingForTokens: false,
                  waitSeconds: 0,
                  cycle,
                });

                // Fetch batch
                const response = await fetch(`${BASE_PATH}/api/keepa/products`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ asins: batch, domain }),
                });

                const data = await response.json();

                if (!response.ok) {
                  if (response.status === 429) {
                    setProgress((prev) =>
                      prev ? { ...prev, waitingForTokens: true, waitSeconds: 60 } : null
                    );
                    await sleep(60000);
                    batchIdx--; // retry
                    continue;
                  }
                  throw new Error(data.error || `HTTP ${response.status}`);
                }

                // Merge products incrementally, preserving resolved seller names
                const newProducts: DashboardProduct[] = (data.products ?? []).map((p: DashboardProduct) => ({
                  ...p,
                  allImageUrls: p.allImageUrls ?? [],
                  features: p.features ?? [],
                }));
                setProducts((prev) => {
                  const map = new Map(prev.map((p) => [productKey(p), p]));
                  for (const np of newProducts) {
                    const key = productKey(np);
                    const existing = map.get(key);
                    // If the new data has an unresolved seller name (same as ID),
                    // but we already had a resolved name, keep it
                    if (
                      existing &&
                      np.buyBoxSellerId &&
                      np.buyBoxSellerName === np.buyBoxSellerId &&
                      existing.buyBoxSellerName &&
                      existing.buyBoxSellerName !== existing.buyBoxSellerId
                    ) {
                      map.set(key, { ...np, buyBoxSellerName: existing.buyBoxSellerName });
                    } else {
                      map.set(key, np);
                    }
                  }
                  return Array.from(map.values());
                });

                setTokensLeft(data.tokensLeft);
                cycleConsumed += data.tokensConsumed ?? 0;
                completedBatches++;

                if (!cancelRef.current) {
                  await sleep(DELAY_BETWEEN_BATCHES);
                }
              }

              if (cancelRef.current) break;
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : "Erreur lors du refresh";
            setError(message);
            // Wait 30s before retrying on error
            await sleep(30000);
            setError(null);
          }

          setTokensConsumed(cycleConsumed);
          setIsLoading(false);
          setProgress(null);

          if (cancelRef.current) break;

          // Brief pause between cycles
          cycle++;
          await sleep(2000);
        }

        setIsLoading(false);
        setProgress(null);
        runningRef.current = false;
        setIsRunning(false);
      };

      run();
    },
    []
  );

  return {
    products,
    isLoading,
    error,
    tokensLeft,
    tokensConsumed,
    progress,
    isRunning,
    startContinuousRefresh,
    stopRefresh,
  };
}
