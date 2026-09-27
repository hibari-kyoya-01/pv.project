const BASE = 'https://financialmodelingprep.com/stable';
const timeoutMs = 8_000;
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const year = row => Number(String(row.date || row.fiscalYear || '').slice(0, 4));

async function get(path, symbol, apiKey) {
  const url = new URL(`${BASE}/${path}`);
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('apikey', apiKey);
  if (path !== 'profile' && path !== 'quote') {
    url.searchParams.set('period', 'annual');
    url.searchParams.set('limit', '5');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`FMP ${path} returned HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(`FMP ${path} returned an unexpected payload`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchFmpCompany(ticker, apiKey) {
  if (!apiKey) throw new Error('FMP_API_KEY is not configured.');
  const [profileRows, quoteRows, incomeRows, balanceRows, cashRows] = await Promise.all([
    get('profile', ticker, apiKey), get('quote', ticker, apiKey),
    get('income-statement', ticker, apiKey), get('balance-sheet-statement', ticker, apiKey),
    get('cash-flow-statement', ticker, apiKey)
  ]);
  const profile = profileRows[0];
  const quote = quoteRows[0];
  if (!profile || !quote) throw new Error(`FMP returned no profile or quote for ${ticker}.`);
  const balances = new Map(balanceRows.map(row => [year(row), row]));
  const cashFlows = new Map(cashRows.map(row => [year(row), row]));
  const rows = incomeRows.slice(0, 5).map(income => {
    const fiscalYear = year(income);
    const balance = balances.get(fiscalYear) || {};
    const cash = cashFlows.get(fiscalYear) || {};
    const capex = Math.abs(number(cash.capitalExpenditure ?? cash.capitalExpenditures));
    const cfo = number(cash.operatingCashFlow ?? cash.netCashProvidedByOperatingActivities);
    const debt = number(balance.longTermDebt) + number(balance.shortTermDebt ?? balance.shortLongTermDebt);
    const shares = number(income.weightedAverageShsOutDil ?? income.weightedAverageShsOut) || number(quote.sharesOutstanding);
    const netIncome = number(income.netIncome);
    return {
      year: fiscalYear, revenue: number(income.revenue), grossProfit: number(income.grossProfit),
      operatingIncome: number(income.operatingIncome), netIncome,
      eps: number(income.epsDiluted ?? income.eps) || (shares ? netIncome / shares : 0),
      assets: number(balance.totalAssets), equity: number(balance.totalStockholdersEquity ?? balance.totalStockholdersEquityIncludingMinorityInterest),
      currentAssets: number(balance.totalCurrentAssets), inventory: number(balance.inventory),
      currentLiabilities: number(balance.totalCurrentLiabilities), debt,
      cash: number(balance.cashAndCashEquivalents ?? balance.cashAndShortTermInvestments),
      cfo, capex, fcf: Number.isFinite(Number(cash.freeCashFlow)) ? number(cash.freeCashFlow) : cfo - capex,
      interestExpense: Math.abs(number(income.interestExpense)), shares,
      dividends: number(cash.dividendsPerShare ?? income.dividendsPerShare)
    };
  }).filter(row => row.year > 0 && row.revenue > 0).sort((a, b) => a.year - b.year);
  if (rows.length < 2) throw new Error(`FMP returned fewer than two annual statements for ${ticker}.`);
  const price = number(quote.price ?? profile.price);
  const shares = number(quote.sharesOutstanding) || rows.at(-1).shares;
  return {
    ticker, name: profile.companyName || quote.name || ticker,
    currency: (profile.currency || quote.currency || 'USD').slice(0, 3).toUpperCase(),
    exchange: profile.exchangeShortName || profile.exchange || '',
    sector: profile.sector || 'Unclassified', industry: profile.industry || '—',
    description: profile.description || '', price,
    marketCap: number(quote.marketCap ?? profile.marketCap) || price * shares,
    shares, dividendYield: price > 0 ? number(quote.lastDividend ?? profile.lastDiv) / price : 0,
    beta: number(profile.beta), source: 'Financial Modeling Prep', dataMode: 'live', rows,
    liveNote: 'Market and annual statement data supplied by Financial Modeling Prep. Check its plan limits and filing coverage.'
  };
}
