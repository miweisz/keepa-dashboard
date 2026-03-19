"use client";

import { useState, useRef, useEffect } from "react";
import { useAsinStore, TrackedProduct } from "@/hooks/use-asin-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Upload,
  FileText,
  Pencil,
  Check,
  X,
  Package,
  Search,
  Zap,
} from "lucide-react";
import { extractProductsFromCsv, CsvParsedProduct } from "@/lib/csv-parser";
import { Skeleton } from "@/components/ui/skeleton";

const DOMAIN_FLAGS: { id: number; flag: string; code: string }[] = [
  { id: 4, flag: "\u{1F1EB}\u{1F1F7}", code: "FR" },
  { id: 9, flag: "\u{1F1EA}\u{1F1F8}", code: "ES" },
  { id: 3, flag: "\u{1F1E9}\u{1F1EA}", code: "DE" },
  { id: 8, flag: "\u{1F1EE}\u{1F1F9}", code: "IT" },
  { id: 2, flag: "\u{1F1EC}\u{1F1E7}", code: "UK" },
];

export default function AsinsPage() {
  const {
    products: trackedProducts,
    asins,
    isLoaded,
    addAsins,
    addProducts,
    removeAsin,
    updateSku,
    updateListPrice,
    updateListPriceGBP,
    updateDomains,
    clearAll,
  } = useAsinStore();

  const [inputValue, setInputValue] = useState("");
  const [inputErrors, setInputErrors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAsin, setEditingAsin] = useState<string | null>(null);
  const [editField, setEditField] = useState<"sku" | "price" | "priceGBP">("sku");
  const [editValue, setEditValue] = useState("");

  // CSV
  const [isDragging, setIsDragging] = useState(false);
  const [csvResult, setCsvResult] = useState<{
    products: CsvParsedProduct[];
    skuCount: number;
    priceCount: number;
    dupes: number;
    invalid: number;
  } | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Token status
  const [tokensLeft, setTokensLeft] = useState<number | null>(null);
  const [refillRate, setRefillRate] = useState<number | null>(null);

  useEffect(() => {
    const fetchTokens = () => {
      fetch("/amazon-tracker/api/keepa/tokens")
        .then((res) => res.json())
        .then((data) => {
          if (data.tokensLeft != null) setTokensLeft(data.tokensLeft);
          if (data.refillRate != null) setRefillRate(data.refillRate);
        })
        .catch(() => {});
    };
    fetchTokens();
    const interval = setInterval(fetchTokens, 30000);
    return () => clearInterval(interval);
  }, []);

  // Add ASINs manually
  const handleAdd = () => {
    const raw = inputValue
      .split(/[\n,;\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const valid: string[] = [];
    const invalid: string[] = [];
    const dupes: string[] = [];
    const existingSet = new Set(asins);

    for (const asin of raw) {
      if (!/^[A-Z0-9]{10}$/.test(asin)) {
        invalid.push(asin);
      } else if (existingSet.has(asin)) {
        dupes.push(asin);
      } else {
        existingSet.add(asin);
        valid.push(asin);
      }
    }

    const msgs: string[] = [];
    if (invalid.length > 0)
      msgs.push(
        `${invalid.length} ASIN(s) invalide(s): ${invalid.slice(0, 3).join(", ")}${invalid.length > 3 ? "..." : ""}`
      );
    if (dupes.length > 0) msgs.push(`${dupes.length} doublon(s) ignoré(s)`);
    setInputErrors(msgs);

    if (valid.length > 0) {
      addAsins(valid);
      setInputValue("");
    }
  };

  // CSV import
  const processFile = (file: File) => {
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = extractProductsFromCsv(text);
      const existingSet = new Set(asins);
      const newProducts = parsed.products.filter((p) => !existingSet.has(p.asin));
      const extraDupes = parsed.products.length - newProducts.length;
      const skuCount = newProducts.filter((p) => p.sku.length > 0).length;
      const priceCount = newProducts.filter((p) => p.officialListPrice !== null).length;
      setCsvResult({
        products: newProducts,
        skuCount,
        priceCount,
        dupes: parsed.duplicates.length + extraDupes,
        invalid: parsed.invalid.length,
      });
    };
    reader.readAsText(file);
  };

  const handleCsvConfirm = () => {
    if (csvResult && csvResult.products.length > 0) {
      addProducts(csvResult.products);
      setCsvResult(null);
      setCsvFileName(null);
    }
  };

  // Edit inline
  const startEdit = (asin: string, field: "sku" | "price" | "priceGBP", currentValue: string) => {
    setEditingAsin(asin);
    setEditField(field);
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    if (!editingAsin) return;
    if (editField === "sku") {
      updateSku(editingAsin, editValue.trim());
    } else if (editField === "priceGBP") {
      const num = parseFloat(editValue.replace(",", "."));
      updateListPriceGBP(editingAsin, isNaN(num) ? null : num);
    } else {
      const num = parseFloat(editValue.replace(",", "."));
      updateListPrice(editingAsin, isNaN(num) ? null : num);
    }
    setEditingAsin(null);
    setEditValue("");
  };

  // Filter
  const filteredProducts = trackedProducts.filter(
    (p) =>
      p.asin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isLoaded) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-[1200px] space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">ASINs à suivre</h2>
            <p className="text-muted-foreground mt-1">
              Gérez la liste des produits Amazon, leur SKU Shapeheart et prix officiel.
            </p>
          </div>
          {tokensLeft !== null && (
            <div className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border ${
              tokensLeft < 100 ? "border-red-200 bg-red-50 text-red-600" : "bg-white"
            }`}>
              <Zap className="h-3 w-3" />
              <span className="font-mono tabular-nums">
                {tokensLeft.toLocaleString()}
              </span>
              <span className="font-normal">tokens</span>
              {refillRate !== null && (
                <span className="text-muted-foreground font-normal">· {refillRate}/min</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Add ASINs */}
        <div className="space-y-4">
          {/* Manual input */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Ajouter des ASINs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Entrez des ASINs&#10;(un par ligne ou séparés par des virgules)&#10;&#10;Ex: B08N5WRWNW, B09V3KXJPB"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
              {inputErrors.length > 0 && (
                <div className="text-sm text-amber-600 space-y-0.5">
                  {inputErrors.map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                </div>
              )}
              <Button
                onClick={handleAdd}
                disabled={!inputValue.trim()}
                size="sm"
                className="w-full"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Ajouter
              </Button>
            </CardContent>
          </Card>

          {/* CSV Import */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Importer un CSV
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!csvResult ? (
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
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) processFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Glissez un CSV ou cliquez
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Colonnes : ASIN, SKU, Prix (optionnels)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt,.tsv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processFile(file);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{csvFileName}</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="text-green-600 font-medium">
                      {csvResult.products.length} nouveau(x) ASIN(s)
                    </p>
                    {csvResult.skuCount > 0 && (
                      <p className="text-primary font-medium">
                        {csvResult.skuCount} SKU(s) détecté(s)
                      </p>
                    )}
                    {csvResult.priceCount > 0 && (
                      <p className="text-emerald-600 font-medium">
                        {csvResult.priceCount} prix officiel(s) détecté(s)
                      </p>
                    )}
                    {csvResult.dupes > 0 && (
                      <p className="text-amber-600">
                        {csvResult.dupes} doublon(s)
                      </p>
                    )}
                    {csvResult.invalid > 0 && (
                      <p className="text-red-600">
                        {csvResult.invalid} invalide(s)
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCsvConfirm}
                      disabled={csvResult.products.length === 0}
                    >
                      Importer{csvResult.skuCount > 0 ? ` + ${csvResult.skuCount} SKU(s)` : ""}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCsvResult(null);
                        setCsvFileName(null);
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: ASIN Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {trackedProducts.length} produit(s) suivi(s)
                </CardTitle>
                {trackedProducts.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Tout supprimer
                  </Button>
                )}
              </div>
              {trackedProducts.length > 5 && (
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher ASIN ou SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent>
              {trackedProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium mb-1">
                    Aucun ASIN à suivre
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ajoutez des ASINs manuellement ou importez un CSV.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_1.2fr_0.8fr_0.8fr_auto_auto] gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <span>ASIN</span>
                    <span>SKU Shapeheart</span>
                    <span>Prix EUR (€)</span>
                    <span>Prix UK (£)</span>
                    <span>Pays</span>
                    <span className="w-8" />
                  </div>

                  {/* Table rows */}
                  <div className="divide-y max-h-[600px] overflow-y-auto">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.asin}
                        className="grid grid-cols-[1fr_1.2fr_0.8fr_0.8fr_auto_auto] gap-2 px-4 py-2.5 items-center hover:bg-muted/30 transition-colors"
                      >
                        {/* ASIN */}
                        <div>
                          <Badge
                            variant="secondary"
                            className="font-mono text-xs"
                          >
                            {product.asin}
                          </Badge>
                        </div>

                        {/* SKU */}
                        <div>
                          {editingAsin === product.asin && editField === "sku" ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit();
                                  if (e.key === "Escape") setEditingAsin(null);
                                }}
                                className="h-7 text-sm font-mono"
                                autoFocus
                                placeholder="SKU..."
                              />
                              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={saveEdit}>
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingAsin(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              className="flex items-center gap-1.5 text-sm group"
                              onClick={() => startEdit(product.asin, "sku", product.sku)}
                            >
                              {product.sku ? (
                                <span className="font-mono text-foreground">{product.sku}</span>
                              ) : (
                                <span className="text-muted-foreground italic">Ajouter SKU...</span>
                              )}
                              <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                        </div>

                        {/* Prix Officiel */}
                        <div>
                          {editingAsin === product.asin && editField === "price" ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit();
                                  if (e.key === "Escape") setEditingAsin(null);
                                }}
                                className="h-7 text-sm font-mono w-24"
                                autoFocus
                                placeholder="29.95"
                                type="text"
                                inputMode="decimal"
                              />
                              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={saveEdit}>
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingAsin(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              className="flex items-center gap-1.5 text-sm group"
                              onClick={() =>
                                startEdit(
                                  product.asin,
                                  "price",
                                  product.officialListPrice != null ? String(product.officialListPrice) : ""
                                )
                              }
                            >
                              {product.officialListPrice != null ? (
                                <span className="font-mono text-foreground">
                                  €{product.officialListPrice.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic">Ajouter prix...</span>
                              )}
                              <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                        </div>

                        {/* Prix UK (£) */}
                        <div>
                          {editingAsin === product.asin && editField === "priceGBP" ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit();
                                  if (e.key === "Escape") setEditingAsin(null);
                                }}
                                className="h-7 text-sm font-mono w-24"
                                autoFocus
                                placeholder="24.95"
                                type="text"
                                inputMode="decimal"
                              />
                              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={saveEdit}>
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingAsin(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              className="flex items-center gap-1.5 text-sm group"
                              onClick={() =>
                                startEdit(
                                  product.asin,
                                  "priceGBP",
                                  product.officialListPriceGBP != null ? String(product.officialListPriceGBP) : ""
                                )
                              }
                            >
                              {product.officialListPriceGBP != null ? (
                                <span className="font-mono text-foreground">
                                  £{product.officialListPriceGBP.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic">Ajouter prix...</span>
                              )}
                              <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                        </div>

                        {/* Pays */}
                        <div className="flex items-center gap-0.5">
                          {DOMAIN_FLAGS.map((d) => {
                            const active = product.domains?.includes(d.id) ?? true;
                            return (
                              <button
                                key={d.id}
                                onClick={() => {
                                  const current = product.domains ?? DOMAIN_FLAGS.map((x) => x.id);
                                  if (active) {
                                    if (current.length > 1) {
                                      updateDomains(product.asin, current.filter((id) => id !== d.id));
                                    }
                                  } else {
                                    updateDomains(product.asin, [...current, d.id]);
                                  }
                                }}
                                className={`text-base leading-none p-0.5 rounded transition-opacity ${
                                  active ? "opacity-100" : "opacity-25 grayscale"
                                }`}
                                title={`${d.code} ${active ? "(actif)" : "(désactivé)"}`}
                              >
                                {d.flag}
                              </button>
                            );
                          })}
                        </div>

                        {/* Delete */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => removeAsin(product.asin)}
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    ))}

                    {filteredProducts.length === 0 && searchQuery && (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Aucun résultat pour &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
