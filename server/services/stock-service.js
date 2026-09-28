import { config } from '../config.js';
import { pool } from '../db/pool.js';
import { fetchFmpCompany } from '../providers/fmp.js';
import { fetchYahooCompany } from '../providers/yahoo.js';
import { findFreshCompany, saveCompany } from '../repositories/company-repository.js';
import { analyzeCompany } from './analysis-engine.js';
import { createMockCompany } from './mock-provider.js';

const TICKER_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,14}$/;
const memoryCache = new Map();
const inFlight = new Map();
const memoryTtlMs = Math.min(config.cacheTtlSeconds, 900) * 1000;
const providers = [
  ['Financial Modeling Prep', ticker => fetchFmpCompany(ticker, config.fmpApiKey)],
  ['Yahoo Finance', fetchYahooCompany]
];

export function normalizeTicker(input) {
  const ticker = String(input || '').trim().toUpperCase();
  if (!TICKER_PATTERN.test(ticker)) {
    const error = new Error('Ticker format is invalid. Use 1–15 letters, numbers, dots, or dashes.');
    error.status = 400;
    throw error;
  }
  return ticker;
}

async function fromProvider(ticker) {
  const errors = [];
  for (const [providerName, request] of providers) {
    try {
      const company = await request(ticker);
      if (!company.rows || company.rows.length < 2 || !(company.price > 0)) throw new Error(`${providerName} returned incomplete quote or statement data.`);
      return company;
    } catch (error) {
      errors.push(`${providerName}: ${error.message}`);
    }
  }
  if (!config.demoFallback) {
    const error = new Error(`No market-data provider succeeded. ${errors.join(' | ')}`);
    error.status = 502;
    throw error;
  }
  const company = createMockCompany(ticker);
  company.liveNote += ` Provider detail: ${errors.join(' | ')}`;
  return company;
}

export async function getStockAnalysis(inputTicker) {
  const ticker = normalizeTicker(inputTicker);
  if (pool) {
    try {
      const cached = await findFreshCompany(ticker, config.cacheTtlSeconds);
      if (cached && cached.rows.length >= 2) {
        return { ...analyzeCompany(cached), cache: 'postgres', fetchedAt: cached.lastFetchedAt };
      }
    } catch (error) {
      console.error('PostgreSQL cache read failed; continuing to provider:', error.message);
    }
  }
  const cached = memoryCache.get(ticker);
  if (cached && cached.expiresAt > Date.now()) return { ...analyzeCompany(cached.company), cache: 'memory', fetchedAt: cached.fetchedAt };

  if (inFlight.has(ticker)) return inFlight.get(ticker);
  const pending = (async () => {
    const company = await fromProvider(ticker);
    const analyzed = analyzeCompany(company);
    const fetchedAt = new Date().toISOString();
    if (company.dataMode !== 'simulated') {
      memoryCache.set(ticker, { company, fetchedAt, expiresAt: Date.now() + memoryTtlMs });
      if (pool) {
        try {
          await saveCompany(company, analyzed.calculated.rows.map(row => ({ year: row.year, ratios: Object.fromEntries(Object.entries(row).filter(([key]) => /Margin$|^roe$|^roa$|^roic$|Ratio$|^debtEquity$|^netDebtEbitda$|^interestCoverage$|^cfoNetIncome$|^fcfYield$|^capexCfo$/.test(key))) })));
        } catch (error) {
          console.error('PostgreSQL cache write failed; retaining the in-memory result:', error.message);
        }
      }
    }
    return { ...analyzed, cache: 'miss', fetchedAt };
  })();
  inFlight.set(ticker, pending);
  try { return await pending; }
  finally { inFlight.delete(ticker); }
}

export async function getCompanyForWatchlist(inputTicker) {
  return getStockAnalysis(inputTicker);
}
