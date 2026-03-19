"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const BASE_PATH = "/amazon-tracker";

/** All supported domains */
const ALL_DOMAINS = [4, 9, 3, 8, 2]; // FR, ES, DE, IT, UK

export interface TrackedProduct {
  asin: string;
  sku: string;
  /** Official list price in EUR (used for FR, ES, DE, IT) */
  officialListPrice: number | null;
  /** Official list price in GBP (used for UK) */
  officialListPriceGBP: number | null;
  /** Which domains (countries) this product is tracked on. Defaults to all. */
  domains: number[];
}

/** Debounced save to server */
function useDebouncedSave(products: TrackedProduct[], isLoaded: boolean) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRef = useRef(true);

  useEffect(() => {
    // Skip the initial load (we just fetched from server)
    if (!isLoaded) return;
    if (isFirstRef.current) {
      isFirstRef.current = false;
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetch(`${BASE_PATH}/api/asins`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(products),
      }).catch(() => {});
    }, 500);
  }, [products, isLoaded]);
}

export function useAsinStore() {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from server on mount
  useEffect(() => {
    fetch(`${BASE_PATH}/api/asins`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProducts(
            data.map((p: Partial<TrackedProduct> & { asin: string }) => ({
              asin: p.asin,
              sku: p.sku ?? "",
              officialListPrice: p.officialListPrice ?? null,
              officialListPriceGBP: p.officialListPriceGBP ?? null,
              domains: Array.isArray(p.domains) && p.domains.length > 0 ? p.domains : ALL_DOMAINS,
            }))
          );
        }
        setIsLoaded(true);
      })
      .catch(() => {
        setIsLoaded(true);
      });
  }, []);

  // Auto-save to server when products change
  useDebouncedSave(products, isLoaded);

  const asins = products.map((p) => p.asin);

  const addProducts = useCallback(
    (newProducts: Array<Omit<TrackedProduct, "domains" | "officialListPriceGBP"> & { domains?: number[]; officialListPriceGBP?: number | null }>) => {
      setProducts((prev) => {
        const existing = new Set(prev.map((p) => p.asin));
        const unique = newProducts
          .filter((p) => !existing.has(p.asin) && /^[A-Z0-9]{10}$/.test(p.asin))
          .map((p) => ({
            ...p,
            officialListPriceGBP: p.officialListPriceGBP ?? null,
            domains: Array.isArray(p.domains) && p.domains.length > 0 ? p.domains : ALL_DOMAINS,
          }));
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
          .map((a) => ({ asin: a, sku: "", officialListPrice: null, officialListPriceGBP: null, domains: ALL_DOMAINS }));
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

  const updateListPriceGBP = useCallback((asin: string, price: number | null) => {
    setProducts((prev) =>
      prev.map((p) => (p.asin === asin ? { ...p, officialListPriceGBP: price } : p))
    );
  }, []);

  const updateDomains = useCallback((asin: string, domains: number[]) => {
    setProducts((prev) =>
      prev.map((p) => (p.asin === asin ? { ...p, domains } : p))
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
    updateListPriceGBP,
    updateDomains,
    clearAll,
  };
}
