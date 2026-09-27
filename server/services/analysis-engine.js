const finite = Number.isFinite;
const median = values => {
  const sorted = values.filter(finite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  return sorted[Math.floor(sorted.length / 2)];
};
const fmt = (value, suffix = '') => finite(value) ? `${value.toFixed(1)}${suffix}` : 'N/A';
const pass = (label, detail) => ({ label, detail, ok: true });
const review = (label, detail) => ({ label, detail, ok: false });

export function analyzeBuffett(calculated) {
  const { company, rows, latest, ratios, metrics } = calculated;
  const checks = [];
  const grossYears = rows.filter(row => row.grossMargin >= 40).length;
  const returnYears = rows.filter(row => row.roe >= 15 && row.roic >= 15).length;
  checks.push(grossYears >= Math.min(4, rows.length)
    ? pass('Pricing power / gross margin', `${grossYears} of ${rows.length} years at or above 40%.`)
    : review('Pricing power / gross margin', `${grossYears} of ${rows.length} years at or above the 40% reference level.`));
  checks.push(returnYears >= Math.min(4, rows.length)
    ? pass('Capital efficiency', `ROE and estimated ROIC both exceeded 15% in ${returnYears} years.`)
    : review('Capital efficiency', `Both ROE and estimated ROIC exceeded 15% in ${returnYears} of ${rows.length} years.`));
  const debtYears = latest.netIncome > 0 ? latest.debt / latest.netIncome : null;
  checks.push(finite(debtYears) && debtYears < 4
    ? pass('Debt repayment capacity', `Debt is about ${fmt(debtYears)} years of current net income.`)
    : review('Debt repayment capacity', finite(debtYears) ? `Debt is about ${fmt(debtYears)} years of net income (reference < 4).` : 'Debt payback cannot be estimated from current earnings.'));
  checks.push(ratios.interestCoverage >= 5
    ? pass('Interest coverage', `${fmt(ratios.interestCoverage, '×')} operating-income coverage.`)
    : review('Interest coverage', `${fmt(ratios.interestCoverage, '×')} coverage; above 5× is the reference level.`));
  checks.push(ratios.capexCfo < 50
    ? pass('Reinvestment burden', `CapEx is ${fmt(ratios.capexCfo, '%')} of CFO.`)
    : review('Reinvestment burden', `CapEx is ${fmt(ratios.capexCfo, '%')} of CFO.`));
  checks.push(ratios.cfoNetIncome >= 1
    ? pass('Cash earnings quality', `CFO is ${fmt(ratios.cfoNetIncome, '×')} net income.`)
    : review('Cash earnings quality', `CFO is ${fmt(ratios.cfoNetIncome, '×')} net income.`));
  const ownerEarnings = Math.max(0, metrics.avgFcf ?? 0);
  const growth = Math.min(0.08, Math.max(0, (metrics.growth ?? 0) / 100));
  const discountRate = 0.10;
  const terminalMultiple = 12;
  let enterpriseValue = 0;
  for (let year = 1; year <= 10; year += 1) enterpriseValue += ownerEarnings * ((1 + growth) ** year) / ((1 + discountRate) ** year);
  enterpriseValue += ownerEarnings * ((1 + growth) ** 10) * terminalMultiple / ((1 + discountRate) ** 10);
  const fairValuePerShare = company.shares > 0 ? enterpriseValue / company.shares : null;
  return {
    score: Math.round(checks.filter(check => check.ok).length / checks.length * 100),
    verdict: checks.filter(check => check.ok).length >= 5 ? 'Durable quality signals' : checks.filter(check => check.ok).length >= 3 ? 'Mixed quality signals' : 'Several quality tests need review',
    checks, debtYears, ownerEarnings, ownerEarningsPerShare: company.shares > 0 ? ownerEarnings / company.shares : null,
    oeps: company.shares > 0 ? ownerEarnings / company.shares : null,
    fairValuePerShare, fairValue: fairValuePerShare,
    modeledUpsidePercent: finite(fairValuePerShare) && company.price > 0 ? (fairValuePerShare / company.price - 1) * 100 : null,
    upside: finite(fairValuePerShare) && company.price > 0 ? (fairValuePerShare / company.price - 1) * 100 : null,
    growth, discount: discountRate, terminalMultiple,
    assumptions: { growthCapPercent: growth * 100, discountRatePercent: discountRate * 100, terminalMultiple }
  };
}

export function analyzeLynch(calculated) {
  const { company, rows, latest, ratios, metrics } = calculated;
  const positiveYears = rows.filter(row => row.netIncome > 0).length;
  const revenues = rows.map(row => row.revenue).filter(Number.isFinite);
  const mean = revenues.reduce((sum, value) => sum + value, 0) / (revenues.length || 1);
  const volatility = Math.sqrt(revenues.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (revenues.length || 1)) / (mean || 1);
  let category = 'Stalwarts';
  let reason = 'Moderate growth with an established earnings base.';
  if (positiveYears < rows.length && latest.netIncome > 0) {
    category = 'Turnarounds'; reason = 'Recent profitability follows loss-making years; verify that recovery is sustained.';
  } else if (latest.cash + latest.currentAssets * 0.6 - latest.debt > company.marketCap) {
    category = 'Asset Plays'; reason = 'Estimated liquid assets net of debt exceed market capitalization under a simplified screen.';
  } else if (volatility > 0.23) {
    category = 'Cyclicals'; reason = 'Revenue varied materially over the available period; use normalized mid-cycle earnings.';
  } else if ((metrics.epsGrowth ?? -Infinity) >= 15) {
    category = 'Fast Growers'; reason = `Estimated EPS CAGR is ${fmt(metrics.epsGrowth, '%')}; verify growth durability and reinvestment returns.`;
  } else if ((metrics.epsGrowth ?? -Infinity) >= 8) {
    category = 'Stalwarts'; reason = `Estimated EPS CAGR is ${fmt(metrics.epsGrowth, '%')}, consistent with a steadier profile.`;
  } else if ((metrics.epsGrowth ?? -Infinity) >= 0 && (metrics.epsGrowth ?? Infinity) <= 5 && ratios.dividendYield >= 3) {
    category = 'Slow Growers'; reason = 'Low earnings growth and a meaningful yield fit a slow-grower profile.';
  }
  const dividendAdjustedPeg = finite(ratios.peg) ? (ratios.pe - (ratios.dividendYield || 0)) / (metrics.epsGrowth || 1) : null;
  const inventoryAlert = finite(metrics.inventoryGrowth) && finite(metrics.salesGrowth) && metrics.inventoryGrowth > metrics.salesGrowth + 5;
  return {
    category, reason, epsGrowth: metrics.epsGrowth, peg: ratios.peg, dividendAdjustedPeg, divAdjPeg: dividendAdjustedPeg,
    pegSignal: ratios.peg == null ? 'unavailable' : ratios.peg < 0.5 ? 'below-reference' : ratios.peg > 1.5 ? 'above-reference' : 'middle-range',
    inventoryGrowth: metrics.inventoryGrowth, salesGrowth: metrics.salesGrowth, inventoryAlert, revenueVolatility: volatility
  };
}

export function analyzeFlags(calculated, buffett, lynch) {
  const { company, ratios, metrics } = calculated;
  const green = [];
  const red = [];
  if (metrics.growth > 5) green.push(`Revenue CAGR is approximately ${fmt(metrics.growth, '%')} over the available history.`);
  if (ratios.roe > 15 && ratios.roic > 15) green.push('Latest ROE and estimated ROIC exceed 15%.');
  if (ratios.fcfMargin > 10) green.push(`FCF margin is ${fmt(ratios.fcfMargin, '%')}.`);
  if (ratios.debtEquity < 0.5) green.push(`Debt/equity is ${fmt(ratios.debtEquity, '×')}.`);
  if (buffett.score >= 67) green.push('Most checks in the selected quality screen pass.');
  if (!green.length) green.push('No major quantitative green flag met the screening thresholds. Review primary filings.');
  if (ratios.currentRatio < 1) red.push(`Current ratio is ${fmt(ratios.currentRatio, '×')}, below 1.0.`);
  if (ratios.interestCoverage < 3) red.push(`Interest coverage is ${fmt(ratios.interestCoverage, '×')}; review debt service and refinancing risk.`);
  if (ratios.cfoNetIncome < 0.8) red.push(`CFO is below net income (${fmt(ratios.cfoNetIncome, '×')}).`);
  if (metrics.shareChange > 3) red.push(`Diluted share count increased ${fmt(metrics.shareChange, '%')} across this sample.`);
  if (lynch.inventoryAlert) red.push(`Inventory growth (${fmt(lynch.inventoryGrowth, '%')}) exceeded sales growth (${fmt(lynch.salesGrowth, '%')}).`);
  if (ratios.pe > 35) red.push(`P/E is elevated at ${fmt(ratios.pe, '×')}; valuation depends on future growth.`);
  if (ratios.debtEquity > 1) red.push(`Debt/equity is ${fmt(ratios.debtEquity, '×')}, above 1.0.`);
  if (company.dataMode === 'simulated') red.push('Displayed financials are simulated, not verified company filings or market data.');
  if (!red.length) red.push('No major red flag met these thresholds. Simple screens can miss company-specific risks.');
  return { green, red };
}

export function analyzeCompany(company) {
  const calculated = calculateFinancials(company);
  const buffett = analyzeBuffett(calculated);
  const lynch = analyzeLynch(calculated);
  return { calculated, analysis: { buffett, lynch, flags: analyzeFlags(calculated, buffett, lynch) } };
}
import { calculateFinancials } from './financial-calculator.js';
