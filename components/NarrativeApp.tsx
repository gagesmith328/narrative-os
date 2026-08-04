"use client";

import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  Narrative,
  NarrativeApiResponse,
  NarrativeStatus,
  NarrativeToken,
} from "@/lib/types";

type SortMode = "score" | "growth" | "volume" | "newest";

const STATUS_ORDER: Record<NarrativeStatus, number> = {
  Exploding: 4,
  Emerging: 3,
  Rising: 2,
  Early: 1,
};

function money(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value > 0) return `$${value.toPrecision(3)}`;
  return "$0";
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function signedPercent(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(value >= 100 ? 0 : 1)}%`;
}

function relativeAge(hours: number | null): string {
  if (hours === null) return "Unknown";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  if (hours < 24 * 30) return `${Math.round(hours / 24)}d`;
  return `${Math.round(hours / (24 * 30))}mo`;
}

function chainName(chainId: string): string {
  const names: Record<string, string> = {
    solana: "Solana",
    ethereum: "Ethereum",
    base: "Base",
    bsc: "BNB Chain",
    arbitrum: "Arbitrum",
    polygon: "Polygon",
    avalanche: "Avalanche",
  };
  return names[chainId.toLowerCase()] ?? chainId;
}

function Icon({ children }: { children?: ReactNode }) {
  return <span className="icon-box">{children}</span>;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6v6h-6" />
      <path d="M4 18v-6h6" />
      <path d="M6.5 8.5A7 7 0 0 1 18 6l2 2" />
      <path d="M17.5 15.5A7 7 0 0 1 6 18l-2-2" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 5h5v5" />
      <path d="m10 14 9-9" />
      <path d="M19 13v6H5V5h6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function NarrativeCard({
  narrative,
  onOpen,
}: {
  narrative: Narrative;
  onOpen: (narrative: Narrative) => void;
}) {
  const organicTokenCount = narrative.tokenCount - narrative.promotedTokenCount;

  return (
    <article className="narrative-card">
      <div className="card-topline">
        <div className="narrative-icon" aria-hidden="true">
          {narrative.icon}
        </div>
        <div
          className="score-ring"
          style={{
            background: `conic-gradient(var(--green) ${narrative.score * 3.6}deg, rgba(255,255,255,.07) 0deg)`,
          }}
          aria-label={`Radar score ${narrative.score} out of 100`}
        >
          <div>
            <strong>{narrative.score}</strong>
            <span>/100</span>
          </div>
        </div>
      </div>

      <div className="chip-row">
        <span className={`status-chip status-${narrative.status.toLowerCase()}`}>
          <i /> {narrative.status}
        </span>
        <span className="category-chip">{narrative.category}</span>
        {narrative.promotedTokenCount > 0 && (
          <span className="paid-chip">Paid signals labeled</span>
        )}
      </div>

      <h3>{narrative.name}</h3>
      <p className="card-description">{narrative.description}</p>

      <div className="score-track" aria-hidden="true">
        <span style={{ width: `${narrative.score}%` }} />
      </div>

      <div className="card-metrics">
        <div>
          <span>24h growth</span>
          <strong className={narrative.growth24h >= 0 ? "positive" : "negative"}>
            {signedPercent(narrative.growth24h)}
          </strong>
        </div>
        <div>
          <span>24h volume</span>
          <strong>{money(narrative.volume24h)}</strong>
        </div>
        <div>
          <span>Tokens</span>
          <strong>{narrative.tokenCount}</strong>
        </div>
      </div>

      <div className="card-footer">
        <div className="organic-count">
          <span>{organicTokenCount} organic</span>
          <span>{narrative.chainCount} chain{narrative.chainCount === 1 ? "" : "s"}</span>
        </div>
        <button className="text-button" onClick={() => onOpen(narrative)}>
          View signals <ArrowIcon />
        </button>
      </div>
    </article>
  );
}

function TokenRow({ token }: { token: NarrativeToken }) {
  const activity = token.buys24h + token.sells24h;

  return (
    <div className="token-row">
      <div className="token-main">
        <div className="token-avatar">
          {token.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={token.imageUrl} alt="" />
          ) : (
            <span>{token.symbol.slice(0, 2)}</span>
          )}
        </div>
        <div className="token-title">
          <div>
            <strong>{token.name}</strong>
            <span>${token.symbol}</span>
          </div>
          <div className="token-tags">
            <span>{chainName(token.chainId)}</span>
            <span>{token.dexId}</span>
            <span>{relativeAge(token.ageHours)} old</span>
            {token.paidPromotion && <b>Paid promotion</b>}
          </div>
        </div>
      </div>

      <div className="token-stat">
        <span>Market cap</span>
        <strong>{money(token.marketCap)}</strong>
      </div>
      <div className="token-stat">
        <span>Liquidity</span>
        <strong>{money(token.liquidityUsd)}</strong>
      </div>
      <div className="token-stat">
        <span>24h volume</span>
        <strong>{money(token.volume24h)}</strong>
      </div>
      <div className="token-stat">
        <span>Transactions</span>
        <strong>{compactNumber(activity)}</strong>
      </div>
      <div className="token-stat">
        <span>24h change</span>
        <strong className={token.priceChange24h >= 0 ? "positive" : "negative"}>
          {signedPercent(token.priceChange24h)}
        </strong>
      </div>

      <a
        className="external-button"
        href={token.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${token.name} on DEX Screener`}
      >
        <ExternalIcon />
      </a>
    </div>
  );
}

