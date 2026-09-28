import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCompany } from '../server/services/analysis-engine.js';
import { createMockCompany } from '../server/services/mock-provider.js';

test('does not flag N/A current ratio or interest coverage for a financial company', () => {
  const company = createMockCompany('KBANK.BK');
  company.rows = company.rows.map(row => ({ ...row, currentAssets: 0, interestExpense: 0 }));
  const result = analyzeCompany(company);
  assert.equal(result.calculated.ratios.currentRatio, null);
  assert.equal(result.calculated.ratios.interestCoverage, null);
  assert.equal(result.analysis.flags.red.some(flag => flag.includes('Current ratio')), false);
  assert.equal(result.analysis.flags.red.some(flag => flag.includes('Interest coverage')), false);
});

test('classifies a latest-year loss as Unclassified when no other Lynch category applies', () => {
  const company = createMockCompany('LOSSCO');
  company.marketCap = 1e15;
  company.rows = company.rows.map((row, index, rows) => ({ ...row,
    revenue: 1000 + index, netIncome: index === rows.length - 1 ? -10 : 10,
    eps: index === rows.length - 1 ? -0.1 : 0.1, cash: 1, currentAssets: 1, debt: 100
  }));
  assert.equal(analyzeCompany(company).analysis.lynch.category, 'Unclassified');
});

test('uses P/E divided by EPS growth plus dividend yield for dividend adjusted PEG', () => {
  const company = createMockCompany('PEGCO');
  const result = analyzeCompany(company);
  const { pe, dividendYield } = result.calculated.ratios;
  const growth = result.calculated.metrics.epsGrowth;
  assert.equal(result.analysis.lynch.dividendAdjustedPeg, pe / (growth + dividendYield));
});

test('returns null dividend adjusted PEG when EPS growth is unavailable', () => {
  const company = createMockCompany('NOGROW');
  company.rows[0].eps = 0;
  const result = analyzeCompany(company);
  assert.equal(result.calculated.metrics.epsGrowth, null);
  assert.equal(result.analysis.lynch.dividendAdjustedPeg, null);
});

test('marks missing Buffett ratios insufficient and excludes them from the score denominator', () => {
  const company = createMockCompany('NODATA');
  company.rows = company.rows.map(row => ({ ...row, interestExpense: null, capex: null, cfo: null }));
  const { buffett } = analyzeCompany(company).analysis;
  assert.equal(buffett.checks.find(check => check.label === 'Interest coverage').ok, null);
  assert.equal(buffett.checks.find(check => check.label === 'Reinvestment burden').ok, null);
  assert.equal(buffett.checks.find(check => check.label === 'Cash earnings quality').ok, null);
  const scored = buffett.checks.filter(check => check.ok !== null);
  const expected = Math.round(scored.filter(check => check.ok).length / scored.length * 100);
  assert.equal(buffett.score, expected);
});
