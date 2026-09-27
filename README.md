# Stock Fundamental Analyzer

A modular single-page stock research app with a Node.js/Express API, PostgreSQL cache, Financial Modeling Prep and Yahoo Finance provider adapters, a deterministic simulated-data fallback, Firebase Authentication, and user-specific watchlists.

## Requirements

- Node.js 22 or newer and npm.
- PostgreSQL 14 or newer for durable SQL caching and watchlists. The server can start without PostgreSQL; stock lookups then use a short-lived process-memory cache, while watchlist endpoints return `503`.
- A Financial Modeling Prep API key is optional. Without it, the server tries Yahoo Finance through AllOrigins. If both providers fail and `DEMO_FALLBACK=true`, it responds with clearly marked simulated data.
- Firebase project credentials are required to enable sign-in and watchlists. No credentials are included in source control.

## Local development

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create `.env` from `.env.example` and set `DATABASE_URL`. For a local PostgreSQL database named `stock_analyzer`, use a connection URL matching your local database account.

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Apply the schema:

   ```sh
   npm run db:schema
   ```

4. Configure market data. Set `FMP_API_KEY` for the primary provider. If it is omitted, Yahoo Finance via the public AllOrigins proxy is attempted. Keep `DEMO_FALLBACK=true` for local exploration; use `false` where simulated records must never be served.

5. To enable Firebase Auth and watchlists, create a Firebase Web App and a Firebase Admin service account. Enable Email/Password in Firebase Authentication. Set these environment values:

   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (store newline escapes as `\n` in `.env`)
   - `FIREBASE_WEB_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_APP_ID`

   The web API key is public Firebase client configuration; restrict its allowed referrers in Google Cloud. The service account private key and FMP key are secrets and must never be sent to the browser or committed. The backend verifies client ID tokens with Firebase Admin before handling watchlist requests.

6. Start the app:

   ```sh
   npm run dev
   ```

   Open `http://localhost:3000` for the Orbit Stock landing page and analyzer. The dashboard is also available directly at `http://localhost:3000/app/`; both pages use the same API. `npm start` runs the same server without file watching. `npm run check` performs JavaScript syntax checks.

## Project structure

```text
client/
  index.html
  css/style.css
  js/                 SPA state, API client, finance calculators, analyzers, UI and Firebase Auth
server.js             Express entry point, security middleware, static client and API routes
server/
  config.js
  db/pool.js
  middleware/         Firebase ID-token verification
  providers/          FMP primary and Yahoo/AllOrigins fallback
  repositories/       PostgreSQL company cache and watchlist queries
  routes/             Stock and watchlist endpoints
  services/           Provider fallback, mock data, calculations and analyses
database/schema.sql   companies, financial_statements, financial_ratios, watchlists
skills/stock_analysis.md
```

The root `index.html` keeps the Orbit Stock landing page and includes the full analyzer flow. `client/` provides the matching standalone research dashboard at `/app/`. Both frontends call the same Express API and share the same analysis engines.

## API

- `GET /api/health` — server, PostgreSQL and optional provider/auth configuration status.
- `GET /api/config` — public Firebase web config only when both the web app and Admin credentials are configured.
- `GET /api/stocks/:ticker` — cache-first quote/statements, calculated ratios, Buffett/Lynch analyses and flags. Provider priority is PostgreSQL cache, in-memory cache, FMP, Yahoo through AllOrigins, then simulated data when enabled.
- `GET /api/watchlist` — list the signed-in Firebase user's tickers.
- `PUT /api/watchlist/:ticker` — fetch/cache a ticker and add it for the signed-in user.
- `DELETE /api/watchlist/:ticker` — remove a ticker for the signed-in user.

Watchlist routes require `Authorization: Bearer <Firebase ID token>`; the authenticated UID comes from a verified token and is never accepted from a request body. SQL statements use parameters and the company write is transactional.

## Data and calculation notes

Analysis rules and caveats are specified in [`skills/stock_analysis.md`](skills/stock_analysis.md). Backend calculations are the canonical API output; the client retains a matching calculation path for offline/mock fallback. Data sources and simulated status are returned separately. Financial statements are kept in source currency and fiscal year; the app does not silently convert currencies.

- Revenue/EPS/book-value CAGR uses the actual fiscal-year difference between first and last observations.
- ROIC uses estimated NOPAT at a 21% tax rate and invested capital; EBITDA is approximated from operating income. These are explicitly estimated ratios.
- Owner earnings begins with CFO less total CapEx. DCF assumptions are 10-year projection, growth capped at 8%, 10% discount, and 12× terminal multiple.
- PEG uses EPS CAGR expressed in percentage points. Negative or unavailable inputs produce `null` rather than an invented valuation multiple.
- A five-observation sample may span only four annual intervals. Provider filings can return fewer observations; the response reports actual coverage.
- Demo company values are simulated interface data and are never represented as verified market facts.

## Operational notes

All market data providers and the public CORS proxy can impose access, coverage, latency, or rate limits. For production, use a licensed provider with a server-side key, a managed PostgreSQL service, HTTPS, and deployment-managed Firebase service credentials. The app includes rate limiting, Helmet security headers, request timeouts, ticker validation, and explicit fallback status; it does not promise real-time quotes.