function DetailDrawer({
  narrative,
  onClose,
}: {
  narrative: Narrative;
  onClose: () => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("drawer-open");
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("drawer-open");
    };
  }, [onClose]);

  return (
    <div className="drawer-backdrop" onMouseDown={onClose} role="presentation">
      <aside
        className="detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <div className="drawer-heading">
            <div className="narrative-icon large">{narrative.icon}</div>
            <div>
              <div className="chip-row">
                <span className={`status-chip status-${narrative.status.toLowerCase()}`}>
                  <i /> {narrative.status}
                </span>
                <span className="category-chip">{narrative.category}</span>
              </div>
              <h2 id="drawer-title">{narrative.name}</h2>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close details">
            <CloseIcon />
          </button>
        </div>

        <p className="drawer-description">{narrative.description}</p>

        <div className="drawer-score-panel">
          <div>
            <span>Organic radar score</span>
            <strong>{narrative.score}<small>/100</small></strong>
          </div>
          <div className="drawer-score-track">
            <span style={{ width: `${narrative.score}%` }} />
          </div>
          <p>
            Boosts and ads are labeled below but are not used in the ranking score.
          </p>
        </div>

        <div className="drawer-grid">
          <div><span>24h growth</span><strong className={narrative.growth24h >= 0 ? "positive" : "negative"}>{signedPercent(narrative.growth24h)}</strong></div>
          <div><span>24h volume</span><strong>{money(narrative.volume24h)}</strong></div>
          <div><span>Liquidity</span><strong>{money(narrative.liquidityUsd)}</strong></div>
          <div><span>Transactions</span><strong>{compactNumber(narrative.transactions24h)}</strong></div>
          <div><span>Saturation</span><strong>{narrative.saturation}</strong></div>
          <div><span>Confidence</span><strong>{narrative.confidence}</strong></div>
        </div>

        <div className="drawer-section-head">
          <div>
            <span>Grouped tokens</span>
            <h3>{narrative.tokenCount} live signals</h3>
          </div>
          {narrative.promotedTokenCount > 0 && (
            <div className="promotion-note">
              {narrative.promotedTokenCount} paid signal{narrative.promotedTokenCount === 1 ? "" : "s"}
            </div>
          )}
        </div>

        <div className="token-list">
          {narrative.tokens.map((token) => (
            <TokenRow key={token.id} token={token} />
          ))}
        </div>
      </aside>
    </div>
  );
}

