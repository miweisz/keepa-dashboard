"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { DashboardProduct } from "@/types/product";

/**
 * Continuous rolling refresh with localStorage cache:
 * - On mount, loads cached products from localStorage for instant display
 * - Loops forever through all (domain × batch) combinations
 * - Checks tokens before each batch, waits if needed
 * - Merges results incrementally (updates existing products, adds new)
 * - Persists products to localStorage after each batch
 * - Never stops unless paused or cancelled
 */

const BATCH_SIZE = 20;
const TOKENS_PER_PRODUCT = 6;
const TOKEN_SAFETY_MARGIN = 5;
const DELAY_BETWEEN_BATCHES = 500; // ms
const PRODUCTS_CACHE_KEY = "keepa-products-cache";

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
  const res = await fetch("/api/keepa/tokens");
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

/** Load cached products from localStorage */
function loadCachedProducts(): DashboardProduct[] {
  try {
    const cached = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

/** Save products to localStorage */
function saveCachedProducts(products: DashboardProduct[]): void {
  try {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
  } catch {
    // localStorage full or unavailable — ignore
  }
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

  // Load cached products on mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    const cached = loadCachedProducts();
    if (cached.length > 0) {
      setProducts(cached);
    }
  }, []);

  // Persist products to localStorage whenever they change
  useEffect(() => {
    if (products.length > 0) {
      saveCachedProducts(products);
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
                const response = await fetch("/api/keepa/products", {
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

                // Merge products incrementally
                const newProducts: DashboardProduct[] = data.products;
                setProducts((prev) => {
                  const map = new Map(prev.map((p) => [productKey(p), p]));
                  for (const np of newProducts) {
                    map.set(productKey(np), np);
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
