import { NextResponse } from "next/server";
import { demoResponse } from "@/lib/demo-data";
import { buildNarratives } from "@/lib/narrative-engine";
import type { NarrativeApiResponse, NarrativeToken } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_ROOT = "https://api.dexscreener.com";
const REFRESH_SECONDS = 30;
const MAX_TOKENS = 90;

type DexProfile = {
  url?: string;
  chainId?: string;
  tokenAddress?: string;
  icon?: string | null;
  header?: string | null;
  description?: string | null;
  links?: Array<{ type?: string; label?: string; url?: string }> | null;
};

type DexBoost = DexProfile & {
  amount?: number;
  totalAmount?: number;
};

type DexAd = {
  url?: string;
  chainId?: string;
  tokenAddress?: string;
  date?: string;
  type?: string;
  durationHours?: number | null;
  impressions?: number | null;
};

type DexPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  quoteToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string | null;
  txns?: Record<string, { buys?: number; sells?: number }>;
  volume?: Record<string, number>;
  priceChange?: Record<string, number> | null;
  liquidity?: { usd?: number; base?: number; quote?: number } | null;
  fdv?: number | null;
  marketCap?: number | null;
  pairCreatedAt?: number | null;
  info?: {
    imageUrl?: string;
    websites?: Array<{ url?: string }>;
    socials?: Array<{ platform?: string; handle?: string }>;
  };
  boosts?: { active?: number } | null;
};

type AddressSeed = {
  chainId: string;
  address: string;
  profile?: DexProfile;
  boost?: DexBoost;
  ads: DexAd[];
};

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function numberValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function keyFor(chainId: string, address: string): string {
  return `${chainId.toLowerCase()}:${address.toLowerCase()}`;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: REFRESH_SECONDS },
    signal: AbortSignal.timeout(9_000),
  });

  if (!response.ok) {
    throw new Error(`DEX Screener returned ${response.status} for ${path}`);
  }

  return (await response.json()) as T;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function pickBestPair(pairs: DexPair[]): DexPair | null {
  if (!pairs.length) return null;

  return [...pairs].sort((a, b) => {
    const liquidityDifference =
      numberValue(b.liquidity?.usd) - numberValue(a.liquidity?.usd);
    if (liquidityDifference !== 0) return liquidityDifference;
    return numberValue(b.volume?.h24) - numberValue(a.volume?.h24);
  })[0];
}

function normalizeToken(seed: AddressSeed, pair: DexPair): NarrativeToken | null {
  const baseAddress = pair.baseToken?.address ?? seed.address;
  if (!baseAddress) return null;

  const createdAt = pair.pairCreatedAt ?? null;
  const ageHours = createdAt
    ? Math.max(0, (Date.now() - createdAt) / (1000 * 60 * 60))
    : null;
  const activeBoosts = numberValue(pair.boosts?.active);
  const boostAmount = Math.max(
    numberValue(seed.boost?.amount),
    numberValue(seed.boost?.totalAmount),
  );
  const hasAd = seed.ads.length > 0;
  const websites = (pair.info?.websites ?? [])
    .map((website) => website.url)
    .filter((url): url is string => Boolean(url));
  const socials = (pair.info?.socials ?? [])
    .filter(
      (social): social is { platform: string; handle: string } =>
        Boolean(social.platform && social.handle),
    )
    .map((social) => ({
      platform: social.platform,
      handle: social.handle,
    }));

  return {
    id: keyFor(seed.chainId, baseAddress),
    chainId: pair.chainId ?? seed.chainId,
    dexId: pair.dexId ?? "unknown",
    address: baseAddress,
    pairAddress: pair.pairAddress ?? "",
    name: pair.baseToken?.name ?? pair.baseToken?.symbol ?? "Unknown token",
    symbol: pair.baseToken?.symbol ?? "?",
    description: seed.profile?.description ?? seed.boost?.description ?? "",
    imageUrl:
      pair.info?.imageUrl ?? seed.profile?.icon ?? seed.boost?.icon ?? null,
    url: pair.url ?? seed.profile?.url ?? seed.boost?.url ?? "https://dexscreener.com",
    priceUsd: numberValue(pair.priceUsd),
    marketCap: numberValue(pair.marketCap ?? pair.fdv),
    liquidityUsd: numberValue(pair.liquidity?.usd),
    volume24h: numberValue(pair.volume?.h24),
    priceChange24h: numberValue(pair.priceChange?.h24),
    buys24h: numberValue(pair.txns?.h24?.buys),
    sells24h: numberValue(pair.txns?.h24?.sells),
    pairCreatedAt: createdAt,
    ageHours,
    activeBoosts,
    boostAmount,
    hasAd,
    paidPromotion: activeBoosts > 0 || boostAmount > 0 || hasAd,
    websites,
    socials,
  };
}

