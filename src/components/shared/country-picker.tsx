"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown } from "lucide-react";

interface Country {
  id: number;
  flag: string;
  label: string;
  suffix: string;
  code: string;
}

const COUNTRIES: Country[] = [
  { id: 4, flag: "🇫🇷", label: "France", suffix: ".fr", code: "FR" },
  { id: 9, flag: "🇪🇸", label: "Espagne", suffix: ".es", code: "ES" },
  { id: 3, flag: "🇩🇪", label: "Allemagne", suffix: ".de", code: "DE" },
  { id: 8, flag: "🇮🇹", label: "Italie", suffix: ".it", code: "IT" },
  { id: 2, flag: "🇬🇧", label: "Royaume-Uni", suffix: ".co.uk", code: "UK" },
];

interface CountryPickerProps {
  selected: number[];
  onChange: (domains: number[]) => void;
}

export function CountryPicker({ selected, onChange }: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggle = (id: number) => {
    if (selected.includes(id)) {
      if (selected.length > 1) {
        onChange(selected.filter((d) => d !== id));
      }
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => onChange(COUNTRIES.map((c) => c.id));

  const selectedCountries = COUNTRIES.filter((c) => selected.includes(c.id));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-white text-sm font-medium text-foreground shadow-sm hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-1">
          {selectedCountries.map((c) => (
            <span key={c.id} className="text-lg leading-none" title={c.label}>
              {c.flag}
            </span>
          ))}
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-64 rounded-xl border bg-white p-1.5 shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Marchés
            </span>
            <button
              onClick={selectAll}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Tout sélectionner
            </button>
          </div>
          <div className="h-px bg-border mx-1 mb-1" />
          {COUNTRIES.map((country) => {
            const isSelected = selected.includes(country.id);
            return (
              <button
                key={country.id}
                onClick={() => toggle(country.id)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors"
              >
                <div
                  className={`flex h-4.5 w-4.5 items-center justify-center rounded border-2 transition-colors ${
                    isSelected
                      ? "bg-primary border-primary text-white"
                      : "border-muted-foreground/25 bg-white"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                </div>
                <span className="text-lg leading-none">{country.flag}</span>
                <span className="flex-1 text-left font-medium text-foreground">
                  {country.label}
                </span>
                <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                  {country.code}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { COUNTRIES };
