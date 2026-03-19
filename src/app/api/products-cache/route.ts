import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvPut } from "@/lib/store";

const KV_KEY = "products-cache";

/** GET — return cached products */
export async function GET() {
  try {
    const raw = await kvGet(KV_KEY);
    const products = raw ? JSON.parse(raw) : [];
    return NextResponse.json(products);
  } catch (err) {
    console.error("Failed to load products cache:", err);
    return NextResponse.json([]);
  }
}

/** PUT — replace entire products cache */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Expected array" }, { status: 400 });
    }
    await kvPut(KV_KEY, JSON.stringify(body));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to save products cache:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
