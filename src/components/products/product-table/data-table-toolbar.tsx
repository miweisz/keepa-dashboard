"use client";

import { useCallback } from "react";
import { Table } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Search, Download } from "lucide-react";
import { DashboardProduct } from "@/types/product";
import { KEEPA_DOMAINS, getCurrencySymbol } from "@/lib/keepa/constants";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

function downloadCsv(filename: string, csvContent: string) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(val: string): string {
  if (val.includes(";") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().globalFilter?.length > 0;

  const handleExport = useCallback(() => {
    const rows = table.getFilteredRowModel().rows;
    const headers = [
      "Pays", "ASIN", "SKU", "Titre", "Marque",
      "Prix Amazon", "Prix Officiel", "List Price",
      "BuyBox Total", "BuyBox Winner",
      "Note", "Avis", "Sales Rank", "FBA", "Ventes/mois",
      "Dernière MAJ",
    ];

    const csvRows = rows.map((row) => {
      const p = row.original as DashboardProduct;
      const suffix = KEEPA_DOMAINS[p.domain]?.suffix ?? String(p.domain);
      const fmt = (v: number | null) => v !== null ? v.toFixed(2) : "";
      return [
        `.${suffix}`,
        p.asin,
        p.sku ?? "",
        p.title,
        p.brand ?? "",
        fmt(p.amazonPrice),
        fmt(p.officialListPrice),
        fmt(p.listPrice),
        fmt(p.buyBoxTotal),
        p.buyBoxSellerName ?? "",
        p.rating !== null ? p.rating.toFixed(1) : "",
        p.reviewCount !== null ? String(p.reviewCount) : "",
        p.salesRank !== null ? String(p.salesRank) : "",
        p.offerCountFBA !== null ? String(p.offerCountFBA) : "",
        p.monthlySold !== null ? String(p.monthlySold) : "",
        p.lastRefreshAt ?? "",
      ].map(escapeCsv);
    });

    const csv = [headers.join(";"), ...csvRows.map((r) => r.join(";"))].join("\n");
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`buybox_export_${date}.csv`, csv);
  }, [table]);

  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex flex-1 items-center space-x-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par ASIN, titre, marque..."
            value={table.getState().globalFilter ?? ""}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            className="h-9 w-[250px] lg:w-[350px] pl-8"
          />
        </div>
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.setGlobalFilter("")}
            className="h-9 px-2 lg:px-3"
          >
            Réinitialiser
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} résultat(s)
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="gap-2"
        >
          <Download className="h-3.5 w-3.5" />
          Exporter CSV
        </Button>
      </div>
    </div>
  );
}
