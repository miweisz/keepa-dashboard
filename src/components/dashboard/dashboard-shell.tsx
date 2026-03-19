"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  AlertCircle,
  Package,
  X,
  Play,
} from "lucide-react";
import { useAsinStore } from "@/hooks/use-asin-store";
import { useProducts } from "@/hooks/use-products";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { DataTable } from "@/components/products/product-table/data-table";
import { columns } from "@/components/products/product-table/columns";
import { ProductDetailSheet } from "@/components/products/product-detail-sheet";
import { CountryPicker } from "@/components/shared/country-picker";
import { DashboardProduct } from "@/types/product";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

/** All EU domains — we always fetch ALL of them */
const ALL_DOMAINS = [4, 9, 3, 8, 2]; // FR, ES, DE, IT, UK

export function DashboardShell() {
  const { products: trackedProducts, asins, isLoaded } = useAsinStore();
  const {
    products,
    isLoading,
    error,
    progress,
    isRunning,
    startContinuousRefresh,
    stopRefresh,
  } = useProducts();

  // Build a lookup map from tracked products: asin -> { sku, officialListPrice, officialListPriceGBP, domains }
  const trackedMap = useMemo(() => {
    const map = new Map<string, { sku: string; officialListPrice: number | null; officialListPriceGBP: number | null; domains: number[] }>();
    for (const tp of trackedProducts) {
      map.set(tp.asin, {
        sku: tp.sku,
        officialListPrice: tp.officialListPrice,
        officialListPriceGBP: tp.officialListPriceGBP,
        domains: tp.domains ?? ALL_DOMAINS,
      });
    }
    return map;
  }, [trackedProducts]);

  // Enrich API products with SKU + officialListPrice, filter out disabled domains
  const enrichedProducts = useMemo(() => {
    return products
      .filter((p) => {
        const tracked = trackedMap.get(p.asin);
        return tracked ? tracked.domains.includes(p.domain) : true;
      })
      .map((p) => {
        const tracked = trackedMap.get(p.asin);
        // Use GBP price for UK (domain 2), EUR price for all others
        const officialPrice = p.domain === 2
          ? (tracked?.officialListPriceGBP ?? null)
          : (tracked?.officialListPrice ?? null);
        return {
          ...p,
          sku: tracked?.sku ?? "",
          officialListPrice: officialPrice,
        };
      });
  }, [products, trackedMap]);

  // Visual filter: which domains to DISPLAY (always fetch all)
  const [visibleDomains, setVisibleDomains] = useState<number[]>(ALL_DOMAINS);
  const [selectedProduct, setSelectedProduct] = useState<DashboardProduct | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Auto-start continuous refresh once loaded — always all domains
  useEffect(() => {
    if (!isLoaded || asins.length === 0 || isRunning) return;
    const timer = setTimeout(() => {
      startContinuousRefresh(asins, ALL_DOMAINS);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // Country picker only changes the visual filter, does NOT restart refresh
  const handleDomainsChange = (newDomains: number[]) => {
    setVisibleDomains(newDomains);
  };

  const handleToggleRefresh = () => {
    if (isRunning) {
      stopRefresh();
    } else {
      startContinuousRefresh(asins, ALL_DOMAINS);
    }
  };

  // Filter displayed products by visible domains
  const filteredProducts = useMemo(() => {
    return enrichedProducts.filter((p) => visibleDomains.includes(p.domain));
  }, [enrichedProducts, visibleDomains]);

  const handleRowClick = (product: DashboardProduct) => {
    setSelectedProduct(product);
    setSheetOpen(true);
  };

  const progressPercent = progress
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white rounded-xl border border-border/60 px-4 py-3 shadow-sm">
        {/* Left */}
        <div className="flex items-center gap-3">
          <CountryPicker selected={visibleDomains} onChange={handleDomainsChange} />

          <div className="h-6 w-px bg-border" />

          <Button
            onClick={handleToggleRefresh}
            disabled={asins.length === 0}
            size="sm"
            variant={isRunning ? "outline" : "default"}
            className="gap-2 rounded-lg shadow-sm"
          >
            {isRunning ? (
              <>
                <X className="h-3.5 w-3.5" />
                Arrêter
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Démarrer
              </>
            )}
          </Button>

          {/* Status indicator */}
          <div className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isRunning
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-muted-foreground/40"
              }`}
            />
            {isRunning
              ? isLoading
                ? "Synchronisation"
                : "Actif"
              : "Arrêté"}
            {progress && (
              <span className="text-muted-foreground ml-1">
                · cycle {progress.cycle}
              </span>
            )}
          </div>
        </div>

      </div>

      {/* ── Progress bar ── */}
      {isLoading && progress && !progress.waitingForTokens && (
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5">
          <div
            className="absolute bottom-0 left-0 h-1 bg-primary/60 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
          <div className="flex items-center justify-between p-3.5">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Récupération{" "}
                  <span className="font-semibold">{progress.currentDomain}</span>
                  {" · "}batch {progress.currentBatch}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {progress.completed}/{progress.total} batches · {progressPercent}%
                  {" · "}cycle {progress.cycle}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading without progress ── */}
      {isLoading && !progress && (
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5">
          <div className="absolute bottom-0 left-0 h-0.5 bg-primary/40 animate-pulse" style={{ width: "60%" }} />
          <div className="flex items-center gap-3 p-3.5">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            <p className="text-sm font-medium text-primary">Initialisation…</p>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* ── Stats ── */}
      {filteredProducts.length > 0 && <StatsCards products={filteredProducts} />}

      {/* ── Table ── */}
      {asins.length > 0 && filteredProducts.length > 0 && (
        <div className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden">
          <DataTable
            columns={columns}
            data={filteredProducts}
            onRowClick={handleRowClick}
          />
        </div>
      )}

      {/* ── Empty: no ASINs ── */}
      {asins.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-border">
          <div className="rounded-2xl bg-primary/10 p-5 mb-5">
            <Package className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-semibold mb-1">Aucun produit à suivre</p>
          <p className="text-sm text-muted-foreground mb-5">
            Commencez par ajouter des ASINs dans l&apos;onglet dédié.
          </p>
          <Link href="/asins">
            <Button className="gap-2 rounded-lg shadow-sm">
              <Package className="h-4 w-4" />
              Gérer les ASINs
            </Button>
          </Link>
        </div>
      )}

      {/* ── Empty: ASINs but no data ── */}
      {asins.length > 0 && filteredProducts.length === 0 && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-border">
          <div className="rounded-2xl bg-muted p-5 mb-5">
            <RefreshCw className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold mb-1">Prêt à charger</p>
          <p className="text-sm text-muted-foreground">
            Cliquez sur Démarrer pour lancer la synchronisation.
          </p>
        </div>
      )}

      <ProductDetailSheet
        product={selectedProduct}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
