export interface KeepaResponse {
  timestamp: number;
  tokensLeft: number;
  refillIn: number;
  refillRate: number;
  tokenFlowReduction: number;
  tokensConsumed: number;
  processingTimeInMs: number;
  products: KeepaProduct[] | null;
  error?: { type: string; message: string };
}

export interface KeepaProduct {
  asin: string;
  title: string | null;
  brand: string | null;
  manufacturer: string | null;
  productGroup: string | null;
  rootCategory: number;
  categories: number[];
  categoryTree: CategoryTreeEntry[] | null;
  parentAsin: string | null;
  packageQuantity: number;
  numberOfItems: number;
  availabilityAmazon: number;
  isAdultProduct: boolean;
  newPriceIsMAP: boolean;
  imagesCSV: string | null;
  csv: (number[] | null)[];
  stats: KeepaStats | null;
  offers: KeepaOffer[] | null;
  liveOffersOrder: number[] | null;
  buyBoxSellerIdHistory: string[] | null;
  fbaFees: FBAFees | null;
  referralFeePercentage: number;
  monthlySold: number;
  salesRanks: Record<string, number[]> | null;
  coupon: number[] | null;
  lastUpdate: number;
  lastPriceChange: number;
  lastRatingUpdate: number;
}

export interface KeepaStats {
  current: (number | null)[];
  avg: (number | null)[];
  avg30: (number | null)[];
  avg90: (number | null)[];
  avg180: (number | null)[];
  min: (number[] | null)[];
  max: (number[] | null)[];
  buyBoxPrice: number;
  buyBoxShipping: number;
  buyBoxIsFBA: boolean | null;
  buyBoxIsAmazon: boolean | null;
  buyBoxSellerId: string | null;
  buyBoxIsMAP: boolean | null;
  buyBoxIsPrimeEligible: boolean | null;
  totalOfferCount: number;
  offerCountFBA: number;
  offerCountFBM: number;
  salesRankDrops30: number;
  salesRankDrops90: number;
  salesRankDrops180: number;
  stockAmazon: number;
  stockBuyBox: number;
}

export interface FBAFees {
  pickAndPackFee: number;
  pickAndPackFeeTax: number;
  storageFee: number;
  storageFeeTax: number;
}

export interface CategoryTreeEntry {
  catId: number;
  name: string;
}

export interface KeepaOffer {
  offerId: number;
  sellerId: string;
  offerCSV: number[] | null;
  condition: number;
  conditionComment: string | null;
  isPrime: boolean;
  isFBA: boolean;
  isMAP: boolean;
  isShippable: boolean;
  isAddonItem: boolean;
  isPreorder: boolean;
  isWarehouseDeal: boolean;
  isScam: boolean;
  lastSeen: number;
  sellerName: string | null;
}

export interface TokenStatus {
  timestamp: number;
  tokensLeft: number;
  refillIn: number;
  refillRate: number;
}
