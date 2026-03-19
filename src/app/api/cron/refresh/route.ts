import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvPut } from "@/lib/store";
import { fetchProducts, resolveSellerNames, fetchTokenStatus } from "@/lib/keepa/client";
import { transformKeepaProduct } from "@/lib/keepa/transform";
import { DashboardProduct } from "@/types/product";

const ASINS_KEY = "tracked-asins";
const PRODUCTS_KEY = "products-cache";
const ALL_DOMAINS = [4, 9, 3, 8, 2]; // FR, ES, DE, IT, UK
const BATCH_SIZE = 20;
const TOKENS_PER_PRODUCT = 6;
const TOKEN_SAFETY_MARGIN = 5;

interface TrackedProduct {
  asin: string;
  sku: string;
  officialListPrice: number | null;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function productKey(p: DashboardProduct): string {
  return `${p.asin}::${p.domain}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Background refresh: fetch all ASINs for all domains, save to file store.
 * Called by system cron or manually.
 * Protected by CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  // Simple auth check — cron secret
  const authHeader = request.headers.get("x-cron-secret") || "";
  const cronSecret = process.env.CRON_SECRET || process.env.APP_PASSWORD || "";

  if (authHeader !== cronSecret && cronSecret !== "") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load tracked ASINs
  const asinsRaw = await kvGet(ASINS_KEY);
  const trackedProducts: TrackedProduct[] = asinsRaw ? JSON.parse(asinsRaw) : [];
  const asins = trackedProducts.map((p) => p.asin);

  if (asins.length === 0) {
    return NextResponse.json({ message: "No ASINs to refresh", count: 0 });
  }

  // Load existing products cache
  const cacheRaw = await kvGet(PRODUCTS_KEY);
  const existingProducts: DashboardProduct[] = cacheRaw ? JSON.parse(cacheRaw) : [];
  const productMap = new Map(existingProducts.map((p) => [productKey(p), p]));

  const batches = chunkArray(asins, BATCH_SIZE);
  let totalFetched = 0;
  let totalTokensUsed = 0;
  const errors: string[] = [];

  for (const domain of ALL_DOMAINS) {
    for (const batch of batches) {
      try {
        // Check tokens before each batch
        const tokensNeeded = batch.length * TOKENS_PER_PRODUCT + TOKEN_SAFETY_MARGIN;
        const tokenStatus = await fetchTokenStatus(domain);

        if (tokenStatus.tokensLeft < tokensNeeded) {
          // Wait for tokens to refill
          const tokensToWait = tokensNeeded - tokenStatus.tokensLeft;
          const refillRate = tokenStatus.refillRate || 20;
          const waitMs = Math.ceil((tokensToWait / refillRate) * 60 * 1000) + 2000;

          // On VPS we can wait longer than on Cloudflare Workers
          if (waitMs > 300000) {
            errors.push(`Skipped domain ${domain}: not enough tokens (need ${tokensNeeded}, have ${tokenStatus.tokensLeft})`);
            break;
          }
          await sleep(waitMs);
        }

        const keepaResponse = await fetchProducts(batch, domain);
        const products = (keepaResponse.products ?? []).map((p) =>
          transformKeepaProduct(p, domain)
        );

        // Resolve seller names
        const sellerIds = products
          .map((p) => p.buyBoxSellerId)
          .filter((id): id is string => !!id && id !== "Amazon");
        const uniqueSellerIds = [...new Set(sellerIds)];

        if (uniqueSellerIds.length > 0) {
          const sellerNames = await resolveSellerNames(uniqueSellerIds, domain);
          for (const product of products) {
            if (product.buyBoxSellerId && sellerNames.has(product.buyBoxSellerId)) {
              product.buyBoxSellerName = sellerNames.get(product.buyBoxSellerId)!;
            }
          }
        }

        // Merge into product map
        for (const np of products) {
          productMap.set(productKey(np), np);
        }

        totalFetched += products.length;
        totalTokensUsed += keepaResponse.tokensConsumed ?? 0;

        // Brief delay between batches
        await sleep(300);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Domain ${domain}, batch error: ${msg}`);
      }
    }
  }

  // Save updated cache
  const allProducts = Array.from(productMap.values());
  await kvPut(PRODUCTS_KEY, JSON.stringify(allProducts));

  return NextResponse.json({
    message: "Refresh complete",
    totalFetched,
    totalTokensUsed,
    totalProducts: allProducts.length,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  });
}
