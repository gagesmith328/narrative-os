export type NarrativeStatus = "Exploding" | "Emerging" | "Rising" | "Early";
export type Saturation = "Very low" | "Low" | "Medium" | "High";

export type NarrativeToken = {
  id: string;
  chainId: string;
  dexId: string;
  address: string;
  pairAddress: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string | null;
  url: string;
  priceUsd: number;
  marketCap: number;
  liquidityUsd: number;
  volume24h: number;
  priceChange24h: number;
  buys24h: number;
  sells24h: number;
  pairCreatedAt: number | null;
  ageHours: number | null;
  activeBoosts: number;
  boostAmount: number;
  hasAd: boolean;
  paidPromotion: boolean;
  websites: string[];
  socials: Array<{ platform: string; handle: string }>;
};

export type Narrative = {
  id: string;
  name: string;
  category: string;
  icon: string;
  score: number;
  status: NarrativeStatus;
  growth24h: number;
  volume24h: number;
  liquidityUsd: number;
  marketCap: number;
  transactions24h: number;
  tokenCount: number;
  chainCount: number;
  dexCount: number;
  saturation: Saturation;
  confidence: "Low" | "Medium" | "High";
  promotedTokenCount: number;
  description: string;
  keywords: string[];
  chains: string[];
  tokens: NarrativeToken[];
};

export type NarrativeApiResponse = {
  source: "live" | "demo";
  updatedAt: string;
  refreshSeconds: number;
  tokenCount: number;
  narrativeCount: number;
  promotedTokenCount: number;
  narratives: Narrative[];
  warning?: string;
};
