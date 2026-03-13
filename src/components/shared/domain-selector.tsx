"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KEEPA_DOMAINS } from "@/lib/keepa/constants";

interface DomainSelectorProps {
  value: number;
  onChange: (domain: number) => void;
}

export function DomainSelector({ value, onChange }: DomainSelectorProps) {
  const currentDomain = KEEPA_DOMAINS[value];

  return (
    <Select
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
    >
      <SelectTrigger className="w-[200px]">
        <span>{currentDomain?.name ?? "Sélectionner"}</span>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(KEEPA_DOMAINS).map(([id, info]) => (
          <SelectItem key={id} value={id}>
            {info.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
