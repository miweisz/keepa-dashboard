import "server-only";
import fs from "fs";
import path from "path";

/**
 * Simple JSON file store — replaces Cloudflare KV for VPS deployment.
 * Data is stored in a `data/` directory at project root.
 */

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function filePath(key: string): string {
  // Sanitize key to safe filename
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(DATA_DIR, `${safe}.json`);
}

export async function kvGet(key: string): Promise<string | null> {
  ensureDataDir();
  const fp = filePath(key);
  try {
    return fs.readFileSync(fp, "utf-8");
  } catch {
    return null;
  }
}

export async function kvPut(key: string, value: string): Promise<void> {
  ensureDataDir();
  const fp = filePath(key);
  fs.writeFileSync(fp, value, "utf-8");
}
