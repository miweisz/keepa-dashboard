"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

interface AsinInputProps {
  onAdd: (asins: string[]) => void;
  existingAsins: string[];
}

export function AsinInput({ onAdd, existingAsins }: AsinInputProps) {
  const [value, setValue] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const handleAdd = () => {
    const raw = value
      .split(/[\n,;\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const valid: string[] = [];
    const invalid: string[] = [];
    const dupes: string[] = [];
    const existingSet = new Set(existingAsins);

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
      msgs.push(`${invalid.length} ASIN(s) invalide(s): ${invalid.slice(0, 3).join(", ")}${invalid.length > 3 ? "..." : ""}`);
    if (dupes.length > 0)
      msgs.push(`${dupes.length} doublon(s) ignoré(s)`);

    setErrors(msgs);

    if (valid.length > 0) {
      onAdd(valid);
      setValue("");
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Ajouter des ASINs</label>
      <Textarea
        placeholder="Entrez des ASINs (un par ligne, séparés par des virgules ou des espaces)&#10;Ex: B08N5WRWNW, B09V3KXJPB"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        className="font-mono text-sm"
      />
      {errors.length > 0 && (
        <div className="text-sm text-amber-600 space-y-0.5">
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}
      <Button
        onClick={handleAdd}
        disabled={!value.trim()}
        size="sm"
      >
        <Plus className="mr-1 h-4 w-4" />
        Ajouter
      </Button>
    </div>
  );
}
