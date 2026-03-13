export enum CsvType {
  AMAZON = 0,
  NEW = 1,
  USED = 2,
  SALES = 3,
  LISTPRICE = 4,
  COLLECTIBLE = 5,
  REFURBISHED = 6,
  NEW_FBM_SHIPPING = 7,
  LIGHTNING_DEAL = 8,
  WAREHOUSE = 9,
  NEW_FBA = 10,
  COUNT_NEW = 11,
  COUNT_USED = 12,
  COUNT_REFURBISHED = 13,
  COUNT_COLLECTIBLE = 14,
  RATING = 16,
  COUNT_REVIEWS = 17,
  BUY_BOX_SHIPPING = 18,
  USED_NEW_SHIPPING = 19,
  USED_VERY_GOOD_SHIPPING = 20,
  USED_GOOD_SHIPPING = 21,
  USED_ACCEPTABLE_SHIPPING = 22,
  COLLECTIBLE_NEW_SHIPPING = 23,
  COLLECTIBLE_VERY_GOOD_SHIPPING = 24,
  COLLECTIBLE_GOOD_SHIPPING = 25,
  COLLECTIBLE_ACCEPTABLE_SHIPPING = 26,
  REFURBISHED_SHIPPING = 27,
  TRADE_IN = 30,
  COUNT_NEW_FBA = 34,
  COUNT_NEW_FBM = 35,
}

export const KEEPA_DOMAINS: Record<number, { name: string; suffix: string; currency: string }> = {
  1: { name: "Amazon.com", suffix: "com", currency: "USD" },
  2: { name: "Amazon.co.uk", suffix: "co.uk", currency: "GBP" },
  3: { name: "Amazon.de", suffix: "de", currency: "EUR" },
  4: { name: "Amazon.fr", suffix: "fr", currency: "EUR" },
  5: { name: "Amazon.co.jp", suffix: "co.jp", currency: "JPY" },
  6: { name: "Amazon.ca", suffix: "ca", currency: "CAD" },
  8: { name: "Amazon.it", suffix: "it", currency: "EUR" },
  9: { name: "Amazon.es", suffix: "es", currency: "EUR" },
  10: { name: "Amazon.in", suffix: "in", currency: "INR" },
  11: { name: "Amazon.com.mx", suffix: "com.mx", currency: "MXN" },
};

export const KEEPA_PRICE_DIVISOR = 100;

export function keepaTimeToDate(keepaMinutes: number): Date {
  return new Date((keepaMinutes + 21564000) * 60000);
}

export function keepaPriceToNumber(price: number | null | undefined): number | null {
  if (price === null || price === undefined || price < 0) return null;
  return price / KEEPA_PRICE_DIVISOR;
}

export function getCurrencySymbol(domain: number): string {
  const symbols: Record<string, string> = {
    USD: "$",
    GBP: "£",
    EUR: "€",
    JPY: "¥",
    CAD: "CA$",
    INR: "₹",
    MXN: "MX$",
  };
  const currency = KEEPA_DOMAINS[domain]?.currency ?? "USD";
  return symbols[currency] ?? "$";
}
