import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvPut } from "@/lib/store";

const SETTINGS_KEY = "dashboard-settings";

interface DashboardSettings {
  columnOrder?: string[];
}

export async function GET() {
  try {
    const raw = await kvGet(SETTINGS_KEY);
    const settings: DashboardSettings = raw ? JSON.parse(raw) : {};
    return NextResponse.json(settings);
  } catch (err) {
    console.error("Failed to load settings:", err);
    return NextResponse.json({});
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: DashboardSettings = await request.json();

    // Merge with existing settings
    const raw = await kvGet(SETTINGS_KEY);
    const existing: DashboardSettings = raw ? JSON.parse(raw) : {};
    const merged = { ...existing, ...body };

    await kvPut(SETTINGS_KEY, JSON.stringify(merged));
    return NextResponse.json(merged);
  } catch (err) {
    console.error("Failed to save settings:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
