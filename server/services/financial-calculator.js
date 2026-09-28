const divide = (numerator, denominator) => Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0 ? numerator / denominator : null;
const scale = (value, multiplier) => Number.isFinite(value) ? value * multiplier : null;
const percentChange = (current, previous) => Number.isFinite(current) && Number.isFinite(previous) && previous !== 0 ? (current / previous - 1) * 100 : null;
const cagr = (first, last, periods) => first > 0 && last > 0 && periods > 0 ? (Math.pow(last / first, 1 / periods) - 1) * 100 : null;
const median = values => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
export function calculateFinancials(company) {
  if (!company || !Array.isArray(company.rows) || company.rows.length < 2) {
    throw new Error('At least two annual financial statement rows are required for analysis.');
  }
  const rows = company.rows.map(row => ({ ...row })).sort((a, b) => a.year - b.year);
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const previous = rows[index - 1];
    row.yoyRevenue = percentChange(row.revenue, previous?.revenue);
    row.yoyEps = percentChange(row.eps, previous?.eps);
    row.grossMargin = scale(divide(row.grossProfit, row.revenue), 100);
    row.operatingMargin = scale(divide(row.operatingIncome, row.revenue), 100);
    row.netMargin = scale(divide(row.netIncome, row.revenue), 100);
    row.roe = scale(divide(row.netIncome, row.equity), 100);
    row.roa = scale(divide(row.netIncome, row.assets), 100);
    const investedCapital = [row.equity, row.debt, row.cash].every(Number.isFinite) ? row.equity + row.debt - row.cash : null;
    row.roic = scale(divide(row.operatingIncome * 0.79, investedCapital), 100);
    row.currentRatio = row.currentAssets > 0 ? divide(row.currentAssets, row.currentLiabilities) : null;
    row.quickRatio = Number.isFinite(row.currentAssets) && Number.isFinite(row.inventory)
      ? divide(row.currentAssets - row.inventory, row.currentLiabilities) : null;
    row.debtEquity = divide(row.debt, row.equity);
    const ebitdaProxy = row.operatingIncome * 1.15;
    row.netDebtEbitda = divide(row.debt - row.cash, ebitdaProxy);
    row.interestCoverage = divide(row.operatingIncome, row.interestExpense);
    row.cfoNetIncome = divide(row.cfo, row.netIncome);
    row.fcfMargin = scale(divide(row.fcf, row.revenue), 100);
    row.fcfYield = scale(divide(row.fcf, company.marketCap), 100);
    row.capexCfo = scale(divide(row.capex, row.cfo), 100);
    row.bvps = divide(row.equity, row.shares);
    row.inventoryGrowth = percentChange(row.inventory, previous?.inventory);
    row.shareChange = percentChange(row.shares, previous?.shares);
  }

  const latest = rows.at(-1);
  const first = rows[0];
  const elapsedYears = latest.year - first.year;
  const revenueCagr = cagr(first.revenue, latest.revenue, elapsedYears);
  const epsCagr = cagr(first.eps, latest.eps, elapsedYears);
  const bookValuePerShareCagr = cagr(first.bvps, latest.bvps, elapsedYears);
  const pe = latest.eps > 0 ? divide(company.price, latest.eps) : null;
  const peg = Number.isFinite(epsCagr) && epsCagr > 0 && Number.isFinite(pe) ? pe / epsCagr : null;
  const ebitdaProxy = latest.operatingIncome * 1.15;
  const ratios = {
    revenueCagr, yoyRevenue: latest.yoyRevenue, epsCagr, bookValuePerShareCagr,
    grossMargin: latest.grossMargin, operatingMargin: latest.operatingMargin, netMargin: latest.netMargin,
    roe: latest.roe, roa: latest.roa, roic: latest.roic,
    currentRatio: latest.currentRatio, quickRatio: latest.quickRatio, debtEquity: latest.debtEquity,
    netDebtEbitda: latest.netDebtEbitda, interestCoverage: latest.interestCoverage,
    cfoNetIncome: latest.cfoNetIncome, fcfMargin: latest.fcfMargin, fcfYield: latest.fcfYield,
    capexCfo: latest.capexCfo, pe, peg,
    pb: divide(company.price, latest.bvps), ps: divide(company.marketCap, latest.revenue),
    evEbitda: divide(company.marketCap + latest.debt - latest.cash, ebitdaProxy),
    pFcf: divide(company.marketCap, latest.fcf),
    dividendYield: Number.isFinite(company.dividendYield) && company.dividendYield > 0 ? company.dividendYield * 100 : scale(divide(latest.dividends, company.price), 100),
    dividendPayout: scale(divide(latest.dividends, latest.eps), 100)
  };
  const values = key => rows.map(row => row[key]);
  const metrics = {
    growth: revenueCagr, epsGrowth: epsCagr, bvGrowth: bookValuePerShareCagr,
    avgGross: median(values('grossMargin')), avgRoe: median(values('roe')), avgRoic: median(values('roic')),
    avgNetIncome: median(values('netIncome')), avgFcf: median(values('fcf')),
    shareChange: percentChange(latest.shares, first.shares),
    inventoryGrowth: latest.inventoryGrowth, salesGrowth: latest.yoyRevenue,
    years: rows.map(row => row.year)
  };
  const history = Object.fromEntries(['yoyRevenue','yoyEps','grossMargin','operatingMargin','netMargin','roe','roa','roic','debt','cash','shares'].map(key => [key, values(key)]));
  history.revenueGrowth = history.yoyRevenue;
  history.epsGrowth = history.yoyEps;
  history.pe = rows.map((row, index) => row.eps > 0 ? company.price / row.eps : null);
  return { company, rows, latest, ratios, history, metrics };
}
