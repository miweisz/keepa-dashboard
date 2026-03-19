"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DashboardProduct } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "./data-table-column-header";
import { ExternalLink } from "lucide-react";
import { KEEPA_DOMAINS, getCurrencySymbol } from "@/lib/keepa/constants";

// Tolérance de 4 centimes pour les comparaisons de prix (ex: 9,95 vs 9,99 = OK)
const PRICE_TOLERANCE = 0.04;

function formatPrice(value: number | null, domain: number = 1): string {
  if (value === null) return "—";
  const symbol = getCurrencySymbol(domain);
  return `${symbol}${value.toFixed(2)}`;
}

function formatNumber(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("fr-FR");
}

function formatTimeAgo(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours < 24) return `${hours}h${remMin > 0 ? `${remMin}m` : ""}`;
  const days = Math.floor(hours / 24);
  return `${days}j`;
}

export const columns: ColumnDef<DashboardProduct>[] = [
  {
    accessorKey: "imageUrl",
    header: "",
    cell: ({ row }) => {
      const url = row.getValue("imageUrl") as string | null;
      return url ? (
        <img
          src={url}
          alt={row.original.title}
          className="h-10 w-10 rounded object-contain"
        />
      ) : (
        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
          N/A
        </div>
      );
    },
    enableSorting: false,
    enableResizing: false,
    enableColumnFilter: false,
    size: 50,
  },
  {
    id: "domainName",
    accessorFn: (row) => KEEPA_DOMAINS[row.domain]?.suffix ?? String(row.domain),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Pays" />
    ),
    cell: ({ row }) => {
      const domain = row.original.domain;
      const info = KEEPA_DOMAINS[domain];
      const flag: Record<number, string> = {
        1: "🇺🇸", 2: "🇬🇧", 3: "🇩🇪", 4: "🇫🇷", 5: "🇯🇵", 6: "🇨🇦", 8: "🇮🇹", 9: "🇪🇸", 10: "🇮🇳",
      };
      return (
        <span className="text-sm" title={info?.name}>
          {flag[domain] ?? ""} .{info?.suffix ?? domain}
        </span>
      );
    },
    filterFn: "includesString",
    size: 80,
  },
  {
    accessorKey: "asin",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ASIN" />
    ),
    cell: ({ row }) => {
      const asin = row.getValue("asin") as string;
      const domain = row.original.domain;
      const suffix =
        { 1: "com", 2: "co.uk", 3: "de", 4: "fr", 5: "co.jp", 6: "ca", 8: "it", 9: "es" }[
          domain
        ] ?? "com";
      return (
        <a
          href={`https://www.amazon.${suffix}/dp/${asin}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          {asin}
          <ExternalLink className="h-3 w-3" />
        </a>
      );
    },
    size: 130,
  },
  {
    accessorKey: "sku",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="SKU" />
    ),
    cell: ({ row }) => {
      const sku = row.getValue("sku") as string;
      if (!sku) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="font-mono text-xs text-foreground">{sku}</span>
      );
    },
    size: 130,
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Titre" />
    ),
    cell: ({ row }) => {
      const title = row.getValue("title") as string;
      return (
        <span className="truncate block" title={title}>
          {title}
        </span>
      );
    },
    size: 250,
  },
  {
    accessorKey: "brand",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Marque" />
    ),
    cell: ({ row }) => row.getValue("brand") ?? "—",
    filterFn: "includesString",
    size: 120,
  },
  {
    accessorKey: "amazonPrice",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Prix Amazon" />
    ),
    cell: ({ row }) => {
      const price = row.getValue("amazonPrice") as number | null;
      return (
        <span className={price !== null ? "font-medium" : "text-muted-foreground"}>
          {formatPrice(price, row.original.domain)}
        </span>
      );
    },
    size: 110,
  },
  {
    accessorKey: "officialListPrice",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Prix Officiel" />
    ),
    cell: ({ row }) => {
      const price = row.getValue("officialListPrice") as number | null;
      if (price === null) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="font-medium">
          {formatPrice(price, row.original.domain)}
        </span>
      );
    },
    size: 110,
  },
  {
    accessorKey: "listPrice",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="List Price" />
    ),
    cell: ({ row }) => {
      const listPrice = row.getValue("listPrice") as number | null;
      const official = row.original.officialListPrice;
      let colorClass = "";
      if (listPrice !== null && official !== null && official > 0 && listPrice > official + PRICE_TOLERANCE) {
        colorClass = "font-medium text-red-600";
      }
      return (
        <span className={colorClass}>
          {formatPrice(listPrice, row.original.domain)}
        </span>
      );
    },
    size: 100,
  },
  {
    accessorKey: "buyBoxTotal",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="BuyBox" />
    ),
    cell: ({ row }) => {
      const total = row.original.buyBoxTotal;
      const official = row.original.officialListPrice;
      const sellerName = row.original.buyBoxSellerName;
      const isAmazon = sellerName === "Amazon";
      let colorClass = "font-medium";
      if (total !== null && official !== null && official > 0) {
        if (total <= official + PRICE_TOLERANCE && isAmazon) {
          colorClass = "font-medium text-emerald-600"; // OK
        } else {
          colorClass = "font-medium text-red-600"; // à rectifier (prix > officiel OU vendeur ≠ Amazon)
        }
      } else if (total !== null && !isAmazon) {
        colorClass = "font-medium text-red-600"; // vendeur ≠ Amazon, pas de prix officiel pour comparer
      }
      return (
        <span className={colorClass}>
          {formatPrice(total, row.original.domain)}
        </span>
      );
    },
    size: 100,
  },
  {
    id: "buyBoxWinner",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="BuyBox Winner" />
    ),
    accessorFn: (row) => row.buyBoxSellerName ?? null,
    cell: ({ row }) => {
      const name = row.original.buyBoxSellerName;
      if (!name) return <span className="text-muted-foreground">—</span>;
      const isAmazon = name === "Amazon";
      return (
        <Badge
          className={
            isAmazon
              ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
              : "bg-slate-100 text-slate-800 hover:bg-slate-100"
          }
        >
          <span className="truncate block" title={name}>
            {name}
          </span>
        </Badge>
      );
    },
    filterFn: "includesString",
    size: 140,
  },
  {
    accessorKey: "rating",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Note" />
    ),
    cell: ({ row }) => {
      const rating = row.getValue("rating") as number | null;
      const reviews = row.original.reviewCount;
      if (rating === null) return <span className="text-muted-foreground">—</span>;

      // Amazon-style star logic:
      // x.0 to x.2 → x full stars, rest empty
      // x.3 to x.7 → x full stars + 1 half star, rest empty
      // x.8+ → x+1 full stars, rest empty
      const decimal = rating - Math.floor(rating);
      let fullStars: number;
      let hasHalf: boolean;
      if (decimal <= 0.2) {
        fullStars = Math.floor(rating);
        hasHalf = false;
      } else if (decimal <= 0.7) {
        fullStars = Math.floor(rating);
        hasHalf = true;
      } else {
        fullStars = Math.floor(rating) + 1;
        hasHalf = false;
      }
      const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

      const StarFull = () => (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-amber-400">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
      const StarHalf = () => (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
          <defs>
            <linearGradient id="halfStar">
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#d1d5db" />
            </linearGradient>
          </defs>
          <path fill="url(#halfStar)" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
      const StarEmpty = () => (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-gray-300">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );

      return (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <div className="flex gap-0">
              {Array.from({ length: fullStars }).map((_, i) => <StarFull key={`f${i}`} />)}
              {hasHalf && <StarHalf />}
              {Array.from({ length: emptyStars }).map((_, i) => <StarEmpty key={`e${i}`} />)}
            </div>
            <span className="text-xs font-medium text-foreground">{rating.toFixed(1)}</span>
          </div>
          {reviews !== null && (
            <span className="text-[11px] text-muted-foreground">
              {reviews.toLocaleString("fr-FR")} avis
            </span>
          )}
        </div>
      );
    },
    size: 150,
  },
  {
    accessorKey: "salesRank",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sales Rank" />
    ),
    cell: ({ row }) => formatNumber(row.getValue("salesRank")),
    size: 110,
  },
  {
    accessorKey: "offerCountFBA",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="FBA" />
    ),
    cell: ({ row }) => row.getValue("offerCountFBA"),
    size: 70,
  },
  {
    accessorKey: "monthlySold",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ventes/mois" />
    ),
    cell: ({ row }) => {
      const val = row.getValue("monthlySold") as number | null;
      return val ? `${val.toLocaleString("fr-FR")}+` : "—";
    },
    size: 110,
  },
  {
    accessorKey: "lastRefreshAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Dernière MAJ" />
    ),
    cell: ({ row }) => {
      const iso = row.getValue("lastRefreshAt") as string;
      if (!iso) return <span className="text-muted-foreground">—</span>;
      const date = new Date(iso);
      const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{formatTimeAgo(iso)}</span>
          <span className="text-[11px] text-muted-foreground">{timeStr}</span>
        </div>
      );
    },
    size: 110,
  },
];
