import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvPut } from "@/lib/store";

const KV_KEY = "tracked-asins";

/** GET — return tracked products list */
export async function GET() {
  try {
    const raw = await kvGet(KV_KEY);
    const products = raw ? JSON.parse(raw) : [];
    return NextResponse.json(products);
  } catch (err) {
    console.error("Failed to load ASINs:", err);
    return NextResponse.json([]);
  }
}

/** PUT — replace entire tracked products list */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Expected array" }, { status: 400 });
    }
    await kvPut(KV_KEY, JSON.stringify(body));
    return NextResponse.json(body);
  } catch (err) {
    console.error("Failed to save ASINs:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
