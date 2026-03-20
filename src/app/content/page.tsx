"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useAsinStore } from "@/hooks/use-asin-store";
import { DashboardProduct } from "@/types/product";
import { CountryPicker } from "@/components/shared/country-picker";
import { KEEPA_DOMAINS } from "@/lib/keepa/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  X,
  RefreshCw,
  ExternalLink,
  ImageIcon,
  GripVertical,
  Minus,
  Plus,
  Download,
} from "lucide-react";

const ALL_DOMAINS = [4, 9, 3, 8, 2];
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 20;

const DOMAIN_FLAGS: Record<number, string> = {
  4: "\u{1F1EB}\u{1F1F7}",
  9: "\u{1F1EA}\u{1F1F8}",
  3: "\u{1F1E9}\u{1F1EA}",
  8: "\u{1F1EE}\u{1F1F9}",
  2: "\u{1F1EC}\u{1F1E7}",
};

interface ColumnDef {
  id: string;
  label: string;
  type: "fixed" | "image" | "bullet" | "variation";
  index?: number;
  dimension?: string;
  defaultWidth: number;
}

const COL_DEFAULTS: Record<string, number> = {
  pays: 80,
  sku: 160,
  parentAsin: 130,
  variation: 180,
  titre: 260,
  lastUpdate: 150,
};
const VARIATION_DEFAULT_W = 160;
const IMG_DEFAULT_W = 120;
const BULLET_DEFAULT_W = 240;

