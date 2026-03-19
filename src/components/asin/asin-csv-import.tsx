"use client";

import { useState, useRef, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";
import { extractProductsFromCsv, CsvParseResult } from "@/lib/csv-parser";
import { TrackedProduct } from "@/hooks/use-asin-store";

interface AsinCsvImportProps {
  onImport: (products: Omit<TrackedProduct, "domains" | "officialListPriceGBP">[]) => void;
  existingAsins: string[];
}

export function AsinCsvImport({ onImport, existingAsins }: AsinCsvImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [skuCount, setSkuCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = extractProductsFromCsv(text);
      // Filter out already existing ASINs
      const existingSet = new Set(existingAsins);
      const newProducts = parsed.products.filter((p) => !existingSet.has(p.asin));
      const extraDupes = parsed.products.length - newProducts.length;
      const withSku = newProducts.filter((p) => p.sku.length > 0).length;
      setSkuCount(withSku);
      setResult({
        ...parsed,
        products: newProducts,
        duplicates: [
          ...parsed.duplicates,
          ...Array(extraDupes).fill("existing"),
        ],
      });
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleConfirm = () => {
    if (result && result.products.length > 0) {
      onImport(result.products);
      setResult(null);
      setFileName(null);
      setSkuCount(0);
    }
  };

  const handleCancel = () => {
    setResult(null);
    setFileName(null);
    setSkuCount(0);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Importer un CSV</label>

      {!result ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Glissez un fichier CSV ici ou cliquez pour sélectionner
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Colonnes supportées : ASIN + SKU (optionnel)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.tsv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{fileName}</span>
          </div>

          <div className="text-sm space-y-1">
            <p className="text-green-600 font-medium">
              {result.products.length} nouveau(x) ASIN(s) trouvé(s)
            </p>
            {skuCount > 0 && (
              <p className="text-primary font-medium">
                {skuCount} SKU(s) associé(s) détecté(s)
              </p>
            )}
            {result.duplicates.length > 0 && (
              <p className="text-amber-600">
                {result.duplicates.length} doublon(s) ignoré(s)
              </p>
            )}
            {result.invalid.length > 0 && (
              <p className="text-red-600">
                {result.invalid.length} entrée(s) invalide(s)
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={result.products.length === 0}
            >
              Importer {result.products.length} ASIN(s)
              {skuCount > 0 && ` + ${skuCount} SKU(s)`}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
