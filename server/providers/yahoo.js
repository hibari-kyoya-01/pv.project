const BASE = 'https://query1.finance.yahoo.com/v10/finance/quoteSummary/';
const MODULES = 'price,assetProfile,defaultKeyStatistics,summaryDetail,financialData,incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory';
const raw = value => value && typeof value === 'object' && 'raw' in value ? Number(value.raw) : Number(value);
const number = (...values) => {
  for (const value of values) {
    const candidate = raw(value);
    if (Number.isFinite(candidate) && candidate !== 0) return candidate;
  }
  return 0;
};
const year = row => row?.endDate?.raw ? new Date(row.endDate.raw * 1000).getUTCFullYear() : 0;

export async function fetchYahooCompany(ticker) {
  const endpoint = `${BASE}${encodeURIComponent(ticker)}?modules=${MODULES}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const crumbResponse = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { signal: controller.signal, headers: { accept: 'text/plain', 'user-agent': 'Mozilla/5.0' } });
    if (!crumbResponse.ok) throw new Error(`Yahoo Finance crumb request returned HTTP ${crumbResponse.status}`);
    const crumb = (await crumbResponse.text()).trim();
    const cookies = crumbResponse.headers.getSetCookie?.().map(value => value.split(';', 1)[0]).join('; ') || '';
    if (!crumb || !cookies) throw new Error('Yahoo Finance did not provide the cookie and crumb required by quoteSummary.');
    const response = await fetch(`${endpoint}&crumb=${encodeURIComponent(crumb)}`, { signal: controller.signal, headers: { accept: 'application/json', cookie: cookies, 'user-agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error(`Yahoo Finance quoteSummary returned HTTP ${response.status}`);
    const payload = await response.json();
    const result = payload?.quoteSummary?.result?.[0];
    if (!result?.price) throw new Error(`Yahoo Finance returned no quote for ${ticker}.`);
    const income = result.incomeStatementHistory?.incomeStatementHistory || [];
    const balance = result.balanceSheetHistory?.balanceSheetStatements || [];
    const cashFlow = result.cashflowStatementHistory?.cashflowStatements || [];
    const rows = income.slice(0, 5).map((statement, index) => {
      const fiscalYear = year(statement);
      const balanceRow = balance.find(row => year(row) === fiscalYear) || balance[index] || {};
      const cashRow = cashFlow.find(row => year(row) === fiscalYear) || cashFlow[index] || {};
      const revenue = number(statement.totalRevenue);
      const netIncome = number(statement.netIncome);
      const shares = number(statement.dilutedAverageShares, statement.basicAverageShares, result.defaultKeyStatistics?.sharesOutstanding) || 1;
      const cfo = number(cashRow.totalCashFromOperatingActivities);
      const capex = Math.abs(number(cashRow.capitalExpenditures));
      return {
        year: fiscalYear, revenue, grossProfit: number(statement.grossProfit),
        operatingIncome: number(statement.operatingIncome), netIncome,
        eps: number(statement.dilutedEPS, statement.basicEPS) || netIncome / shares,
        assets: number(balanceRow.totalAssets), equity: number(balanceRow.totalStockholderEquity, balanceRow.totalEquityGrossMinorityInterest),
        currentAssets: number(balanceRow.totalCurrentAssets), inventory: number(balanceRow.inventory),
        currentLiabilities: number(balanceRow.totalCurrentLiabilities),
        debt: number(balanceRow.longTermDebt, balanceRow.longTermDebtAndCapitalLeaseObligation) + number(balanceRow.shortLongTermDebt, balanceRow.shortTermDebt),
        cash: number(balanceRow.cash, balanceRow.cashAndCashEquivalents), cfo, capex, fcf: cfo - capex,
        interestExpense: Math.abs(number(statement.interestExpense)), shares,
        // TODO: Verify Yahoo's current cash-flow module key before mapping a historical per-share value.
        dividends: number(cashRow.dividendsPaid, cashRow.commonDividendsPaid) && shares > 0 ? Math.abs(number(cashRow.dividendsPaid, cashRow.commonDividendsPaid)) / shares : 0
      };
    }).filter(row => row.year > 0 && row.revenue > 0).sort((a, b) => a.year - b.year);
    if (rows.length < 2) throw new Error(`Yahoo Finance returned fewer than two annual statements for ${ticker}.`);
    const price = number(result.price.regularMarketPrice);
    const shares = number(result.defaultKeyStatistics?.sharesOutstanding, result.financialData?.sharesOutstanding) || rows.at(-1).shares;
    const dividendYield = number(result.summaryDetail?.dividendYield);
    return {
      ticker, name: result.price.longName || result.price.shortName || ticker,
      currency: result.price.currency || 'USD', exchange: result.price.exchangeName || '',
      sector: result.assetProfile?.sector || 'Unclassified', industry: result.assetProfile?.industry || '—',
      description: result.assetProfile?.longBusinessSummary || '', price,
      marketCap: number(result.price.marketCap) || price * shares, shares, dividendYield,
      beta: number(result.defaultKeyStatistics?.beta), source: 'Yahoo Finance', dataMode: 'live', rows,
      liveNote: 'Yahoo Finance is unofficial; direct quoteSummary access requires a session cookie and crumb and annual statement modules may be incomplete or unavailable.'
    };
  } finally {
    clearTimeout(timer);
  }
}