function timeAgo(isoStr: string | undefined): string {
  if (!isoStr) return "Jamais";
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function formatDateTime(isoStr: string | undefined): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isStale(isoStr: string | undefined): boolean {
  if (!isoStr) return true;
  return Date.now() - new Date(isoStr).getTime() > TWENTY_FOUR_HOURS;
}

/**
 * Reconstruct variationAttributes from the variation string for cached data
 * that doesn't have the new field yet.
 * "Size: XL | Color: Black" → [{ dimension: "Size", value: "XL" }, { dimension: "Color", value: "Black" }]
 */
function parseVariationString(variation: string | null): { dimension: string; value: string }[] {
  if (!variation) return [];
  return variation.split(" | ").map((pair) => {
    const idx = pair.indexOf(": ");
    if (idx === -1) return { dimension: pair.trim(), value: "" };
    return { dimension: pair.slice(0, idx).trim(), value: pair.slice(idx + 2).trim() };
  }).filter((a) => a.dimension && a.value);
}

export default function ContentPage() {
  const { products: trackedProducts, asins, isLoaded } = useAsinStore();

  // Products loaded from cache — NO continuous refresh
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [loadingCache, setLoadingCache] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<string | null>(null);

  const [visibleDomains, setVisibleDomains] = useState<number[]>(ALL_DOMAINS);
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [rowHeight, setRowHeight] = useState(100);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  // Sorting
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Per-column filters
  const [colFilters, setColFilters] = useState<Record<string, string>>({});

  // Drag reorder
  const [dragColId, setDragColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Resize
  const resizeRef = useRef<{
    colId: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Tracked map
  const trackedMap = useMemo(() => {
    const map = new Map<string, { sku: string; domains: number[] }>();
    for (const tp of trackedProducts) {
      map.set(tp.asin, { sku: tp.sku, domains: tp.domains ?? ALL_DOMAINS });
    }
    return map;
  }, [trackedProducts]);

  // Load products from cache on mount (read-only, zero tokens)
  useEffect(() => {
    fetch("/amazon-tracker/api/products-cache")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map((p: DashboardProduct) => ({
            ...p,
            allImageUrls: p.allImageUrls ?? [],
            features: p.features ?? [],
            variation: p.variation ?? null,
            parentAsin: p.parentAsin ?? null,
            variationAttributes: (p.variationAttributes && p.variationAttributes.length > 0) ? p.variationAttributes : parseVariationString(p.variation),
          }));
          setProducts(normalized);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCache(false));
  }, []);

  // One-shot refresh: only fetch products whose data is >24h old
  const handleRefresh = useCallback(async () => {
    if (refreshing || asins.length === 0) return;
    setRefreshing(true);

    try {
      const productMap = new Map<string, DashboardProduct>();
      for (const p of products) {
        productMap.set(`${p.asin}::${p.domain}`, p);
      }

      // For each domain, find stale or missing ASINs
      const domainAsins = new Map<number, string[]>();
      for (const domain of ALL_DOMAINS) {
        const stale: string[] = [];
        for (const asin of asins) {
          const tracked = trackedMap.get(asin);
          if (tracked && !tracked.domains.includes(domain)) continue;
          const existing = productMap.get(`${asin}::${domain}`);
          if (!existing || isStale(existing.lastRefreshAt)) {
            stale.push(asin);
          }
        }
        if (stale.length > 0) {
          domainAsins.set(domain, stale);
        }
      }

      if (domainAsins.size === 0) {
        setRefreshProgress("Tout est à jour (< 24h)");
        setTimeout(() => setRefreshProgress(null), 3000);
        setRefreshing(false);
        return;
      }

      let totalToFetch = 0;
      domainAsins.forEach((a) => (totalToFetch += a.length));

      let fetched = 0;
      const updatedProducts = new Map(products.map((p) => [`${p.asin}::${p.domain}`, p]));

      for (const [domain, staleAsins] of domainAsins) {
        const domainName = KEEPA_DOMAINS[domain]?.suffix ?? String(domain);

        for (let i = 0; i < staleAsins.length; i += BATCH_SIZE) {
          const batch = staleAsins.slice(i, i + BATCH_SIZE);
          setRefreshProgress(
            `Actualisation .${domainName} — ${fetched}/${totalToFetch} produits`
          );

          try {
            // Check tokens
            const tokenRes = await fetch("/amazon-tracker/api/keepa/tokens");
            const tokenData = await tokenRes.json();
            const tokensNeeded = batch.length * 6 + 5;

            if ((tokenData.tokensLeft ?? 0) < tokensNeeded) {
              setRefreshProgress(
                `Tokens insuffisants (${tokenData.tokensLeft}). Réessayez plus tard.`
              );
              setTimeout(() => setRefreshProgress(null), 5000);
              setRefreshing(false);
              // Still save what we have so far
              const allProducts = Array.from(updatedProducts.values());
              setProducts(allProducts);
              fetch("/amazon-tracker/api/products-cache", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(allProducts),
              }).catch(() => {});
              return;
            }

            const res = await fetch("/amazon-tracker/api/keepa/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ asins: batch, domain }),
            });

            if (!res.ok) {
              if (res.status === 429) {
                setRefreshProgress("Limite de tokens atteinte. Réessayez plus tard.");
                setTimeout(() => setRefreshProgress(null), 5000);
                setRefreshing(false);
                const allProducts = Array.from(updatedProducts.values());
                setProducts(allProducts);
                fetch("/amazon-tracker/api/products-cache", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(allProducts),
                }).catch(() => {});
                return;
              }
              fetched += batch.length;
              continue;
            }

            const data = await res.json();
            const newProducts: DashboardProduct[] = (data.products ?? []).map(
              (p: DashboardProduct) => ({
                ...p,
                allImageUrls: p.allImageUrls ?? [],
                features: p.features ?? [],
                variation: p.variation ?? null,
                parentAsin: p.parentAsin ?? null,
                variationAttributes: (p.variationAttributes && p.variationAttributes.length > 0) ? p.variationAttributes : parseVariationString(p.variation),
              })
            );

            for (const np of newProducts) {
              const key = `${np.asin}::${np.domain}`;
              const existing = updatedProducts.get(key);
              if (
                existing &&
                np.buyBoxSellerId &&
                np.buyBoxSellerName === np.buyBoxSellerId &&
                existing.buyBoxSellerName &&
                existing.buyBoxSellerName !== existing.buyBoxSellerId
              ) {
                updatedProducts.set(key, { ...np, buyBoxSellerName: existing.buyBoxSellerName });
              } else {
                updatedProducts.set(key, np);
              }
            }

            fetched += batch.length;
          } catch {
            fetched += batch.length;
          }

          await new Promise((r) => setTimeout(r, 500));
        }
      }

      const allProducts = Array.from(updatedProducts.values());
      setProducts(allProducts);

      // Persist to KV
      fetch("/amazon-tracker/api/products-cache", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allProducts),
      }).catch(() => {});

      setRefreshProgress(`Terminé — ${fetched} produit(s) actualisé(s)`);
      setTimeout(() => setRefreshProgress(null), 4000);
    } catch {
      setRefreshProgress("Erreur lors de l'actualisation");
      setTimeout(() => setRefreshProgress(null), 4000);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, asins, products, trackedMap]);

  // Count stale products
  const staleCount = useMemo(() => {
    let count = 0;
    for (const domain of ALL_DOMAINS) {
      for (const asin of asins) {
        const tracked = trackedMap.get(asin);
        if (tracked && !tracked.domains.includes(domain)) continue;
        const existing = products.find((p) => p.asin === asin && p.domain === domain);
        if (!existing || isStale(existing.lastRefreshAt)) count++;
      }
    }
    return count;
  }, [asins, products, trackedMap]);

  // Helper: get a sortable/filterable string value from a product for a given column
  const getColValue = useCallback(
    (p: DashboardProduct & { sku: string; variation: string | null }, colId: string): string => {
      const suffix = KEEPA_DOMAINS[p.domain]?.suffix ?? "";
      if (colId === "pays") return `.${suffix}`;
      if (colId === "sku") return p.sku || p.asin;
      if (colId === "parentAsin") return p.parentAsin ?? "";
      if (colId === "variation") return p.variation ?? "";
      if (colId === "titre") return p.title;
      if (colId === "lastUpdate") return p.lastRefreshAt ?? "";
      if (colId.startsWith("var_")) {
        const dim = colId.slice(4);
        const attr = (p.variationAttributes ?? []).find((a) => a.dimension === dim);
        return attr?.value ?? "";
      }
      if (colId.startsWith("bullet_")) {
        const idx = parseInt(colId.split("_")[1], 10);
        return (p.features ?? [])[idx] ?? "";
      }
      return "";
    },
    []
  );

  // Toggle sort on header click
  const handleSort = useCallback((colId: string) => {
    setSortCol((prev) => {
      if (prev === colId) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return colId;
      }
      setSortDir("asc");
      return colId;
    });
  }, []);

  // Update a column filter
  const setColFilter = useCallback((colId: string, value: string) => {
    setColFilters((prev) => ({ ...prev, [colId]: value }));
  }, []);

  // Enrich, filter (global + per-column), and sort
  const filteredProducts = useMemo(() => {
    let result = products
      .filter((p) => {
        const tracked = trackedMap.get(p.asin);
        if (tracked && !tracked.domains.includes(p.domain)) return false;
        if (!visibleDomains.includes(p.domain)) return false;
        return true;
      })
      .map((p) => ({
        ...p,
        sku: trackedMap.get(p.asin)?.sku ?? "",
        allImageUrls: p.allImageUrls ?? [],
        features: p.features ?? [],
        variation: p.variation ?? null,
      }));

    // Global search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.asin.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          (p.variation ?? "").toLowerCase().includes(q)
      );
    }

    // Per-column filters
    for (const [colId, filterVal] of Object.entries(colFilters)) {
      if (!filterVal) continue;
      const q = filterVal.toLowerCase();
      result = result.filter((p) => getColValue(p, colId).toLowerCase().includes(q));
    }

    // Sort
    if (sortCol) {
      result.sort((a, b) => {
        const va = getColValue(a, sortCol);
        const vb = getColValue(b, sortCol);
        const cmp = va.localeCompare(vb, "fr", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    } else {
      // Default sort: SKU then domain
      result.sort((a, b) => {
        const skuCmp = (a.sku || a.asin).localeCompare(b.sku || b.asin);
        if (skuCmp !== 0) return skuCmp;
        return a.domain - b.domain;
      });
    }

    return result;
  }, [products, trackedMap, visibleDomains, searchQuery, colFilters, sortCol, sortDir, getColValue]);

  // Max images, bullets & variation dimensions
  const { maxImages, maxBullets, variationDimensions } = useMemo(() => {
    let maxImg = 0;
    let maxBul = 0;
    const dimSet = new Set<string>();
    for (const p of filteredProducts) {
      if (p.allImageUrls.length > maxImg) maxImg = p.allImageUrls.length;
      if (p.features.length > maxBul) maxBul = p.features.length;
      for (const attr of (p.variationAttributes ?? [])) {
        dimSet.add(attr.dimension);
      }
    }
    return { maxImages: maxImg, maxBullets: maxBul, variationDimensions: Array.from(dimSet) };
  }, [filteredProducts]);

  // Build columns
  const defaultColumns = useMemo(() => {
    const cols: ColumnDef[] = [
      { id: "pays", label: "Pays", type: "fixed", defaultWidth: COL_DEFAULTS.pays },
      { id: "sku", label: "SKU", type: "fixed", defaultWidth: COL_DEFAULTS.sku },
      { id: "parentAsin", label: "Parent ASIN", type: "fixed", defaultWidth: COL_DEFAULTS.parentAsin },
      { id: "variation", label: "Variation", type: "fixed", defaultWidth: COL_DEFAULTS.variation },
      { id: "titre", label: "Titre", type: "fixed", defaultWidth: COL_DEFAULTS.titre },
      { id: "lastUpdate", label: "Dernière MAJ", type: "fixed", defaultWidth: COL_DEFAULTS.lastUpdate },
    ];
    const imgCount = Math.max(maxImages, 8);
    for (let i = 0; i < imgCount; i++) {
      cols.push({
        id: `img_${i}`,
        label: i === 0 ? "Image principale" : `Image ${i + 1}`,
        type: "image",
        index: i,
        defaultWidth: IMG_DEFAULT_W,
      });
    }
    const bulletCount = Math.max(maxBullets, 5);
    for (let i = 0; i < bulletCount; i++) {
      cols.push({
        id: `bullet_${i}`,
        label: `Bullet ${i + 1}`,
        type: "bullet",
        index: i,
        defaultWidth: BULLET_DEFAULT_W,
      });
    }
    return cols;
  }, [maxImages, maxBullets]);

  // Column order
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  useEffect(() => {
    setColumnOrder((prev) => {
      const defaultIds = defaultColumns.map((c) => c.id);
      if (prev.length === 0) return defaultIds;
      const existing = prev.filter((id) => defaultIds.includes(id));
      const newCols = defaultIds.filter((id) => !prev.includes(id));
      return [...existing, ...newCols];
    });
  }, [defaultColumns]);

  const colMap = useMemo(() => {
    const map = new Map<string, ColumnDef>();
    for (const c of defaultColumns) map.set(c.id, c);
    return map;
  }, [defaultColumns]);

  const orderedColumns = useMemo(() => {
    return columnOrder.map((id) => colMap.get(id)).filter((c): c is ColumnDef => c !== undefined);
  }, [columnOrder, colMap]);

  const getWidth = useCallback(
    (col: ColumnDef) => colWidths[col.id] ?? col.defaultWidth,
    [colWidths]
  );

  // Column drag reorder
  const handleDragStart = useCallback((colId: string) => setDragColId(colId), []);
  const handleDragOver = useCallback((e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverColId(colId);
  }, []);
  const handleDrop = useCallback(
    (targetColId: string) => {
      if (!dragColId || dragColId === targetColId) {
        setDragColId(null);
        setDragOverColId(null);
        return;
      }
      setColumnOrder((prev) => {
        const newOrder = [...prev];
        const fromIdx = newOrder.indexOf(dragColId);
        const toIdx = newOrder.indexOf(targetColId);
        if (fromIdx === -1 || toIdx === -1) return prev;
        newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx, 0, dragColId);
        return newOrder;
      });
      setDragColId(null);
      setDragOverColId(null);
    },
    [dragColId]
  );
  const handleDragEnd = useCallback(() => {
    setDragColId(null);
    setDragOverColId(null);
  }, []);

  // Column resize
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, colId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const col = colMap.get(colId);
      if (!col) return;
      resizeRef.current = { colId, startX: e.clientX, startWidth: colWidths[colId] ?? col.defaultWidth };
      const onMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const diff = ev.clientX - resizeRef.current.startX;
        const newW = Math.max(50, resizeRef.current.startWidth + diff);
        setColWidths((prev) => ({ ...prev, [resizeRef.current!.colId]: newW }));
      };
      const onUp = () => {
        resizeRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [colWidths, colMap]
  );

  const imgSize = Math.max(40, rowHeight - 16);

  // CSV export for content tab
  const handleExportContent = useCallback(() => {
    const escapeCsv = (val: string) => {
      if (val.includes(";") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const headers = [
      "Pays", "SKU", "ASIN", "Parent ASIN", "Variation",
      ...variationDimensions,
      "Titre",
      ...Array.from({ length: maxBullets }, (_, i) => `Bullet ${i + 1}`),
      "Dernière MAJ",
    ];

    const csvRows = filteredProducts.map((p) => {
      const suffix = KEEPA_DOMAINS[p.domain]?.suffix ?? "";
      return [
        `.${suffix}`,
        p.sku || p.asin,
        p.asin,
        p.parentAsin ?? "",
        p.variation ?? "",
        ...variationDimensions.map((dim) => {
          const attr = (p.variationAttributes ?? []).find((a) => a.dimension === dim);
          return attr?.value ?? "";
        }),
        p.title,
        ...Array.from({ length: maxBullets }, (_, i) => (p.features ?? [])[i] ?? ""),
        p.lastRefreshAt ?? "",
      ].map(escapeCsv);
    });

    const csv = [headers.join(";"), ...csvRows.map((r) => r.join(";"))].join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredProducts, maxBullets, variationDimensions]);

  // Render cell
  const renderCell = (col: ColumnDef, product: DashboardProduct & { sku: string; variation: string | null }) => {
    const suffix = KEEPA_DOMAINS[product.domain]?.suffix ?? "com";
    const flag = DOMAIN_FLAGS[product.domain] ?? "";
    const amazonUrl = `https://www.amazon.${suffix}/dp/${product.asin}`;

    switch (col.type) {
      case "fixed":
        if (col.id === "pays") {
          return (
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">{flag}</span>
              <span className="text-xs text-muted-foreground">.{suffix}</span>
            </div>
          );
        }
        if (col.id === "sku") {
          return (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-mono text-xs truncate">{product.sku || product.asin}</span>
              <a href={amazonUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-primary">
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          );
        }
        if (col.id === "parentAsin") {
          const parentAsin = product.parentAsin;
          if (!parentAsin) return <span className="text-muted-foreground/40 italic">—</span>;
          return (
            <a
              href={`https://www.amazon.${suffix}/dp/${parentAsin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              {parentAsin}
              <ExternalLink className="h-3 w-3" />
            </a>
          );
        }
        if (col.id === "variation") {
          return (
            <div className="text-xs truncate" title={product.variation ?? ""}>
              {product.variation ?? <span className="text-muted-foreground/40 italic">—</span>}
            </div>
          );
        }
        if (col.id === "titre") {
          return (
            <div
              className="text-xs leading-relaxed"
              title={product.title}
              style={{ display: "-webkit-box", WebkitLineClamp: Math.max(2, Math.floor(rowHeight / 18)), WebkitBoxOrient: "vertical", overflow: "hidden" }}
            >
              {product.title}
            </div>
          );
        }
        if (col.id === "lastUpdate") {
          const staleProduct = isStale(product.lastRefreshAt);
          return (
            <div className="flex flex-col gap-0.5" title={formatDateTime(product.lastRefreshAt)}>
              <span className={`text-xs font-medium ${staleProduct ? "text-amber-600" : "text-emerald-600"}`}>
                {timeAgo(product.lastRefreshAt)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {formatDateTime(product.lastRefreshAt)}
              </span>
            </div>
          );
        }
        return null;

      case "variation": {
        const attr = (product.variationAttributes ?? []).find((a) => a.dimension === col.dimension);
        if (!attr) return <span className="text-muted-foreground/40 italic">—</span>;
        return (
          <div className="text-xs truncate" title={attr.value}>
            {attr.value}
          </div>
        );
      }

      case "image": {
        const url = (product.allImageUrls ?? [])[col.index ?? 0];
        if (!url) {
          return (
            <div className="flex justify-center items-center h-full">
              <div className="flex items-center justify-center rounded border border-dashed bg-muted/30" style={{ width: imgSize, height: imgSize }}>
                <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
              </div>
            </div>
          );
        }
        return (
          <div className="flex justify-center items-center h-full">
            <button onClick={() => setLightboxImg(url)} className="group">
              <img src={url} alt={`Image ${(col.index ?? 0) + 1}`} className="object-contain rounded border bg-white hover:ring-2 hover:ring-primary transition-all" style={{ width: imgSize, height: imgSize }} />
            </button>
          </div>
        );
      }

      case "bullet": {
        const text = (product.features ?? [])[col.index ?? 0];
        if (!text) return <span className="text-xs text-muted-foreground/30 italic">—</span>;
        return (
          <div
            className="text-xs leading-relaxed overflow-hidden"
            title={text}
            style={{ display: "-webkit-box", WebkitLineClamp: Math.max(2, Math.floor(rowHeight / 16)), WebkitBoxOrient: "vertical" }}
          >
            {text}
          </div>
        );
      }

      default:
        return null;
    }
  };

  if (!isLoaded || loadingCache) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-[1600px] space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white rounded-xl border border-border/60 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <CountryPicker selected={visibleDomains} onChange={setVisibleDomains} />
          <div className="h-6 w-px bg-border" />

          <Button
            onClick={handleRefresh}
            disabled={refreshing || asins.length === 0}
            size="sm"
            className="gap-2 rounded-lg shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Actualisation..." : "Actualiser"}
          </Button>

          {staleCount > 0 && !refreshing && (
            <span className="text-xs text-amber-600 font-medium">
              {staleCount} produit(s) &gt; 24h
            </span>
          )}

          {refreshProgress && (
            <span className="text-xs text-muted-foreground font-medium">{refreshProgress}</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Hauteur</span>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setRowHeight((h) => Math.max(60, h - 20))}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="font-mono w-8 text-center">{rowHeight}</span>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setRowHeight((h) => Math.min(300, h + 20))}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">{filteredProducts.length} résultat(s)</span>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher ASIN, SKU, titre..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 w-64" />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportContent}
            className="gap-2"
          >
            <Download className="h-3.5 w-3.5" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground">
        Lecture seule depuis le cache (0 token). &quot;Actualiser&quot; ne rafraîchit que les produits de +24h.
      </p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border/60 shadow-sm overflow-x-auto">
        <table className="border-collapse" style={{ width: "max-content", minWidth: "100%" }}>
          <thead>
            <tr className="bg-muted/50 border-b">
              {orderedColumns.map((col) => {
                const w = getWidth(col);
                const isSortable = col.type !== "image";
                const isSorted = sortCol === col.id;
                return (
                  <th
                    key={col.id}
                    draggable
                    onDragStart={() => handleDragStart(col.id)}
                    onDragOver={(e) => handleDragOver(e, col.id)}
                    onDrop={() => handleDrop(col.id)}
                    onDragEnd={handleDragEnd}
                    style={{ width: w, minWidth: w, maxWidth: w, position: "relative" }}
                    className={`px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-grab active:cursor-grabbing select-none whitespace-nowrap transition-colors ${
                      dragOverColId === col.id && dragColId !== col.id ? "bg-primary/10" : ""
                    } ${dragColId === col.id ? "opacity-40" : ""}`}
                  >
                    <div
                      className={`flex items-center gap-1 pr-2 ${isSortable ? "cursor-pointer hover:text-foreground" : ""}`}
                      onClick={isSortable ? () => handleSort(col.id) : undefined}
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                      <span className="truncate">{col.label}</span>
                      {isSortable && isSorted && (
                        <span className="text-primary ml-0.5">{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>
                    <div
                      className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-primary/20 transition-colors"
                      onMouseDown={(e) => handleResizeStart(e, col.id)}
                      onClick={(e) => e.stopPropagation()}
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                    />
                  </th>
                );
              })}
            </tr>
            {/* Per-column filter row */}
            <tr className="bg-muted/30 border-b">
              {orderedColumns.map((col) => {
                const w = getWidth(col);
                const isFilterable = col.type !== "image";
                return (
                  <th key={`filter-${col.id}`} className="px-1 py-1" style={{ width: w, minWidth: w, maxWidth: w }}>
                    {isFilterable ? (
                      <input
                        type="text"
                        value={colFilters[col.id] ?? ""}
                        onChange={(e) => setColFilter(col.id, e.target.value)}
                        placeholder="Filtrer..."
                        className="w-full h-7 px-2 text-xs rounded border border-border/60 bg-white focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50"
                      />
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={orderedColumns.length || 1} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {asins.length === 0
                    ? "Aucun ASIN suivi. Ajoutez des produits dans l'onglet ASINs à suivre."
                    : "Aucun résultat. Lancez le Dashboard une première fois pour charger les données."}
                </td>
              </tr>
            )}
            {filteredProducts.map((product) => {
              const rowKey = `${product.asin}::${product.domain}`;
              return (
                <tr key={rowKey} className="hover:bg-muted/20 transition-colors" style={{ height: rowHeight }}>
                  {orderedColumns.map((col) => {
                    const w = getWidth(col);
                    return (
                      <td key={col.id} className="px-3 py-2 align-middle overflow-hidden" style={{ width: w, minWidth: w, maxWidth: w, height: rowHeight }}>
                        {renderCell(col, product)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-8" onClick={() => setLightboxImg(null)}>
          <div className="relative max-w-3xl max-h-[80vh]">
            <button onClick={() => setLightboxImg(null)} className="absolute -top-3 -right-3 bg-white rounded-full p-1.5 shadow-lg hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
            <img src={lightboxImg} alt="Product" className="max-h-[80vh] max-w-full object-contain rounded-lg bg-white" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}
    </div>
  );
}
