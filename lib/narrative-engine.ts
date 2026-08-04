import type {
  Narrative,
  NarrativeStatus,
  NarrativeToken,
  Saturation,
} from "./types";

type InferredNarrative = {
  id: string;
  name: string;
  category: string;
  icon: string;
  keywords: string[];
};

type Rule = InferredNarrative & {
  patterns: RegExp[];
  requires?: RegExp[];
};

const RULES: Rule[] = [
  {
    id: "ai-animals",
    name: "AI Animals",
    category: "Animals",
    icon: "🐾",
    keywords: ["ai", "animals", "characters"],
    patterns: [
      /\b(cat|dog|doge|duck|frog|pepe|capy|capybara|panda|bear|monkey|ape|penguin|raccoon|hamster|goat|chicken|bird|shark|whale)\b/i,
    ],
    requires: [/\b(ai|artificial intelligence|neural|robot|gpt|agent)\b/i],
  },
  {
    id: "capybaras",
    name: "Capybara Wave",
    category: "Animals",
    icon: "🦫",
    keywords: ["capybara", "capy", "animals"],
    patterns: [/\b(capybara|capy)\b/i],
  },
  {
    id: "ducks-with-jobs",
    name: "Ducks With Jobs",
    category: "Animals",
    icon: "🦆",
    keywords: ["ducks", "jobs", "office"],
    patterns: [/\b(duck|ducks|quack)\b/i],
    requires: [/\b(job|jobs|work|worker|office|boss|ceo|accountant|driver|manager|employee)\b/i],
  },
  {
    id: "ducks",
    name: "Duck Characters",
    category: "Animals",
    icon: "🦆",
    keywords: ["ducks", "quack", "animals"],
    patterns: [/\b(duck|ducks|quack)\b/i],
  },
  {
    id: "cats",
    name: "Cat Characters",
    category: "Animals",
    icon: "🐈",
    keywords: ["cats", "feline", "animals"],
    patterns: [/\b(cat|cats|kitty|kitten|feline|meow)\b/i],
  },
  {
    id: "dogs",
    name: "Dog Characters",
    category: "Animals",
    icon: "🐕",
    keywords: ["dogs", "doge", "animals"],
    patterns: [/\b(dog|dogs|doge|shiba|inu|puppy|pup|woof)\b/i],
  },
  {
    id: "frogs",
    name: "Frog Characters",
    category: "Animals",
    icon: "🐸",
    keywords: ["frogs", "pepe", "animals"],
    patterns: [/\b(frog|frogs|pepe|toad)\b/i],
  },
  {
    id: "animal-characters",
    name: "Animal Characters",
    category: "Animals",
    icon: "🐾",
    keywords: ["animals", "characters", "mascots"],
    patterns: [
      /\b(panda|bear|monkey|ape|penguin|raccoon|hamster|goat|chicken|bird|shark|whale|horse|cow|pig|rabbit|bunny|fox|wolf|lion|tiger|sloth|otter|seal)\b/i,
    ],
  },
  {
    id: "ai-agents",
    name: "AI Agents",
    category: "AI",
    icon: "🤖",
    keywords: ["ai", "agents", "automation"],
    patterns: [/\b(ai|artificial intelligence|neural|robot|gpt|agent|agents|autonomous)\b/i],
  },
  {
    id: "political-memes",
    name: "Political Memes",
    category: "Politics",
    icon: "🗳️",
    keywords: ["politics", "election", "leaders"],
    patterns: [
      /\b(trump|maga|president|election|vote|senate|congress|politic|government|mayor|governor|democrat|republican)\b/i,
    ],
  },
  {
    id: "gaming-worlds",
    name: "Gaming Worlds",
    category: "Gaming",
    icon: "🎮",
    keywords: ["gaming", "game", "worlds"],
    patterns: [
      /\b(game|gaming|gamer|pixel|npc|quest|loot|minecraft|fortnite|roblox|pokemon|arcade|rpg|console)\b/i,
    ],
  },
  {
    id: "retro-internet",
    name: "Retro Internet",
    category: "Culture",
    icon: "💾",
    keywords: ["retro", "internet", "nostalgia"],
    patterns: [
      /\b(retro|dial.?up|windows 95|windows 98|geocities|myspace|pixel cursor|old web|early web|vaporwave|y2k)\b/i,
    ],
  },
  {
    id: "food-characters",
    name: "Food Characters",
    category: "Food",
    icon: "🍜",
    keywords: ["food", "characters", "memes"],
    patterns: [
      /\b(pizza|burger|ramen|taco|banana|pickle|bread|toast|coffee|donut|cake|cookie|sushi|chicken nugget|food)\b/i,
    ],
  },
  {
    id: "space-characters",
    name: "Space Characters",
    category: "Culture",
    icon: "🚀",
    keywords: ["space", "alien", "cosmic"],
    patterns: [/\b(space|alien|moon|mars|cosmic|galaxy|planet|astronaut|ufo)\b/i],
  },
  {
    id: "finance-culture",
    name: "Crypto Culture",
    category: "Crypto",
    icon: "📈",
    keywords: ["crypto", "trading", "finance"],
    patterns: [
      /\b(trader|trading|bull|bear market|hodl|diamond hands|whale|degen|pump|moonshot|millionaire|billionaire)\b/i,
    ],
  },
];

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "of",
  "for",
  "to",
  "in",
  "on",
  "coin",
  "token",
  "official",
  "meme",
  "memecoin",
  "community",
  "project",
  "sol",
  "solana",
  "base",
  "eth",
  "ethereum",
  "new",
  "real",
  "baby",
  "mini",
  "king",
  "world",
  "club",
  "cto",
  "pump",
  "fun",
  "inu",
]);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54);
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function inferNarrative(token: NarrativeToken): InferredNarrative {
  const text = `${token.name} ${token.symbol} ${token.description}`.trim();

  for (const rule of RULES) {
    const matchesPattern = rule.patterns.some((pattern) => pattern.test(text));
    const matchesRequirements =
      !rule.requires || rule.requires.every((pattern) => pattern.test(text));

    if (matchesPattern && matchesRequirements) {
      return {
        id: rule.id,
        name: rule.name,
        category: rule.category,
        icon: rule.icon,
        keywords: rule.keywords,
      };
    }
  }

  const candidate = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .find((word) => word.length >= 4 && !STOP_WORDS.has(word));

  if (candidate) {
    return {
      id: `wave-${slugify(candidate)}`,
      name: `${titleCase(candidate)} Wave`,
      category: "Internet Culture",
      icon: "✦",
      keywords: [candidate, "emerging", "internet"],
    };
  }

  return {
    id: "new-internet-characters",
    name: "New Internet Characters",
    category: "Internet Culture",
    icon: "✦",
    keywords: ["characters", "internet", "emerging"],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

function logScore(value: number, ceilingPower: number): number {
  return clamp((Math.log10(Math.max(0, value) + 1) / ceilingPower) * 100, 0, 100);
}

function weightedAverage(
  values: Array<{ value: number; weight: number }>,
): number {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) {
    return values.length
      ? values.reduce((sum, item) => sum + item.value, 0) / values.length
      : 0;
  }

  return (
    values.reduce((sum, item) => sum + item.value * item.weight, 0) /
    totalWeight
  );
}

function getStatus(score: number): NarrativeStatus {
  if (score >= 78) return "Exploding";
  if (score >= 65) return "Emerging";
  if (score >= 50) return "Rising";
  return "Early";
}

function getSaturation(tokenCount: number): Saturation {
  if (tokenCount <= 1) return "Very low";
  if (tokenCount <= 3) return "Low";
  if (tokenCount <= 6) return "Medium";
  return "High";
}

function getConfidence(
  tokenCount: number,
  volume24h: number,
  liquidityUsd: number,
  transactions24h: number,
): "Low" | "Medium" | "High" {
  const confirmations = [
    tokenCount >= 3,
    volume24h >= 100_000,
    liquidityUsd >= 50_000,
    transactions24h >= 1_000,
  ].filter(Boolean).length;

  if (confirmations >= 3) return "High";
  if (confirmations >= 2) return "Medium";
  return "Low";
}

function makeDescription(
  name: string,
  category: string,
  tokenCount: number,
  chainCount: number,
  growth24h: number,
): string {
  const direction =
    growth24h >= 100
      ? "accelerating quickly"
      : growth24h >= 40
        ? "building momentum"
        : growth24h >= 0
          ? "showing early activity"
          : "cooling after recent activity";

  const coverage =
    chainCount > 1
      ? `across ${chainCount} chains`
      : "inside the latest launch feed";

  return `${name} is ${direction} ${coverage}, with ${tokenCount} related token${tokenCount === 1 ? "" : "s"} grouped from live ${category.toLowerCase()} signals.`;
}

export function buildNarratives(tokens: NarrativeToken[]): Narrative[] {
  const groups = new Map<
    string,
    { inferred: InferredNarrative; tokens: NarrativeToken[] }
  >();

  for (const token of tokens) {
    const inferred = inferNarrative(token);
    const existing = groups.get(inferred.id);

    if (existing) {
      existing.tokens.push(token);
    } else {
      groups.set(inferred.id, { inferred, tokens: [token] });
    }
  }

  const narratives: Narrative[] = [];

  for (const [id, group] of groups.entries()) {
    const sortedTokens = [...group.tokens].sort(
      (a, b) => b.volume24h - a.volume24h,
    );
    const volume24h = sortedTokens.reduce((sum, token) => sum + token.volume24h, 0);
    const liquidityUsd = sortedTokens.reduce(
      (sum, token) => sum + token.liquidityUsd,
      0,
    );
    const marketCap = sortedTokens.reduce((sum, token) => sum + token.marketCap, 0);
    const transactions24h = sortedTokens.reduce(
      (sum, token) => sum + token.buys24h + token.sells24h,
      0,
    );
    const growth24h = weightedAverage(
      sortedTokens.map((token) => ({
        value: clamp(token.priceChange24h, -95, 500),
        weight: Math.max(token.volume24h, 1),
      })),
    );
    const chains = [...new Set(sortedTokens.map((token) => token.chainId))];
    const dexes = [...new Set(sortedTokens.map((token) => token.dexId))];
    const promotedTokenCount = sortedTokens.filter(
      (token) => token.paidPromotion,
    ).length;

    const averageRecency = weightedAverage(
      sortedTokens.map((token) => {
        const age = token.ageHours ?? 24 * 30;
        return {
          value: clamp(100 - (age / (24 * 14)) * 100, 0, 100),
          weight: Math.max(token.volume24h, 1),
        };
      }),
    );

    const growthScore = normalize(growth24h, -20, 220);
    const activityScore = logScore(transactions24h, 4.2);
    const volumeScore = logScore(volume24h, 7);
    const liquidityScore = logScore(liquidityUsd, 6.5);
    const diversityScore = clamp(
      Math.min(sortedTokens.length / 6, 1) * 55 +
        Math.min(chains.length / 3, 1) * 25 +
        Math.min(dexes.length / 3, 1) * 20,
      0,
      100,
    );

    // Paid boosts and ads are deliberately not included in this score.
    const rawScore =
      growthScore * 0.29 +
      activityScore * 0.21 +
      volumeScore * 0.18 +
      liquidityScore * 0.12 +
      averageRecency * 0.11 +
      diversityScore * 0.09;

    const score = Math.round(clamp(rawScore, 1, 99));
    const confidence = getConfidence(
      sortedTokens.length,
      volume24h,
      liquidityUsd,
      transactions24h,
    );

    narratives.push({
      id,
      name: group.inferred.name,
      category: group.inferred.category,
      icon: group.inferred.icon,
      score,
      status: getStatus(score),
      growth24h: Number(growth24h.toFixed(1)),
      volume24h,
      liquidityUsd,
      marketCap,
      transactions24h,
      tokenCount: sortedTokens.length,
      chainCount: chains.length,
      dexCount: dexes.length,
      saturation: getSaturation(sortedTokens.length),
      confidence,
      promotedTokenCount,
      description: makeDescription(
        group.inferred.name,
        group.inferred.category,
        sortedTokens.length,
        chains.length,
        growth24h,
      ),
      keywords: group.inferred.keywords,
      chains,
      tokens: sortedTokens,
    });
  }

  return narratives
    .sort((a, b) => b.score - a.score || b.volume24h - a.volume24h)
    .slice(0, 40);
}
