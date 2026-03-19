export interface DashboardProduct {
  asin: string;
  sku: string;
  title: string;
  brand: string | null;
  imageUrl: string | null;
  allImageUrls: string[];
  features: string[];
  variation: string | null;
  parentAsin: string | null;
  variationAttributes: { dimension: string; value: string }[];
  category: string | null;

  // Official Shapeheart price
  officialListPrice: number | null;

  // Prices
  amazonPrice: number | null;
  listPrice: number | null;
  newPrice: number | null;
  usedPrice: number | null;
  fbaPrice: number | null;

  // Rating
  rating: number | null;
  reviewCount: number | null;

  // BuyBox
  buyBoxPrice: number | null;
  buyBoxShipping: number | null;
  buyBoxTotal: number | null;
  buyBoxSellerId: string | null;
  buyBoxSellerName: string | null;
  buyBoxIsAmazon: boolean;
  buyBoxIsFBA: boolean;
  buyBoxIsPrime: boolean;

  // Sales Rank
  salesRank: number | null;
  salesRankCategory: string | null;
  salesRankDrops30: number;
  salesRankDrops90: number;
  salesRankDrops180: number;

  // Sellers
  totalOfferCount: number;
  offerCountFBA: number;
  offerCountFBM: number;

  // FBA Fees
  fbaPickAndPackFee: number | null;
  fbaStorageFee: number | null;
  fbaTotalFee: number | null;
  referralFeePercent: number | null;

  // Estimates
  monthlySold: number | null;

  // Averages
  avgPrice30: number | null;
  avgPrice90: number | null;
  avgSalesRank30: number | null;
  avgSalesRank90: number | null;

  // Stock
  stockAmazon: number | null;
  stockBuyBox: number | null;

  // Meta
  lastUpdate: Date;
  lastRefreshAt: string; // ISO string of when this product was last fetched
  domain: number;
}
