"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "keepa-dashboard-products";

export interface TrackedProduct {
  asin: string;
  sku: string;
  officialListPrice: number | null;
}

export function useAsinStore() {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Support migration from old format (string[]) to new format (TrackedProduct[])
          if (parsed.length > 0 && typeof parsed[0] === "string") {
            setProducts(parsed.map((a: string) => ({ asin: a, sku: "", officialListPrice: null })));
          } else {
            // Migrate old entries without officialListPrice
            setProducts(parsed.map((p: TrackedProduct) => ({
              asin: p.asin,
              sku: p.sku ?? "",
              officialListPrice: p.officialListPrice ?? null,
            })));
          }
        }
      }
    } catch {
      // ignore
    }
    setIsLoaded(true);
  }, []);

  // Persist
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }
  }, [products, isLoaded]);

  const asins = products.map((p) => p.asin);

  const addProducts = useCallback(
    (newProducts: TrackedProduct[]) => {
      setProducts((prev) => {
        const existing = new Set(prev.map((p) => p.asin));
        const unique = newProducts.filter(
          (p) => !existing.has(p.asin) && /^[A-Z0-9]{10}$/.test(p.asin)
        );
        return [...prev, ...unique];
      });
    },
    []
  );

  const addAsins = useCallback(
    (newAsins: string[]) => {
      setProducts((prev) => {
        const existing = new Set(prev.map((p) => p.asin));
        const unique = newAsins
          .filter((a) => !existing.has(a) && /^[A-Z0-9]{10}$/.test(a))
          .map((a) => ({ asin: a, sku: "", officialListPrice: null }));
        return [...prev, ...unique];
      });
    },
    []
  );

  const removeAsin = useCallback((asin: string) => {
    setProducts((prev) => prev.filter((p) => p.asin !== asin));
  }, []);

  const updateSku = useCallback((asin: string, sku: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.asin === asin ? { ...p, sku } : p))
    );
  }, []);

  const updateListPrice = useCallback((asin: string, price: number | null) => {
    setProducts((prev) =>
      prev.map((p) => (p.asin === asin ? { ...p, officialListPrice: price } : p))
    );
  }, []);

  const clearAll = useCallback(() => {
    setProducts([]);
  }, []);

  return {
    products,
    asins,
    isLoaded,
    addProducts,
    addAsins,
    removeAsin,
    updateSku,
    updateListPrice,
    clearAll,
  };
}
