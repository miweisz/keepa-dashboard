"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DashboardProduct } from "@/types/product";
import { ExternalLink } from "lucide-react";

interface ProductDetailSheetProps {
  product: DashboardProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PriceRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">
        {value !== null ? `$${value.toFixed(2)}` : "—"}
      </span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">
        {value !== null && value !== undefined ? String(value) : "—"}
      </span>
    </div>
  );
}

export function ProductDetailSheet({
  product,
  open,
  onOpenChange,
}: ProductDetailSheetProps) {
  if (!product) return null;

  const suffix =
    { 1: "com", 2: "co.uk", 3: "de", 4: "fr", 5: "co.jp", 6: "ca", 8: "it", 9: "es" }[
      product.domain
    ] ?? "com";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[450px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start gap-4 pr-6">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.title}
                className="h-20 w-20 rounded object-contain border"
              />
            )}
            <div className="space-y-1 min-w-0">
              <SheetTitle className="text-base leading-tight">
                {product.title}
              </SheetTitle>
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.amazon.${suffix}/dp/${product.asin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1 font-mono"
                >
                  {product.asin}
                  <ExternalLink className="h-3 w-3" />
                </a>
                {product.brand && (
                  <Badge variant="secondary" className="text-xs">
                    {product.brand}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Rating */}
          {product.rating !== null && (
            <>
              <section>
                <h3 className="text-sm font-semibold mb-2">Note</h3>
                <div className="rounded-lg border p-3 space-y-0.5">
                  <InfoRow label="Note" value={`${"★".repeat(Math.round(product.rating))}${"☆".repeat(5 - Math.round(product.rating))} ${product.rating.toFixed(1)}/5`} />
                  <InfoRow label="Nombre d'avis" value={product.reviewCount?.toLocaleString("fr-FR") ?? null} />
                </div>
              </section>
              <Separator />
            </>
          )}

          {/* Prices */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Prix</h3>
            <div className="rounded-lg border p-3 space-y-0.5">
              <PriceRow label="Prix Amazon" value={product.amazonPrice} />
              <PriceRow label="List Price" value={product.listPrice} />
              <PriceRow label="Nouveau (marketplace)" value={product.newPrice} />
              <PriceRow label="Occasion" value={product.usedPrice} />
              <PriceRow label="FBA" value={product.fbaPrice} />
            </div>
          </section>

          <Separator />

          {/* BuyBox */}
          <section>
            <h3 className="text-sm font-semibold mb-2">BuyBox</h3>
            <div className="rounded-lg border p-3 space-y-0.5">
              <PriceRow label="Prix" value={product.buyBoxPrice} />
              <PriceRow label="Livraison" value={product.buyBoxShipping} />
              <PriceRow label="Total" value={product.buyBoxTotal} />
              <InfoRow label="Vendeur" value={product.buyBoxSellerName} />
              <div className="flex justify-between py-1">
                <span className="text-sm text-muted-foreground">Type</span>
                <div className="flex gap-1">
                  {product.buyBoxIsAmazon && (
                    <Badge className="bg-blue-100 text-blue-800 text-xs">Amazon</Badge>
                  )}
                  {product.buyBoxIsFBA && (
                    <Badge className="bg-green-100 text-green-800 text-xs">FBA</Badge>
                  )}
                  {product.buyBoxIsPrime && (
                    <Badge className="bg-purple-100 text-purple-800 text-xs">Prime</Badge>
                  )}
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Sales Rank */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Classement des ventes</h3>
            <div className="rounded-lg border p-3 space-y-0.5">
              <InfoRow
                label="Rang actuel"
                value={product.salesRank?.toLocaleString("fr-FR") ?? null}
              />
              <InfoRow label="Catégorie" value={product.salesRankCategory} />
              <InfoRow label="Drops 30 jours" value={product.salesRankDrops30} />
              <InfoRow label="Drops 90 jours" value={product.salesRankDrops90} />
              <InfoRow label="Drops 180 jours" value={product.salesRankDrops180} />
              <InfoRow
                label="Rang moyen 30j"
                value={product.avgSalesRank30?.toLocaleString("fr-FR") ?? null}
              />
              <InfoRow
                label="Rang moyen 90j"
                value={product.avgSalesRank90?.toLocaleString("fr-FR") ?? null}
              />
            </div>
          </section>

          <Separator />

          {/* Sellers */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Vendeurs</h3>
            <div className="rounded-lg border p-3 space-y-0.5">
              <InfoRow label="Total vendeurs" value={product.totalOfferCount} />
              <InfoRow label="Vendeurs FBA" value={product.offerCountFBA} />
              <InfoRow label="Vendeurs FBM" value={product.offerCountFBM} />
              <InfoRow
                label="Ventes mensuelles est."
                value={product.monthlySold ? `${product.monthlySold}+` : null}
              />
            </div>
          </section>

          <Separator />

          {/* Fees */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Frais FBA</h3>
            <div className="rounded-lg border p-3 space-y-0.5">
              <PriceRow label="Pick & Pack" value={product.fbaPickAndPackFee} />
              <PriceRow label="Stockage" value={product.fbaStorageFee} />
              <PriceRow label="Total FBA" value={product.fbaTotalFee} />
              <InfoRow
                label="Commission referral"
                value={product.referralFeePercent ? `${product.referralFeePercent}%` : null}
              />
            </div>
          </section>

          <Separator />

          {/* Averages */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Moyennes de prix</h3>
            <div className="rounded-lg border p-3 space-y-0.5">
              <PriceRow label="Prix moyen 30j" value={product.avgPrice30} />
              <PriceRow label="Prix moyen 90j" value={product.avgPrice90} />
            </div>
          </section>

          {/* Stock */}
          {(product.stockAmazon !== null || product.stockBuyBox !== null) && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold mb-2">Stock</h3>
                <div className="rounded-lg border p-3 space-y-0.5">
                  <InfoRow label="Stock Amazon" value={product.stockAmazon} />
                  <InfoRow label="Stock BuyBox" value={product.stockBuyBox} />
                </div>
              </section>
            </>
          )}

          <div className="text-xs text-muted-foreground pt-2">
            Dernière mise à jour : {product.lastUpdate.toLocaleString("fr-FR")}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
