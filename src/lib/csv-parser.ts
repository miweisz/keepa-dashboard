import Papa from "papaparse";

const ASIN_REGEX = /^[A-Z0-9]{10}$/;

export interface CsvParsedProduct {
  asin: string;
  sku: string;
  officialListPrice: number | null;
}

export interface CsvParseResult {
  products: CsvParsedProduct[];
  duplicates: string[];
  invalid: string[];
  total: number;
}

/** Parse a price string like "29,95" or "29.95" or "€29,95" into a number */
function parsePrice(raw: string | undefined): number | null {
  if (!raw) return null;
  // Remove currency symbols and whitespace
  const cleaned = raw.replace(/[€$£\s]/g, "").trim();
  if (!cleaned) return null;
  // Replace comma with dot for French format
  const num = parseFloat(cleaned.replace(",", "."));
  return isNaN(num) ? null : num;
}

export function extractProductsFromCsv(csvText: string): CsvParseResult {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    delimiter: "",  // auto-detect delimiter (; , \t etc.)
    transformHeader: (h) => h.trim(),
  });

  const products: CsvParsedProduct[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  const duplicates: string[] = [];

  const headers = result.meta.fields ?? [];

  // Find ASIN column
  let asinColumn = headers.find((h) =>
    h.toLowerCase().includes("asin")
  );

  // Find SKU column (try various common names)
  const skuColumn = headers.find((h) => {
    const lower = h.toLowerCase();
    return (
      lower.includes("sku") ||
      lower === "ref" ||
      lower === "reference" ||
      lower === "référence" ||
      lower === "code"
    );
  });

  // Find price column
  const priceColumn = headers.find((h) => {
    const lower = h.toLowerCase();
    return (
      lower.includes("prix") ||
      lower.includes("price") ||
      lower.includes("tarif") ||
      lower.includes("pvp") ||
      lower.includes("msrp") ||
      lower.includes("rrp")
    );
  });

  // If no ASIN column header, try to find one with ASIN-like values
  if (!asinColumn && result.data.length > 0) {
    for (const header of headers) {
      const firstVal = result.data[0][header]?.trim().toUpperCase();
      if (firstVal && ASIN_REGEX.test(firstVal)) {
        asinColumn = header;
        break;
      }
    }
  }

  // If still no column, try without headers
  if (!asinColumn) {
    const noHeaderResult = Papa.parse<string[]>(csvText, {
      header: false,
      skipEmptyLines: true,
      delimiter: "",  // auto-detect delimiter
    });

    // Detect which column index contains ASINs
    let asinIdx = -1;
    if (noHeaderResult.data.length > 0) {
      for (let i = 0; i < noHeaderResult.data[0].length; i++) {
        const val = noHeaderResult.data[0][i]?.trim().toUpperCase();
        if (val && ASIN_REGEX.test(val)) {
          asinIdx = i;
          break;
        }
      }
    }

    if (asinIdx >= 0) {
      // Smart column detection: find SKU and price columns by position
      const numCols = noHeaderResult.data[0]?.length ?? 0;
      let skuIdx = -1;
      let priceIdx = -1;

      for (let i = 0; i < numCols; i++) {
        if (i === asinIdx) continue;
        // Check if column looks like prices (numeric with comma or dot)
        const sampleVal = noHeaderResult.data[0][i]?.trim() ?? "";
        const looksLikePrice = parsePrice(sampleVal) !== null && /[\d]/.test(sampleVal);
        if (looksLikePrice) {
          priceIdx = i;
        } else if (sampleVal.length > 0) {
          skuIdx = i;
        }
      }

      for (const row of noHeaderResult.data) {
        const val = row[asinIdx]?.trim().toUpperCase();
        if (!val || !ASIN_REGEX.test(val)) {
          if (val && val.length > 0 && val.length <= 15) invalid.push(val);
          continue;
        }
        if (seen.has(val)) {
          duplicates.push(val);
        } else {
          seen.add(val);
          const sku = skuIdx >= 0 ? (row[skuIdx]?.trim() ?? "") : "";
          const price = priceIdx >= 0 ? parsePrice(row[priceIdx]) : null;
          products.push({ asin: val, sku, officialListPrice: price });
        }
      }
    } else {
      // Fallback: scan all cells for ASINs
      for (const row of noHeaderResult.data) {
        for (const cell of row) {
          const val = cell?.trim().toUpperCase();
          if (!val) continue;
          if (ASIN_REGEX.test(val)) {
            if (seen.has(val)) {
              duplicates.push(val);
            } else {
              seen.add(val);
              products.push({ asin: val, sku: "", officialListPrice: null });
            }
          } else if (val.length > 0 && val.length <= 15) {
            invalid.push(val);
          }
        }
      }
    }

    return { products, duplicates, invalid, total: products.length + duplicates.length + invalid.length };
  }

  // Extract from identified columns
  for (const row of result.data) {
    const val = row[asinColumn]?.trim().toUpperCase();
    if (!val) continue;

    if (ASIN_REGEX.test(val)) {
      if (seen.has(val)) {
        duplicates.push(val);
      } else {
        seen.add(val);
        const sku = skuColumn ? (row[skuColumn]?.trim() ?? "") : "";
        const price = priceColumn ? parsePrice(row[priceColumn]) : null;
        products.push({ asin: val, sku, officialListPrice: price });
      }
    } else {
      invalid.push(val);
    }
  }

  return { products, duplicates, invalid, total: products.length + duplicates.length + invalid.length };
}

// Keep backward compatibility
export function extractAsinsFromCsv(csvText: string): { asins: string[]; duplicates: string[]; invalid: string[]; total: number } {
  const result = extractProductsFromCsv(csvText);
  return {
    asins: result.products.map((p) => p.asin),
    duplicates: result.duplicates,
    invalid: result.invalid,
    total: result.total,
  };
}
