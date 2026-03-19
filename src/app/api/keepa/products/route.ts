import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchProducts, resolveSellerNames } from "@/lib/keepa/client";
import { transformKeepaProduct } from "@/lib/keepa/transform";
import { kvGet, kvPut } from "@/lib/store";

const requestSchema = z.object({
  asins: z
    .array(z.string().regex(/^[A-Z0-9]{10}$/, "Invalid ASIN format"))
    .min(1, "At least one ASIN is required")
    .max(1000, "Maximum 1000 ASINs per request"),
  domain: z.number().int().min(1).max(11).optional().default(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { asins, domain } = parsed.data;
    const keepaResponse = await fetchProducts(asins, domain);

    const products = (keepaResponse.products ?? []).map((p) =>
      transformKeepaProduct(p, domain)
    );

    // Resolve seller names for all buybox seller IDs
    const sellerIds = products
      .map((p) => p.buyBoxSellerId)
      .filter((id): id is string => !!id && id !== "Amazon");
    const uniqueSellerIds = [...new Set(sellerIds)];

    // Load cached seller names from file store
    let kvSellerCache: Record<string, string> = {};
    try {
      const cached = await kvGet("seller-names");
      if (cached) kvSellerCache = JSON.parse(cached);
    } catch {}

    if (uniqueSellerIds.length > 0) {
      // Pre-fill from cache
      const stillUnresolved: string[] = [];
      for (const id of uniqueSellerIds) {
        if (kvSellerCache[id]) {
          for (const product of products) {
            if (product.buyBoxSellerId === id) {
              product.buyBoxSellerName = kvSellerCache[id];
            }
          }
        } else {
          stillUnresolved.push(id);
        }
      }

      // Resolve remaining via Keepa seller API
      if (stillUnresolved.length > 0) {
        const sellerNames = await resolveSellerNames(stillUnresolved, domain);
        for (const product of products) {
          if (product.buyBoxSellerId && sellerNames.has(product.buyBoxSellerId)) {
            const name = sellerNames.get(product.buyBoxSellerId)!;
            product.buyBoxSellerName = name;
            if (name !== product.buyBoxSellerId) {
              kvSellerCache[product.buyBoxSellerId] = name;
            }
          }
        }
        // Persist updated cache
        kvPut("seller-names", JSON.stringify(kvSellerCache)).catch(() => {});
      }
    }

    return NextResponse.json({
      products,
      tokensLeft: keepaResponse.tokensLeft,
      refillIn: keepaResponse.refillIn,
      refillRate: keepaResponse.refillRate,
      tokensConsumed: keepaResponse.tokensConsumed,
    });
  } catch (error) {
    console.error("Keepa products API error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";

    if (message.includes("429") || message.includes("token")) {
      return NextResponse.json(
        { error: "API token limit reached. Please wait and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
