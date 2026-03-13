import { NextResponse } from "next/server";
import { fetchTokenStatus } from "@/lib/keepa/client";

export async function GET() {
  try {
    const status = await fetchTokenStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Keepa token API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
