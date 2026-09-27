BEGIN;

CREATE TABLE IF NOT EXISTS companies (
  ticker TEXT PRIMARY KEY CHECK (ticker ~ '^[A-Z0-9][A-Z0-9.-]{0,14}$'),
  name TEXT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  exchange TEXT NOT NULL DEFAULT '',
  sector TEXT NOT NULL DEFAULT 'Unclassified',
  industry TEXT NOT NULL DEFAULT '—',
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(24, 8),
  market_cap NUMERIC(30, 4),
  shares_outstanding NUMERIC(30, 4),
  dividend_yield NUMERIC(16, 8),
  data_source TEXT NOT NULL,
  data_mode TEXT NOT NULL CHECK (data_mode IN ('live', 'simulated')),
  live_note TEXT NOT NULL DEFAULT '',
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_statements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticker TEXT NOT NULL REFERENCES companies(ticker) ON DELETE CASCADE,
  fiscal_year SMALLINT NOT NULL,
  revenue NUMERIC(30, 4) NOT NULL DEFAULT 0,
  gross_profit NUMERIC(30, 4) NOT NULL DEFAULT 0,
  operating_income NUMERIC(30, 4) NOT NULL DEFAULT 0,
  net_income NUMERIC(30, 4) NOT NULL DEFAULT 0,
  eps NUMERIC(24, 8) NOT NULL DEFAULT 0,
  total_assets NUMERIC(30, 4) NOT NULL DEFAULT 0,
  equity NUMERIC(30, 4) NOT NULL DEFAULT 0,
  current_assets NUMERIC(30, 4) NOT NULL DEFAULT 0,
  inventory NUMERIC(30, 4) NOT NULL DEFAULT 0,
  current_liabilities NUMERIC(30, 4) NOT NULL DEFAULT 0,
  total_debt NUMERIC(30, 4) NOT NULL DEFAULT 0,
  cash NUMERIC(30, 4) NOT NULL DEFAULT 0,
  operating_cash_flow NUMERIC(30, 4) NOT NULL DEFAULT 0,
  capital_expenditure NUMERIC(30, 4) NOT NULL DEFAULT 0,
  free_cash_flow NUMERIC(30, 4) NOT NULL DEFAULT 0,
  interest_expense NUMERIC(30, 4) NOT NULL DEFAULT 0,
  diluted_shares NUMERIC(30, 4) NOT NULL DEFAULT 0,
  dividends_per_share NUMERIC(24, 8) NOT NULL DEFAULT 0,
  data_source TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ticker, fiscal_year)
);
CREATE INDEX IF NOT EXISTS financial_statements_ticker_year_idx ON financial_statements (ticker, fiscal_year DESC);

CREATE TABLE IF NOT EXISTS financial_ratios (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticker TEXT NOT NULL REFERENCES companies(ticker) ON DELETE CASCADE,
  fiscal_year SMALLINT NOT NULL,
  ratios JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ticker, fiscal_year)
);
CREATE INDEX IF NOT EXISTS financial_ratios_ticker_year_idx ON financial_ratios (ticker, fiscal_year DESC);

CREATE TABLE IF NOT EXISTS watchlists (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  firebase_uid TEXT NOT NULL,
  ticker TEXT NOT NULL REFERENCES companies(ticker) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (firebase_uid, ticker)
);
CREATE INDEX IF NOT EXISTS watchlists_user_created_idx ON watchlists (firebase_uid, created_at DESC);

COMMIT;
