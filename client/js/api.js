window.StockAPI = (() => {
  async function fetchAnalysis(ticker) {
    const response = await fetch(`/api/stocks/${encodeURIComponent(ticker)}`, { headers: { accept: 'application/json' } });
    let payload;
    try { payload = await response.json(); } catch { throw new Error(`Stock API returned an invalid response (${response.status}).`); }
    if (!response.ok) throw new Error(payload.error || `Stock API returned ${response.status}`);
    if (!payload.calculated || !payload.analysis) throw new Error('Stock API returned incomplete analysis data.');
    return payload;
  }
  async function getCompany(ticker) {
    const value = String(ticker || '').trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(value)) throw new Error('Ticker format looks invalid. Try a symbol such as AAPL or PTT.BK.');
    return fetchAnalysis(value);
  }
  return { getCompany, fetchAnalysis };
})();
