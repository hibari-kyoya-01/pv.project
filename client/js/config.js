/* Global state and public endpoint configuration. No API key is required. */
window.AppState = { ticker: '', company: null, isMock: false, chart: null, chartMode: 'growth', currentSection: 'overview', loadingTimer: null };
window.AppConfig = {
  currencySymbols: { USD: '$', THB: '฿', EUR: '€', GBP: '£', JPY: '¥', CAD: 'C$', AUD: 'A$' },
  commonTickers: ['AAPL','NVDA','TSLA','PTT.BK','KBANK.BK']
};
