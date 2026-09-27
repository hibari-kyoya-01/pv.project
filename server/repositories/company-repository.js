import { pool } from '../db/pool.js';

const toCompany = row => ({
  ticker: row.ticker, name: row.name, currency: row.currency, exchange: row.exchange,
  sector: row.sector, industry: row.industry, description: row.description,
  price: Number(row.price), marketCap: Number(row.market_cap),
  shares: Number(row.shares_outstanding), dividendYield: Number(row.dividend_yield),
  source: row.data_source, dataMode: row.data_mode, liveNote: row.live_note,
  lastFetchedAt: row.last_fetched_at,
  rows: (row.statements || []).map(statement => ({
    year: Number(statement.fiscal_year), revenue: Number(statement.revenue),
    grossProfit: Number(statement.gross_profit), operatingIncome: Number(statement.operating_income),
    netIncome: Number(statement.net_income), eps: Number(statement.eps), assets: Number(statement.total_assets),
    equity: Number(statement.equity), currentAssets: Number(statement.current_assets), inventory: Number(statement.inventory),
    currentLiabilities: Number(statement.current_liabilities), debt: Number(statement.total_debt), cash: Number(statement.cash),
    cfo: Number(statement.operating_cash_flow), capex: Number(statement.capital_expenditure),
    fcf: Number(statement.free_cash_flow), interestExpense: Number(statement.interest_expense),
    shares: Number(statement.diluted_shares), dividends: Number(statement.dividends_per_share)
  }))
});

export async function findFreshCompany(ticker, ttlSeconds) {
  if (!pool) return null;
  const result = await pool.query(`
    SELECT c.*,
      COALESCE(json_agg(json_build_object(
        'fiscal_year', fs.fiscal_year, 'revenue', fs.revenue, 'gross_profit', fs.gross_profit,
        'operating_income', fs.operating_income, 'net_income', fs.net_income, 'eps', fs.eps,
        'total_assets', fs.total_assets, 'equity', fs.equity, 'current_assets', fs.current_assets,
        'inventory', fs.inventory, 'current_liabilities', fs.current_liabilities, 'total_debt', fs.total_debt,
        'cash', fs.cash, 'operating_cash_flow', fs.operating_cash_flow,
        'capital_expenditure', fs.capital_expenditure, 'free_cash_flow', fs.free_cash_flow,
        'interest_expense', fs.interest_expense, 'diluted_shares', fs.diluted_shares,
        'dividends_per_share', fs.dividends_per_share
      ) ORDER BY fs.fiscal_year) FILTER (WHERE fs.id IS NOT NULL), '[]'::json) AS statements
    FROM companies c
    LEFT JOIN financial_statements fs ON fs.ticker = c.ticker
    WHERE c.ticker = $1 AND c.last_fetched_at > NOW() - ($2 * INTERVAL '1 second')
    GROUP BY c.ticker
  `, [ticker, ttlSeconds]);
  const row = result.rows[0];
  return row ? toCompany(row) : null;
}

export async function saveCompany(company, ratioRows) {
  if (!pool) return false;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO companies (ticker,name,currency,exchange,sector,industry,description,price,market_cap,shares_outstanding,dividend_yield,data_source,data_mode,live_note,last_fetched_at,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())
      ON CONFLICT (ticker) DO UPDATE SET name=EXCLUDED.name,currency=EXCLUDED.currency,exchange=EXCLUDED.exchange,
        sector=EXCLUDED.sector,industry=EXCLUDED.industry,description=EXCLUDED.description,price=EXCLUDED.price,
        market_cap=EXCLUDED.market_cap,shares_outstanding=EXCLUDED.shares_outstanding,dividend_yield=EXCLUDED.dividend_yield,
        data_source=EXCLUDED.data_source,data_mode=EXCLUDED.data_mode,live_note=EXCLUDED.live_note,last_fetched_at=NOW(),updated_at=NOW()
    `, [company.ticker, company.name, company.currency, company.exchange || '', company.sector || 'Unclassified',
      company.industry || '—', company.description || '', company.price, company.marketCap, company.shares,
      company.dividendYield, company.source, company.dataMode, company.liveNote || '']);

    for (const row of company.rows) {
      await client.query(`
        INSERT INTO financial_statements (ticker,fiscal_year,revenue,gross_profit,operating_income,net_income,eps,total_assets,equity,current_assets,inventory,current_liabilities,total_debt,cash,operating_cash_flow,capital_expenditure,free_cash_flow,interest_expense,diluted_shares,dividends_per_share,data_source,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW())
        ON CONFLICT (ticker,fiscal_year) DO UPDATE SET revenue=EXCLUDED.revenue,gross_profit=EXCLUDED.gross_profit,
          operating_income=EXCLUDED.operating_income,net_income=EXCLUDED.net_income,eps=EXCLUDED.eps,
          total_assets=EXCLUDED.total_assets,equity=EXCLUDED.equity,current_assets=EXCLUDED.current_assets,
          inventory=EXCLUDED.inventory,current_liabilities=EXCLUDED.current_liabilities,total_debt=EXCLUDED.total_debt,
          cash=EXCLUDED.cash,operating_cash_flow=EXCLUDED.operating_cash_flow,capital_expenditure=EXCLUDED.capital_expenditure,
          free_cash_flow=EXCLUDED.free_cash_flow,interest_expense=EXCLUDED.interest_expense,
          diluted_shares=EXCLUDED.diluted_shares,dividends_per_share=EXCLUDED.dividends_per_share,
          data_source=EXCLUDED.data_source,updated_at=NOW()
      `, [company.ticker, row.year, row.revenue, row.grossProfit, row.operatingIncome, row.netIncome, row.eps,
        row.assets, row.equity, row.currentAssets, row.inventory, row.currentLiabilities, row.debt, row.cash,
        row.cfo, row.capex, row.fcf, row.interestExpense, row.shares, row.dividends, company.source]);
    }
    for (const row of ratioRows) {
      await client.query(`INSERT INTO financial_ratios (ticker,fiscal_year,ratios,updated_at) VALUES ($1,$2,$3::jsonb,NOW())
        ON CONFLICT (ticker,fiscal_year) DO UPDATE SET ratios=EXCLUDED.ratios,updated_at=NOW()`, [company.ticker, row.year, JSON.stringify(row.ratios)]);
    }
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
