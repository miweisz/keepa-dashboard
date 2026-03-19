"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Package } from "lucide-react";
import { AsinInput } from "./asin-input";
import { AsinCsvImport } from "./asin-csv-import";
import { AsinList } from "./asin-list";
import { TrackedProduct } from "@/hooks/use-asin-store";

interface AsinManagerProps {
  asins: string[];
  onAdd: (asins: string[]) => void;
  onAddProducts?: (products: Omit<TrackedProduct, "domains" | "officialListPriceGBP">[]) => void;
  onRemove: (asin: string) => void;
  onClearAll: () => void;
}

export function AsinManager({
  asins,
  onAdd,
  onAddProducts,
  onRemove,
  onClearAll,
}: AsinManagerProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Gestion des ASINs
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AsinInput onAdd={onAdd} existingAsins={asins} />
            <AsinCsvImport onImport={onAddProducts ?? ((products) => onAdd(products.map(p => p.asin)))} existingAsins={asins} />
          </div>
          <AsinList
            asins={asins}
            onRemove={onRemove}
            onClearAll={onClearAll}
          />
        </CardContent>
      )}
    </Card>
  );
}