async function getLiveResponse(): Promise<NarrativeApiResponse> {
  const [profilePayload, boostPayload, adPayload] = await Promise.all([
    fetchJson<DexProfile[] | DexProfile>("/token-profiles/latest/v1"),
    fetchJson<DexBoost[] | DexBoost>("/token-boosts/latest/v1"),
    fetchJson<DexAd[] | DexAd>("/ads/latest/v1"),
  ]);

  const profiles = toArray(profilePayload);
  const boosts = toArray(boostPayload);
  const ads = toArray(adPayload);
  const seedMap = new Map<string, AddressSeed>();

  for (const profile of profiles) {
    if (!profile.chainId || !profile.tokenAddress) continue;
    const key = keyFor(profile.chainId, profile.tokenAddress);
    seedMap.set(key, {
      chainId: profile.chainId,
      address: profile.tokenAddress,
      profile,
      ads: [],
    });
  }

  for (const boost of boosts) {
    if (!boost.chainId || !boost.tokenAddress) continue;
    const key = keyFor(boost.chainId, boost.tokenAddress);
    const existing = seedMap.get(key);
    seedMap.set(key, {
      chainId: boost.chainId,
      address: boost.tokenAddress,
      profile: existing?.profile,
      boost,
      ads: existing?.ads ?? [],
    });
  }

  for (const ad of ads) {
    if (!ad.chainId || !ad.tokenAddress) continue;
    const key = keyFor(ad.chainId, ad.tokenAddress);
    const existing = seedMap.get(key);
    seedMap.set(key, {
      chainId: ad.chainId,
      address: ad.tokenAddress,
      profile: existing?.profile,
      boost: existing?.boost,
      ads: [...(existing?.ads ?? []), ad],
    });
  }

  const seeds = [...seedMap.values()].slice(0, MAX_TOKENS);
  const seedsByChain = new Map<string, AddressSeed[]>();

  for (const seed of seeds) {
    const list = seedsByChain.get(seed.chainId) ?? [];
    list.push(seed);
    seedsByChain.set(seed.chainId, list);
  }

  const pairRequests: Promise<DexPair[]>[] = [];

  for (const [chainId, chainSeeds] of seedsByChain.entries()) {
    for (const batch of chunk(chainSeeds, 30)) {
      const addresses = batch.map((seed) => seed.address).join(",");
      pairRequests.push(
        fetchJson<DexPair[]>(
          `/tokens/v1/${encodeURIComponent(chainId)}/${addresses}`,
        ).catch(() => []),
      );
    }
  }

  const pairResults = (await Promise.all(pairRequests)).flat();
  const pairsByToken = new Map<string, DexPair[]>();

  for (const pair of pairResults) {
    const chainId = pair.chainId;
    const address = pair.baseToken?.address;
    if (!chainId || !address) continue;
    const key = keyFor(chainId, address);
    const list = pairsByToken.get(key) ?? [];
    list.push(pair);
    pairsByToken.set(key, list);
  }

  const tokens: NarrativeToken[] = [];

  for (const seed of seeds) {
    const pair = pickBestPair(pairsByToken.get(keyFor(seed.chainId, seed.address)) ?? []);
    if (!pair) continue;
    const normalized = normalizeToken(seed, pair);
    if (!normalized) continue;

    // Remove empty/dead pools that add noise but keep very new pools with activity.
    const activity = normalized.buys24h + normalized.sells24h;
    if (
      normalized.liquidityUsd <= 0 &&
      normalized.volume24h <= 0 &&
      activity <= 0
    ) {
      continue;
    }

    tokens.push(normalized);
  }

  const narratives = buildNarratives(tokens);

  if (!tokens.length || !narratives.length) {
    throw new Error("DEX Screener returned no usable token pairs.");
  }

  return {
    source: "live",
    updatedAt: new Date().toISOString(),
    refreshSeconds: REFRESH_SECONDS,
    tokenCount: tokens.length,
    narrativeCount: narratives.length,
    promotedTokenCount: tokens.filter((token) => token.paidPromotion).length,
    narratives,
  };
}

export async function GET() {
  try {
    const payload = await getLiveResponse();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${REFRESH_SECONDS}, stale-while-revalidate=60`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown live-data error";
    const fallback: NarrativeApiResponse = {
      ...demoResponse,
      updatedAt: new Date().toISOString(),
      warning: `Live feed fallback: ${message}`,
    };

    return NextResponse.json(fallback, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
