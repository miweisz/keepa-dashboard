"use client";

import { DashboardProduct } from "@/types/product";
import {
  Package,
  CheckCircle,
  AlertTriangle,
  Tag,
} from "lucide-react";

interface StatsCardsProps {
  products: DashboardProduct[];
}

export function StatsCards({ products }: StatsCardsProps) {
  const uniqueDomains = new Set(products.map((p) => p.domain)).size;
  const uniqueAsins = new Set(products.map((p) => p.asin)).size;
  const count = products.length;

  // Tolérance de 4 centimes pour les comparaisons de prix (ex: 9,95 vs 9,99 = OK)
  const PRICE_TOLERANCE = 0.04;

  // Products with both BuyBox and official price
  const withBothBuyBoxAndOfficial = products.filter(
    (p) => p.buyBoxTotal !== null && p.officialListPrice !== null && p.officialListPrice > 0
  );

  // Prix Buy Box OK = BuyBox <= prix officiel
  const buyBoxOk = withBothBuyBoxAndOfficial.filter(
    (p) => (p.buyBoxTotal ?? 0) <= (p.officialListPrice ?? 0) + PRICE_TOLERANCE
  );

  // Buy Box à rectifier = BuyBox > prix officiel + tolérance OU vendeur ≠ Amazon
  const buyBoxToFix = withBothBuyBoxAndOfficial.filter(
    (p) => (p.buyBoxTotal ?? 0) > (p.officialListPrice ?? 0) + PRICE_TOLERANCE || p.buyBoxSellerName !== "Amazon"
  );

  // List Price > Prix Officiel
  const withBothListAndOfficial = products.filter(
    (p) => p.listPrice !== null && p.officialListPrice !== null && p.officialListPrice > 0
  );
  const listPriceAboveOfficial = withBothListAndOfficial.filter(
    (p) => (p.listPrice ?? 0) > (p.officialListPrice ?? 0) + PRICE_TOLERANCE
  );

  const stats = [
    {
      title: "Produits suivis",
      value: uniqueAsins.toString(),
      subtitle: `${count} entrées · ${uniqueDomains} pays`,
      icon: Package,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Prix Buy Box OK",
      value:
        withBothBuyBoxAndOfficial.length > 0
          ? `${buyBoxOk.length}/${withBothBuyBoxAndOfficial.length}`
          : "—",
      subtitle: "BuyBox ≤ prix officiel Shapeheart",
      icon: CheckCircle,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
    },
    {
      title: "Buy Box à rectifier",
      value:
        withBothBuyBoxAndOfficial.length > 0
          ? `${buyBoxToFix.length}/${withBothBuyBoxAndOfficial.length}`
          : "—",
      subtitle: "BuyBox > prix officiel",
      icon: AlertTriangle,
      iconBg: "bg-red-500/10",
      iconColor: "text-red-600",
    },
    {
      title: "List Price",
      value:
        withBothListAndOfficial.length > 0
          ? `${listPriceAboveOfficial.length}/${withBothListAndOfficial.length}`
          : "—",
      subtitle: "List price > prix officiel",
      icon: Tag,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="bg-white rounded-xl border border-border/60 p-4 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1 min-w-0">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {stat.title}
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </div>
            <div className={`rounded-xl p-2.5 ${stat.iconBg} shrink-0`}>
              <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
