import { config } from '../config.js';
import { pool } from '../db/pool.js';
import { fetchFmpCompany } from '../providers/fmp.js';
import { fetchYahooCompany } from '../providers/yahoo.js';
import { companyExists, findFreshCompany, saveCompany } from '../repositories/company-repository.js';
import { analyzeCompany } from './analysis-engine.js';
import { createMockCompany } from './mock-provider.js';

const TICKER_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,14}$/;

export function normalizeTicker(input) {
  const ticker = String(input || '').trim().toUpperCase();
  if (!TICKER_PATTERN.test(ticker)) {
    const error = new Error('Ticker format is invalid. Use 1–15 letters, numbers, dots, or dashes.');
    error.status = 400;
    throw error;
  }
  return ticker;
}

export function createStockService(options = {}) {
  const database = options.pool === undefined ? pool : options.pool;
  const fallbackEnabled = options.demoFallback ?? config.demoFallback;
  const ttlSeconds = options.cacheTtlSeconds ?? config.cacheTtlSeconds;
  const readFresh = options.findFreshCompany ?? findFreshCompany;
  const writeCompany = options.saveCompany ?? saveCompany;
  const exists = options.companyExists ?? companyExists;
  const mockCompany = options.createMockCompany ?? createMockCompany;
  const providerRequests = options.providers ?? [
    ['Financial Modeling Prep', ticker => fetchFmpCompany(ticker, config.fmpApiKey)],
    ...(config.yahooEnabled ? [['Yahoo Finance', fetchYahooCompany]] : [])
  ];
  const memory = new Map();
  const inFlight = new Map();
  const memoryTtlMs = Math.min(ttlSeconds, 900) * 1000;

  async function fromProvider(ticker) {
    const errors = [];
    for (const [providerName, request] of providerRequests) {
      try {
        const company = await request(ticker);
        if (!company.rows || company.rows.length < 2 || !(company.price > 0)) throw new Error(`${providerName} returned incomplete quote or statement data.`);
        return company;
      } catch (error) { errors.push(`${providerName}: ${error.message}`); }
    }
    if (!fallbackEnabled) {
      const error = new Error(`No market-data provider succeeded. ${errors.join(' | ')}`);
      error.status = 502;
      throw error;
    }
    const company = mockCompany(ticker);
    company.liveNote += ` Provider detail: ${errors.join(' | ')}`;
    return company;
  }

  async function getStockAnalysis(inputTicker) {
    const ticker = normalizeTicker(inputTicker);
    if (database) {
      try {
        const cached = await readFresh(ticker, ttlSeconds);
        if (cached && cached.rows.length >= 2) return { ...analyzeCompany(cached), cache: 'postgres', fetchedAt: cached.lastFetchedAt };
      } catch (error) { console.error('PostgreSQL cache read failed; continuing to provider:', error.message); }
    }
    const cached = memory.get(ticker);
    if (cached && cached.expiresAt > Date.now()) return { ...analyzeCompany(cached.company), cache: 'memory', fetchedAt: cached.fetchedAt };
    if (inFlight.has(ticker)) return inFlight.get(ticker);

    const pending = (async () => {
      const company = await fromProvider(ticker);
      const analyzed = analyzeCompany(company);
      const fetchedAt = new Date().toISOString();
      if (company.dataMode !== 'simulated') {
        memory.set(ticker, { company, fetchedAt, expiresAt: Date.now() + memoryTtlMs });
        if (database) {
          try { await writeCompany(company); }
          catch (error) { console.error('PostgreSQL cache write failed; retaining the in-memory result:', error.message); }
        }
      }
      return { ...analyzed, cache: 'miss', fetchedAt };
    })();
    inFlight.set(ticker, pending);
    try { return await pending; }
    finally { inFlight.delete(ticker); }
  }

  async function getCompanyForWatchlist(inputTicker) {
    if (!database) {
      const error = new Error('Watchlists require a configured PostgreSQL database.');
      error.status = 503;
      throw error;
    }
    const ticker = normalizeTicker(inputTicker);
    if (await exists(ticker)) return;
    const company = await fromProvider(ticker);
    if (company.dataMode === 'simulated') {
      const error = new Error('This ticker could not be saved to the watchlist because only simulated company data is available.');
      error.status = 503;
      throw error;
    }
    try { await writeCompany(company); }
    catch (cause) {
      const error = new Error('The company data could not be saved, so this ticker was not added to the watchlist. Check the database connection and try again.');
      error.status = 503;
      error.cause = cause;
      throw error;
    }
  }

  return { getStockAnalysis, getCompanyForWatchlist, memory, inFlight };
}

const defaultService = createStockService();
export const getStockAnalysis = defaultService.getStockAnalysis;
export const getCompanyForWatchlist = defaultService.getCompanyForWatchlist;
