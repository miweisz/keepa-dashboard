"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface AsinListProps {
  asins: string[];
  onRemove: (asin: string) => void;
  onClearAll: () => void;
}

const INITIAL_DISPLAY = 20;

export function AsinList({ asins, onRemove, onClearAll }: AsinListProps) {
  const [showAll, setShowAll] = useState(false);

  if (asins.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Aucun ASIN ajouté. Utilisez le formulaire ci-dessus pour commencer.
      </p>
    );
  }

  const displayedAsins = showAll ? asins : asins.slice(0, INITIAL_DISPLAY);
  const hasMore = asins.length > INITIAL_DISPLAY;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {asins.length} ASIN(s) suivis
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Tout supprimer
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {displayedAsins.map((asin) => (
          <Badge
            key={asin}
            variant="secondary"
            className="font-mono text-xs pl-2 pr-1 py-0.5 gap-1"
          >
            {asin}
            <button
              onClick={() => onRemove(asin)}
              className="ml-0.5 hover:bg-muted rounded-sm p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full"
        >
          {showAll ? (
            <>
              <ChevronUp className="mr-1 h-3 w-3" />
              Réduire
            </>
          ) : (
            <>
              <ChevronDown className="mr-1 h-3 w-3" />
              Afficher les {asins.length - INITIAL_DISPLAY} restants
            </>
          )}
        </Button>
      )}
    </div>
  );
}
