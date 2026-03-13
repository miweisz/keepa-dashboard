"use client";

import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

interface TokenDisplayProps {
  tokensLeft: number | null;
  tokensConsumed?: number | null;
}

export function TokenDisplay({ tokensLeft, tokensConsumed }: TokenDisplayProps) {
  if (tokensLeft === null) return null;

  const isLow = tokensLeft < 100;

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={isLow ? "destructive" : "secondary"}
        className="flex items-center gap-1"
      >
        <Zap className="h-3 w-3" />
        {tokensLeft.toLocaleString()} tokens
      </Badge>
      {tokensConsumed != null && tokensConsumed > 0 && (
        <span className="text-xs text-muted-foreground">
          (-{tokensConsumed} utilisés)
        </span>
      )}
    </div>
  );
}
