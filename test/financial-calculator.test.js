import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFinancials } from '../server/services/financial-calculator.js';
import { createMockCompany } from '../server/services/mock-provider.js';

test('calculates CAGR and PEG, and rejects non-positive starting EPS', () => {
  const company = createMockCompany('AAPL');
  const calculated = calculateFinancials(company);
  assert.ok(Number.isFinite(calculated.metrics.epsGrowth));
  assert.ok(Number.isFinite(calculated.ratios.peg));
  const lossStart = { ...company, rows: company.rows.map((row, index) => ({ ...row, eps: index === 0 ? 0 : row.eps })) };
  assert.equal(calculateFinancials(lossStart).metrics.epsGrowth, null);
});

test('uses dividends per share divided by price when provider yield is zero', () => {
  const company = createMockCompany('AAPL');
  company.dividendYield = 0;
  const calculated = calculateFinancials(company);
  assert.equal(calculated.ratios.dividendYield, company.rows.at(-1).dividends / company.price * 100);
});

test('returns unavailable ratios for missing statement values', () => {
  const company = createMockCompany('AAPL');
  company.rows = company.rows.map(row => ({ ...row, equity: null, interestExpense: null, currentAssets: null }));
  const calculated = calculateFinancials(company);
  assert.equal(calculated.latest.roe, null);
  assert.equal(calculated.ratios.currentRatio, null);
  assert.equal(calculated.ratios.interestCoverage, null);
});
