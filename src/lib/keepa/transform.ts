import { KeepaProduct } from "./types";
import { CsvType, keepaPriceToNumber, keepaTimeToDate } from "./constants";
import { DashboardProduct } from "@/types/product";

function getStatCurrent(
  stats: KeepaProduct["stats"],
  index: CsvType
): number | null {
  if (!stats?.current) return null;
  const val = stats.current[index];
  if (val === null || val === undefined || val < 0) return null;
  return val;
}

function getImageUrl(imagesCSV: string | null): string | null {
  if (!imagesCSV) return null;
  const firstImage = imagesCSV.split(",")[0];
  if (!firstImage) return null;
  return `https://images-na.ssl-images-amazon.com/images/I/${firstImage}`;
}

export function transformKeepaProduct(
  raw: KeepaProduct,
  domain: number
): DashboardProduct {
  const stats = raw.stats;

  const amazonPriceCents = getStatCurrent(stats, CsvType.AMAZON);
  const listPriceCents = getStatCurrent(stats, CsvType.LISTPRICE);
  const newPriceCents = getStatCurrent(stats, CsvType.NEW);
  const usedPriceCents = getStatCurrent(stats, CsvType.USED);
  const fbaPriceCents = getStatCurrent(stats, CsvType.NEW_FBA);
  const salesRank = getStatCurrent(stats, CsvType.SALES);

  const buyBoxPrice = stats?.buyBoxPrice != null && stats.buyBoxPrice >= 0
    ? keepaPriceToNumber(stats.buyBoxPrice)
    : null;
  const buyBoxShipping = stats?.buyBoxShipping != null && stats.buyBoxShipping >= 0
    ? keepaPriceToNumber(stats.buyBoxShipping)
    : null;
  const buyBoxTotal =
    buyBoxPrice !== null
      ? buyBoxPrice + (buyBoxShipping ?? 0)
      : null;

  const fbaPickAndPackFee = raw.fbaFees
    ? keepaPriceToNumber(raw.fbaFees.pickAndPackFee)
    : null;
  const fbaStorageFee = raw.fbaFees
    ? keepaPriceToNumber(raw.fbaFees.storageFee)
    : null;
  const fbaTotalFee =
    fbaPickAndPackFee !== null && fbaStorageFee !== null
      ? fbaPickAndPackFee + fbaStorageFee
      : fbaPickAndPackFee ?? fbaStorageFee;

  const category =
    raw.categoryTree && raw.categoryTree.length > 0
      ? raw.categoryTree[0].name
      : null;

  // Rating: Keepa stores it as rating * 10 (e.g. 45 = 4.5)
  const ratingRaw = getStatCurrent(stats, CsvType.RATING);
  const rating = ratingRaw !== null ? ratingRaw / 10 : null;

  // Review count
  const reviewCount = getStatCurrent(stats, CsvType.COUNT_REVIEWS);

  // BuyBox seller name: match sellerId against offers
  let buyBoxSellerName: string | null = null;
  const sellerId = stats?.buyBoxSellerId ?? null;
  if (sellerId) {
    // Known Amazon seller IDs per marketplace
    const amazonSellerIds = new Set([
      "ATVPDKIKX0DER",   // US
      "A13V1IB3VIYZZH",  // FR
      "A1RKKUPIHCS9HS",  // ES
      "A1PA6795UKMFR9",  // DE
      "A11IL2PNWYBER7",  // IT
      "APJ6JRA9NG5V4",   // UK
      "A1VC38T7YXB528",  // JP
      "A3DWYIK6Y9EEQB",  // CA
    ]);
    if (amazonSellerIds.has(sellerId) || stats?.buyBoxIsAmazon) {
      buyBoxSellerName = "Amazon";
    } else if (raw.offers && raw.offers.length > 0) {
      const matchingOffer = raw.offers.find((o) => o.sellerId === sellerId);
      buyBoxSellerName = matchingOffer?.sellerName ?? sellerId;
    } else {
      buyBoxSellerName = sellerId;
    }
  }

  return {
    asin: raw.asin,
    sku: "",
    title: raw.title ?? "Unknown Product",
    brand: raw.brand ?? null,
    officialListPrice: null,
    imageUrl: getImageUrl(raw.imagesCSV),
    category,

    rating,
    reviewCount,

    amazonPrice: keepaPriceToNumber(amazonPriceCents),
    listPrice: keepaPriceToNumber(listPriceCents),
    newPrice: keepaPriceToNumber(newPriceCents),
    usedPrice: keepaPriceToNumber(usedPriceCents),
    fbaPrice: keepaPriceToNumber(fbaPriceCents),

    buyBoxPrice,
    buyBoxShipping,
    buyBoxTotal,
    buyBoxSellerId: stats?.buyBoxSellerId ?? null,
    buyBoxSellerName,
    buyBoxIsAmazon: stats?.buyBoxIsAmazon ?? false,
    buyBoxIsFBA: stats?.buyBoxIsFBA ?? false,
    buyBoxIsPrime: stats?.buyBoxIsPrimeEligible ?? false,

    salesRank,
    salesRankCategory: category,
    salesRankDrops30: stats?.salesRankDrops30 ?? 0,
    salesRankDrops90: stats?.salesRankDrops90 ?? 0,
    salesRankDrops180: stats?.salesRankDrops180 ?? 0,

    totalOfferCount: stats?.totalOfferCount ?? 0,
    offerCountFBA: stats?.offerCountFBA ?? 0,
    offerCountFBM: stats?.offerCountFBM ?? 0,

    fbaPickAndPackFee,
    fbaStorageFee,
    fbaTotalFee,
    referralFeePercent: raw.referralFeePercentage ?? null,

    monthlySold: raw.monthlySold > 0 ? raw.monthlySold : null,

    avgPrice30: stats?.avg30
      ? keepaPriceToNumber(stats.avg30[CsvType.AMAZON] ?? null)
      : null,
    avgPrice90: stats?.avg90
      ? keepaPriceToNumber(stats.avg90[CsvType.AMAZON] ?? null)
      : null,
    avgSalesRank30: stats?.avg30
      ? (stats.avg30[CsvType.SALES] ?? null)
      : null,
    avgSalesRank90: stats?.avg90
      ? (stats.avg90[CsvType.SALES] ?? null)
      : null,

    stockAmazon: stats?.stockAmazon != null && stats.stockAmazon >= 0
      ? stats.stockAmazon
      : null,
    stockBuyBox: stats?.stockBuyBox != null && stats.stockBuyBox >= 0
      ? stats.stockBuyBox
      : null,

    lastUpdate: keepaTimeToDate(raw.lastUpdate),
    lastRefreshAt: new Date().toISOString(),
    domain,
  };
}
