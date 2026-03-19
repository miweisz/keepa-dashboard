import "server-only";
import { KeepaResponse, TokenStatus } from "./types";

const KEEPA_BASE_URL = "https://api.keepa.com";
const MAX_ASINS_PER_REQUEST = 100;

function getApiKey(): string {
  const key = process.env.KEEPA_API_KEY;
  if (!key || key === "your_keepa_api_key_here") {
    throw new Error("KEEPA_API_KEY is not configured in .env.local");
  }
  return key;
}

export async function fetchProducts(
  asins: string[],
  domain: number = 1
): Promise<KeepaResponse> {
  const apiKey = getApiKey();

  // Chunk ASINs into batches of 100
  const chunks: string[][] = [];
  for (let i = 0; i < asins.length; i += MAX_ASINS_PER_REQUEST) {
    chunks.push(asins.slice(i, i + MAX_ASINS_PER_REQUEST));
  }

  let allProducts: KeepaResponse["products"] = [];
  let lastResponse: KeepaResponse | null = null;

  for (const chunk of chunks) {
    const params = new URLSearchParams({
      key: apiKey,
      domain: String(domain),
      asin: chunk.join(","),
      stats: "180",
      offers: "20",
      buybox: "1",
      history: "0",
      days: "1",
    });

    const url = `${KEEPA_BASE_URL}/product?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Keepa API error (${response.status}): ${text}`);
    }

    const data: KeepaResponse = await response.json();

    if (data.error) {
      throw new Error(`Keepa API error: ${data.error.message}`);
    }

    if (data.products) {
      allProducts = [...(allProducts ?? []), ...data.products];
    }
    lastResponse = data;
  }

  return {
    ...(lastResponse ?? {
      timestamp: Date.now(),
      tokensLeft: 0,
      refillIn: 0,
      refillRate: 0,
      tokenFlowReduction: 0,
      tokensConsumed: 0,
      processingTimeInMs: 0,
      products: [],
    }),
    products: allProducts,
  };
}

// ── Seller name resolution ──

// In-memory cache: sellerId -> sellerName (persists during server lifetime)
const sellerNameCache = new Map<string, string>();

const AMAZON_SELLER_IDS = new Set([
  "ATVPDKIKX0DER",   // US
  "A13V1IB3VIYZZH",  // FR
  "A1X6FK5RDHNB96",  // FR (alt)
  "A1RKKUPIHCS9HS",  // ES
  "A1PA6795UKMFR9",  // DE
  "A11IL2PNWYBER7",  // IT
  "APJ6JRA9NG5V4",   // UK
  "A1VC38T7YXB528",  // JP
  "A3DWYIK6Y9EEQB",  // CA
]);

export async function resolveSellerNames(
  sellerIds: string[],
  domain: number = 1
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const toResolve: string[] = [];

  for (const id of sellerIds) {
    if (!id) continue;
    if (AMAZON_SELLER_IDS.has(id)) {
      result.set(id, "Amazon");
      continue;
    }
    const cached = sellerNameCache.get(id);
    if (cached) {
      result.set(id, cached);
      continue;
    }
    toResolve.push(id);
  }

  if (toResolve.length === 0) return result;

  const apiKey = getApiKey();
  const MAX_SELLERS = 100;

  for (let i = 0; i < toResolve.length; i += MAX_SELLERS) {
    const chunk = toResolve.slice(i, i + MAX_SELLERS);
    const params = new URLSearchParams({
      key: apiKey,
      domain: String(domain),
      seller: chunk.join(","),
    });

    try {
      const response = await fetch(`${KEEPA_BASE_URL}/seller?${params.toString()}`);
      if (!response.ok) continue;

      const data = await response.json();
      if (data.sellers) {
        for (const [sellerId, sellerData] of Object.entries(data.sellers)) {
          const name = (sellerData as { sellerName?: string })?.sellerName;
          if (name) {
            sellerNameCache.set(sellerId, name);
            result.set(sellerId, name);
          } else {
            sellerNameCache.set(sellerId, sellerId);
            result.set(sellerId, sellerId);
          }
        }
      }
    } catch (err) {
      console.error("Keepa seller API error:", err);
      for (const id of chunk) {
        result.set(id, id);
      }
    }
  }

  for (const id of toResolve) {
    if (!result.has(id)) {
      result.set(id, id);
    }
  }

  return result;
}

export async function fetchTokenStatus(
  domain: number = 1
): Promise<TokenStatus> {
  const apiKey = getApiKey();
  const url = `${KEEPA_BASE_URL}/token?key=${apiKey}&domain=${domain}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Keepa token API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    timestamp: data.timestamp,
    tokensLeft: data.tokensLeft,
    refillIn: data.refillIn,
    refillRate: data.refillRate,
  };
}