export default function NarrativeApp() {
  const [data, setData] = useState<NarrativeApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [chain, setChain] = useState("All");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState<SortMode>("score");
  const [organicOnly, setOrganicOnly] = useState(false);
  const [selected, setSelected] = useState<Narrative | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiMessage, setAiMessage] = useState("Try: animal narratives with low saturation");
  const [email, setEmail] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  const loadData = useCallback(async (manual = false) => {
    try {
      if (manual) setRefreshing(true);
      const response = await fetch("/api/narratives", { cache: "no-store" });
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      const payload = (await response.json()) as NarrativeApiResponse;
      setData(payload);
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load narrative data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const interval = window.setInterval(() => {
      void loadData();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [loadData]);

  const narratives = data?.narratives ?? [];

  const categories = useMemo(
    () => ["All", ...[...new Set(narratives.map((item) => item.category))].sort()],
    [narratives],
  );

  const chains = useMemo(
    () => ["All", ...[...new Set(narratives.flatMap((item) => item.chains))].sort()],
    [narratives],
  );

  const filteredNarratives = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const result = narratives.filter((narrative) => {
      const searchable = [
        narrative.name,
        narrative.category,
        narrative.description,
        ...narrative.keywords,
        ...narrative.tokens.flatMap((token) => [token.name, token.symbol]),
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedSearch || searchable.includes(normalizedSearch)) &&
        (category === "All" || narrative.category === category) &&
        (chain === "All" || narrative.chains.includes(chain)) &&
        (status === "All" || narrative.status === status) &&
        (!organicOnly || narrative.promotedTokenCount === 0)
      );
    });

    return result.sort((a, b) => {
      if (sort === "growth") return b.growth24h - a.growth24h;
      if (sort === "volume") return b.volume24h - a.volume24h;
      if (sort === "newest") {
        const aAge = Math.min(...a.tokens.map((token) => token.ageHours ?? Infinity));
        const bAge = Math.min(...b.tokens.map((token) => token.ageHours ?? Infinity));
        return aAge - bAge;
      }
      return b.score - a.score || STATUS_ORDER[b.status] - STATUS_ORDER[a.status];
    });
  }, [narratives, search, category, chain, status, sort, organicOnly]);

  const dashboardStats = useMemo(() => {
    const totalVolume = narratives.reduce((sum, item) => sum + item.volume24h, 0);
    const totalTransactions = narratives.reduce(
      (sum, item) => sum + item.transactions24h,
      0,
    );
    const categoryScores = new Map<string, number>();
    for (const narrative of narratives) {
      categoryScores.set(
        narrative.category,
        (categoryScores.get(narrative.category) ?? 0) + narrative.score,
      );
    }
    const fastestCategory = [...categoryScores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    return [
      {
        label: "Narratives tracked",
        value: data ? compactNumber(data.narrativeCount) : "—",
        note: `${data?.tokenCount ?? 0} grouped tokens`,
      },
      {
        label: "24h volume scanned",
        value: data ? money(totalVolume) : "—",
        note: `${compactNumber(totalTransactions)} transactions`,
      },
      {
        label: "Fastest category",
        value: fastestCategory,
        note: "By organic radar score",
      },
      {
        label: "Paid signals labeled",
        value: data ? compactNumber(data.promotedTokenCount) : "—",
        note: "Excluded from scoring",
      },
    ];
  }, [data, narratives]);

  const topNarratives = narratives.slice(0, 3);
  const topNarrative = topNarratives[0];

  const resetFilters = () => {
    setSearch("");
    setCategory("All");
    setChain("All");
    setStatus("All");
    setSort("score");
    setOrganicOnly(false);
  };

  const handleAiSubmit = (event: FormEvent) => {
    event.preventDefault();
    const query = aiQuery.trim().toLowerCase();
    if (!query) return;

    let applied = 0;
    const matchingCategory = categories.find(
      (item) => item !== "All" && query.includes(item.toLowerCase()),
    );
    const matchingChain = chains.find(
      (item) => item !== "All" && query.includes(item.toLowerCase()),
    );
    const matchingStatus = (["Exploding", "Emerging", "Rising", "Early"] as const).find(
      (item) => query.includes(item.toLowerCase()),
    );

    if (matchingCategory) {
      setCategory(matchingCategory);
      applied += 1;
    }
    if (matchingChain) {
      setChain(matchingChain);
      applied += 1;
    }
    if (matchingStatus) {
      setStatus(matchingStatus);
      applied += 1;
    }
    if (query.includes("organic") || query.includes("no boost") || query.includes("without ads")) {
      setOrganicOnly(true);
      applied += 1;
    }
    if (query.includes("fastest") || query.includes("growth")) {
      setSort("growth");
      applied += 1;
    } else if (query.includes("volume")) {
      setSort("volume");
      applied += 1;
    } else if (query.includes("new") || query.includes("fresh")) {
      setSort("newest");
      applied += 1;
    }

    const meaningfulTerms = query
      .replace(/\b(show|find|me|the|with|without|and|or|that|are|is|on|in|by|only|narratives?|tokens?|fastest|highest|lowest|organic|boosts?|ads?|growth|volume|newest|fresh|emerging|exploding|rising|early)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (meaningfulTerms && !matchingCategory && !matchingChain) {
      setSearch(meaningfulTerms);
      applied += 1;
    }

    setAiMessage(
      applied > 0
        ? `Applied ${applied} dashboard filter${applied === 1 ? "" : "s"}. Results updated below.`
        : "I could not identify a filter. Try a category, chain, growth, volume, newest, or organic-only request.",
    );
    document.querySelector("#narratives")?.scrollIntoView({ behavior: "smooth" });
  };

  const applyExample = (query: string) => {
    setAiQuery(query);
    setAiMessage("Press Ask NarrativeOS to apply this search.");
  };

  const handleWaitlist = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setEmailMessage("Enter a valid email address.");
      return;
    }
    window.localStorage.setItem("narrativeos-beta-email", trimmed);
    setEmailMessage("You are on the local beta list. Connect this form to your email provider before launch.");
    setEmail("");
  };

  return (
    <main id="top" className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <header className="topbar">
        <div className="container nav-inner">
          <a className="brand" href="#top" aria-label="NarrativeOS home">
            <span className="brand-mark"><i /><i /><i /></span>
            <span>Narrative<strong>OS</strong></span>
          </a>

          <nav className={mobileMenu ? "nav-links open" : "nav-links"}>
            <a href="#radar" onClick={() => setMobileMenu(false)}>Radar</a>
            <a href="#narratives" onClick={() => setMobileMenu(false)}>Narratives</a>
            <a href="#ai" onClick={() => setMobileMenu(false)}>Search</a>
            <a href="#how" onClick={() => setMobileMenu(false)}>How it works</a>
          </nav>

          <div className="nav-actions">
            <div className={`live-badge ${data?.source === "demo" ? "demo" : ""}`}>
              <span /> {data?.source === "demo" ? "Demo fallback" : "Live feed"}
            </div>
            <a className="primary small" href="#beta">Join beta</a>
            <button className="mobile-menu-button" onClick={() => setMobileMenu((value) => !value)} aria-label="Toggle navigation">
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      <section id="radar" className="hero container">
        <div className="hero-copy">
          <div className="eyebrow"><span /> Live narrative intelligence</div>
          <h1>
            Discover the next internet narrative <em>before everyone else.</em>
          </h1>
          <p>
            NarrativeOS groups new token launches into understandable themes, then scores organic momentum using trading activity, liquidity, recency, and cross-token confirmation.
          </p>
          <div className="hero-buttons">
            <a className="primary" href="#narratives">Open live radar <ArrowIcon /></a>
            <a className="secondary" href="#how">See how it works</a>
          </div>
          <div className="proof-row">
            <span><strong>30s</strong> auto-refresh</span>
            <span><strong>{data?.tokenCount ?? "—"}</strong> live tokens</span>
            <span><strong>0</strong> paid score weight</span>
          </div>
        </div>

        <div className="radar-panel">
          <div className="panel-glow" />
          <div className="radar-orbit">
            <span className="radar-ring ring-one" />
            <span className="radar-ring ring-two" />
            <span className="radar-ring ring-three" />
            <span className="radar-axis horizontal" />
            <span className="radar-axis vertical" />
            <span className="radar-sweep" />
            <span className="radar-dot dot-one" />
            <span className="radar-dot dot-two" />
            <span className="radar-dot dot-three" />
            <div className="radar-center">
              <span>Live scan</span>
              <strong>{data ? compactNumber(data.tokenCount) : "—"}</strong>
              <small>tokens analyzed</small>
            </div>
          </div>

          {topNarratives.map((item, index) => (
            <button
              key={item.id}
              className={`radar-tag tag-${index + 1}`}
              onClick={() => setSelected(item)}
            >
              <span>{item.icon}</span>
              <div><strong>{item.name}</strong><small>{signedPercent(item.growth24h)}</small></div>
            </button>
          ))}

          <div className="radar-meta">
            <span>Top organic score</span>
            <strong>{topNarrative?.score ?? "—"}<small>/100</small></strong>
          </div>
        </div>
      </section>

      <section className="stats-section container">
        <div className="stats-grid">
          {dashboardStats.map((stat) => (
            <div className="stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>{stat.note}</small>
            </div>
          ))}
        </div>
      </section>

      {(data?.warning || error) && (
        <div className="container">
          <div className="warning-banner">
            <strong>{error ? "Connection warning" : "Fallback mode"}</strong>
            <span>{error ?? data?.warning}</span>
            <button onClick={() => void loadData(true)}>Retry</button>
          </div>
        </div>
      )}

      <section id="narratives" className="dashboard-section container">
        <div className="section-heading">
          <div>
            <div className="section-kicker">Live momentum</div>
            <h2>Trending narratives</h2>
            <p>Related tokens are clustered by shared names, descriptions, characters, themes, and cultural keywords.</p>
          </div>
          <button className="refresh-button" onClick={() => void loadData(true)} disabled={refreshing}>
            <RefreshIcon /> {refreshing ? "Refreshing" : "Refresh now"}
          </button>
        </div>

        <div className="filter-panel">
          <label className="search-control">
            <SearchIcon />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search narratives or tokens..." />
          </label>

          <label>
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <label>
            <span>Chain</span>
            <select value={chain} onChange={(event) => setChain(event.target.value)}>
              {chains.map((item) => <option key={item} value={item}>{item === "All" ? "All chains" : chainName(item)}</option>)}
            </select>
          </label>

          <label>
            <span>Momentum</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>All</option>
              <option>Exploding</option>
              <option>Emerging</option>
              <option>Rising</option>
              <option>Early</option>
            </select>
          </label>

          <label>
            <span>Sort by</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
              <option value="score">Radar score</option>
              <option value="growth">24h growth</option>
              <option value="volume">24h volume</option>
              <option value="newest">Newest token</option>
            </select>
          </label>

          <label className="toggle-control">
            <input type="checkbox" checked={organicOnly} onChange={(event) => setOrganicOnly(event.target.checked)} />
            <span className="toggle"><i /></span>
            <b>Organic only</b>
          </label>
        </div>

        <div className="results-bar">
          <span>{filteredNarratives.length} narrative{filteredNarratives.length === 1 ? "" : "s"}</span>
          <span>{data ? `Updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}` : "Loading live data"}</span>
        </div>

        {loading ? (
          <div className="card-grid">
            {[1, 2, 3, 4, 5, 6].map((item) => <div className="skeleton-card" key={item} />)}
          </div>
        ) : filteredNarratives.length ? (
          <div className="card-grid">
            {filteredNarratives.map((narrative) => (
              <NarrativeCard key={narrative.id} narrative={narrative} onOpen={setSelected} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div>⌁</div>
            <h3>No narratives match those filters.</h3>
            <p>Reset the dashboard to return to the complete live feed.</p>
            <button className="secondary" onClick={resetFilters}>Reset filters</button>
          </div>
        )}
      </section>

      <section id="ai" className="ai-section container">
        <div className="ai-panel">
          <div className="ai-copy">
            <div className="section-kicker">Narrative search</div>
            <h2>Ask the dashboard what is emerging.</h2>
            <p>Use plain language to combine category, chain, momentum, sorting, and organic-only filters.</p>
            <div className="example-pills">
              <button onClick={() => applyExample("Show animal narratives growing fastest")}>Fast animal narratives</button>
              <button onClick={() => applyExample("Show organic Solana narratives without ads")}>Organic Solana only</button>
              <button onClick={() => applyExample("Find the newest gaming narratives")}>Newest gaming themes</button>
            </div>
          </div>
          <form className="ai-console" onSubmit={handleAiSubmit}>
            <div className="console-top"><span /><span /><span /><b>NarrativeOS query</b></div>
            <label>
              <textarea value={aiQuery} onChange={(event) => setAiQuery(event.target.value)} placeholder="Show animal narratives growing fastest..." rows={4} />
            </label>
            <button className="primary" type="submit">Ask NarrativeOS <ArrowIcon /></button>
            <p>{aiMessage}</p>
          </form>
        </div>
      </section>

      <section id="how" className="how-section container">
        <div className="section-heading centered">
          <div>
            <div className="section-kicker">How it works</div>
            <h2>From launch noise to a usable narrative.</h2>
            <p>The MVP uses deterministic grouping and transparent scoring. You can replace either layer later with embeddings or a larger AI model.</p>
          </div>
        </div>

        <div className="steps-grid">
          <article><span>01</span><Icon>⌁</Icon><h3>Collect</h3><p>Pull latest profiles, boosted tokens, ads, pair activity, liquidity, volume, and transaction data.</p></article>
          <article><span>02</span><Icon>◌</Icon><h3>Cluster</h3><p>Normalize token names and descriptions, detect shared motifs, and group related launches into one narrative.</p></article>
          <article><span>03</span><Icon>↗</Icon><h3>Score</h3><p>Rank organic momentum from price growth, transactions, volume, liquidity, recency, and group diversity.</p></article>
          <article><span>04</span><Icon>⚡</Icon><h3>Label paid activity</h3><p>Show boosts and advertisements on every affected token without allowing them to increase the organic score.</p></article>
        </div>
      </section>

      <section id="beta" className="beta-section container">
        <div className="beta-panel">
          <div className="beta-orb" />
          <div className="section-kicker">Private beta</div>
          <h2>Find narratives earlier.</h2>
          <p>Save searches, create alerts, compare narratives, and add real AI summaries in the next product phase.</p>
          <form onSubmit={handleWaitlist}>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" aria-label="Email address" />
            <button className="primary" type="submit">Join beta</button>
          </form>
          {emailMessage && <div className="email-message">{emailMessage}</div>}
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <a className="brand" href="#top"><span className="brand-mark"><i /><i /><i /></span><span>Narrative<strong>OS</strong></span></a>
          <p>Signals are informational and are not financial advice.</p>
          <span>© 2026 NarrativeOS</span>
        </div>
      </footer>

      {selected && <DetailDrawer narrative={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
