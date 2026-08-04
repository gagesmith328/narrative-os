# NarrativeOS MVP

A complete Next.js App Router MVP for a live memecoin narrative dashboard.

## What is included

- Live DEX Screener token profiles, boosts, ads, and pair activity
- Automatic narrative grouping from token names and descriptions
- Organic narrative scoring using momentum, transactions, volume, liquidity, recency, and diversity
- Paid boost/ad labels that do not increase the organic score
- Search, category, chain, momentum, sorting, and organic-only filters
- Responsive radar dashboard and narrative detail drawer
- Local natural-language query interface that applies dashboard filters
- Automatic refresh every 30 seconds
- Built-in demo fallback when the live API is unavailable
- Local beta form placeholder

## Run it

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Put it into your existing project

Copy these folders/files into your existing `narrative-os` folder:

- `app/`
- `components/`
- `lib/`
- `package.json`
- `tsconfig.json`
- `next.config.ts`

Then run:

```bash
npm install
npm run dev
```

## Important production upgrades

1. Store historical snapshots in a database so growth is based on your own time series, not only DEX Screener's current 24-hour fields.
2. Add embeddings or an LLM for more flexible narrative clustering.
3. Add authentication, saved searches, alerts, and a real waitlist provider.
4. Add risk signals such as holder concentration, mint/freeze authority, liquidity lock status, and deployer-wallet history using separate data providers.
5. Review the DEX Screener API terms before commercial launch.

The dashboard is informational and is not financial advice.
