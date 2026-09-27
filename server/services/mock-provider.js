const PRESETS = {
  AAPL: { name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics', price: 227.52, currency: 'USD', growth: 0.075, margin: 0.45, net: 0.24, roe: 1.45, debt: 0.20, yield: 0.004, cap: 3.48e12, description: 'Illustrative profile: designs and sells consumer electronics, software and services.' },
  NVDA: { name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors', price: 118.42, currency: 'USD', growth: 0.31, margin: 0.72, net: 0.48, roe: 0.82, debt: 0.10, yield: 0.0003, cap: 2.9e12, description: 'Illustrative profile: accelerated computing, GPUs, systems and software.' },
  TSLA: { name: 'Tesla, Inc.', sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', price: 262.18, currency: 'USD', growth: 0.13, margin: 0.18, net: 0.09, roe: 0.21, debt: 0.05, yield: 0, cap: 8.4e11, description: 'Illustrative profile: electric vehicles, energy generation and storage systems.' },
  'PTT.BK': { name: 'PTT Public Company Limited', sector: 'Energy', industry: 'Oil & Gas Integrated', price: 32.75, currency: 'THB', growth: 0.035, margin: 0.16, net: 0.055, roe: 0.105, debt: 0.36, yield: 0.055, cap: 9.35e11, description: 'Illustrative profile: integrated Thai energy business.' },
  'KBANK.BK': { name: 'Kasikornbank Public Company Limited', sector: 'Financial Services', industry: 'Banks—Regional', price: 162.5, currency: 'THB', growth: 0.065, margin: 0.38, net: 0.21, roe: 0.105, debt: 0.08, yield: 0.045, cap: 3.86e11, description: 'Illustrative profile: Thai commercial bank and financial services provider.' }
};

export function createMockCompany(ticker) {
  const symbol = ticker.toUpperCase();
  const hash = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const preset = PRESETS[symbol] || {
    name: `${symbol} (simulated)`, sector: 'Unclassified', industry: 'Unknown',
    price: 25 + hash % 90, currency: symbol.endsWith('.BK') ? 'THB' : 'USD',
    growth: 0.045 + (hash % 22) / 100, margin: 0.25 + (hash % 32) / 100,
    net: 0.10 + (hash % 15) / 100, roe: 0.11 + (hash % 20) / 100,
    debt: 0.12 + (hash % 26) / 100, yield: 0.005 + (hash % 40) / 1000,
    cap: (8 + hash % 60) * 1e9,
    description: 'No verified company profile is available. All values shown for this ticker are generated demonstration data.'
  };
  const shares = preset.cap / preset.price;
  const baseRevenue = preset.cap / 20;
  const rows = Array.from({ length: 5 }, (_, index) => {
    const year = new Date().getUTCFullYear() - 5 + index;
    const revenue = baseRevenue * (1 + preset.growth) ** index;
    const netIncome = revenue * preset.net * (0.88 + index * 0.03);
    const assets = revenue * 0.92;
    const debt = assets * preset.debt;
    const cash = assets * (0.10 + index * 0.012);
    const operatingCashFlow = netIncome * (1.04 + index * 0.035);
    const capitalExpenditure = revenue * (0.045 + (hash % 6) / 100);
    return {
      year, revenue, grossProfit: revenue * preset.margin * (0.92 + index * 0.02),
      operatingIncome: revenue * preset.margin * 0.56, netIncome,
      eps: netIncome / shares, assets,
      equity: assets / (preset.roe * (0.90 + index * 0.025)),
      currentAssets: assets * 0.36, inventory: revenue * (0.045 + index * 0.002),
      currentLiabilities: assets * 0.18, debt, cash, cfo: operatingCashFlow,
      capex: capitalExpenditure, fcf: operatingCashFlow - capitalExpenditure,
      interestExpense: debt * 0.045, shares: shares * (1 - index * 0.004),
      dividends: (netIncome / shares) * preset.yield
    };
  });
  return {
    ticker: symbol, name: preset.name, currency: preset.currency, exchange: symbol.endsWith('.BK') ? 'Thailand' : 'US',
    sector: preset.sector, industry: preset.industry, description: preset.description,
    price: preset.price, marketCap: preset.cap, shares, dividendYield: preset.yield,
    beta: 1.05, source: 'Server simulated-data engine', dataMode: 'simulated', rows,
    liveNote: 'SIMULATED DATA: these values are not company filings, live quotes, or investment research.'
  };
}
