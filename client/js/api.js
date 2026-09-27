/* Yahoo quoteSummary is an unofficial endpoint; CORS/proxy availability varies. */
window.StockAPI = (() => {
  const val = x => x && typeof x === 'object' && 'raw' in x ? Number(x.raw) : Number(x);
  const first = (...xs) => xs.find(x => Number.isFinite(x) && x !== 0) || 0;
  const modules = 'price,assetProfile,defaultKeyStatistics,financialData,incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory';
  async function fetchYahoo(ticker) {
    const response = await fetch(`/api/stocks/${encodeURIComponent(ticker)}`, { headers: { accept: 'application/json' } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Stock API returned ${response.status}`);
    if (!payload.company?.rows?.length) throw new Error('Stock API returned no financial statement rows.');
    payload.company.backendCalculated = payload.calculated;
    payload.company.backendAnalysis = payload.analysis;
    payload.company.cache = payload.cache;
    payload.company.fetchedAt = payload.fetchedAt;
    return payload.company;
  }
  function normalizeYahoo(q, ticker) {
    const p = q.price || {}, fin = q.financialData || {}, prof = q.assetProfile || {}, key = q.defaultKeyStatistics || {};
    const income = q.incomeStatementHistory?.incomeStatementHistory || [];
    const balance = q.balanceSheetHistory?.balanceSheetStatements || [];
    const cash = q.cashflowStatementHistory?.cashflowStatements || [];
    const pick = (obj, ...names) => first(...names.map(n => val(obj?.[n])));
    const rows = income.slice(0,5).map((r, i) => {
      const date = r.endDate?.raw ? new Date(r.endDate.raw * 1000).getFullYear() : new Date().getFullYear() - i - 1;
      const b = balance.find(x => (x.endDate?.raw || 0) === (r.endDate?.raw || -1)) || balance[i] || {};
      const c = cash.find(x => (x.endDate?.raw || 0) === (r.endDate?.raw || -1)) || cash[i] || {};
      const revenue = pick(r,'totalRevenue'), gross = pick(r,'grossProfit'), operating = pick(r,'operatingIncome'), net = pick(r,'netIncome');
      const assets = pick(b,'totalAssets'), equity = pick(b,'totalStockholderEquity','totalEquityGrossMinorityInterest');
      const currentAssets = pick(b,'totalCurrentAssets'), inventory = pick(b,'inventory'), currentLiabilities = pick(b,'totalCurrentLiabilities');
      const debt = pick(b,'longTermDebt','longTermDebtAndCapitalLeaseObligation') + pick(b,'shortLongTermDebt','shortTermDebt');
      const cfo = pick(c,'totalCashFromOperatingActivities'), capex = Math.abs(pick(c,'capitalExpenditures'));
      const shares = pick(r,'dilutedAverageShares','basicAverageShares') || val(key.sharesOutstanding) || 1;
      return { year: date, revenue, grossProfit:gross, operatingIncome:operating, netIncome:net, eps:pick(r,'dilutedEPS','basicEPS') || net/shares, assets, equity, currentAssets, inventory, currentLiabilities, debt, cash:pick(b,'cash','cashAndCashEquivalents'), cfo, capex, fcf:cfo-capex, interestExpense:Math.abs(pick(r,'interestExpense')), shares, dividends:pick(r,'dividendsPerShare') };
    }).filter(r=>r.revenue>0).sort((a,b)=>a.year-b.year);
    if (rows.length < 2) throw new Error('Insufficient annual statements from Yahoo Finance');
    const price = val(p.regularMarketPrice), shares = val(key.sharesOutstanding) || val(fin.sharesOutstanding) || rows.at(-1).shares;
    return { ticker, name:p.longName||p.shortName||ticker, currency:p.currency||'USD', exchange:p.exchangeName||'', sector:prof.sector||'Unclassified', industry:prof.industry||'—', description:prof.longBusinessSummary||'Company profile was not included in the data response.', price, marketCap:val(p.marketCap)||price*shares, shares, beta:val(key.beta), dividendYield:val(fin.dividendYield), source:'Yahoo Finance via public CORS proxy', dataMode:'live', rows, liveNote:'Annual statement data is sourced from Yahoo Finance; quote timing and statement coverage may vary.' };
  }
  function mockCompany(ticker) {
    const presets = {
      AAPL:{name:'Apple Inc.',sector:'Technology',industry:'Consumer Electronics',price:227.52,currency:'USD',growth:.075,margin:.45,net:.24,roe:1.45,debt:.20,div:.004,cap:3.48e12,desc:'Designs, manufactures and markets smartphones, personal computers, tablets, wearables and related services worldwide.'},
      NVDA:{name:'NVIDIA Corporation',sector:'Technology',industry:'Semiconductors',price:118.42,currency:'USD',growth:.31,margin:.72,net:.48,roe:.82,debt:.10,div:.0003,cap:2.9e12,desc:'Accelerated computing company developing graphics processing units, systems and software for data centers, gaming and other markets.'},
      TSLA:{name:'Tesla, Inc.',sector:'Consumer Cyclical',industry:'Auto Manufacturers',price:262.18,currency:'USD',growth:.13,margin:.18,net:.09,roe:.21,debt:.05,div:0,cap:8.4e11,desc:'Designs, develops, manufactures, leases and sells electric vehicles, energy generation and storage systems.'},
      'PTT.BK':{name:'PTT Public Company Limited',sector:'Energy',industry:'Oil & Gas Integrated',price:32.75,currency:'THB',growth:.035,margin:.16,net:.055,roe:.105,debt:.36,div:.055,cap:9.35e11,desc:'Thai integrated energy company operating across natural gas, petroleum, petrochemicals, power and related businesses.'},
      'KBANK.BK':{name:'Kasikornbank Public Company Limited',sector:'Financial Services',industry:'Banks—Regional',price:162.5,currency:'THB',growth:.065,margin:.38,net:.21,roe:.105,debt:.08,div:.045,cap:3.86e11,desc:'Thai commercial bank providing retail, corporate, digital banking and financial services in Thailand and internationally.'}
    };
    const t=ticker.toUpperCase(), preset=presets[t];
    if (!preset && !/^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(t)) throw new Error('Please enter a valid ticker using letters and numbers.');
    const h = [...t].reduce((a,c)=>a+c.charCodeAt(0),0), p=preset||{name:`${t} Corporation`,sector:['Technology','Industrials','Consumer'][h%3],industry:'Illustrative public company',price:25+(h%900)/10,currency:t.endsWith('.BK')?'THB':'USD',growth:.045+(h%22)/100,margin:.25+(h%32)/100,net:.10+(h%15)/100,roe:.11+(h%20)/100,debt:.12+(h%26)/100,div:.005+(h%40)/1000,cap:(8+(h%60))*1e9,desc:'No verified company profile was available. This illustrative profile and financial history are simulated for interface demonstration.'};
    const rows=[]; let revenue=(p.cap/20)*(t.endsWith('.BK')?1:1), shares=p.cap/p.price;
    for(let i=0;i<5;i++){
      const year=new Date().getFullYear()-5+i, g=p.growth*(.82+.07*i), rev=revenue*Math.pow(1+g,i), margin=p.margin*(.92+.02*i), netm=p.net*(.88+.03*i), ni=rev*netm;
      const assets=rev*.92, equity=assets/(p.roe*(.90+.025*i)), debt=assets*p.debt, cash=assets*(.10+.012*i), cfo=ni*(1.04+.035*i), capex=rev*(.045+((h%6)/100));
      rows.push({year,revenue:rev,grossProfit:rev*margin,operatingIncome:rev*margin*.56,netIncome:ni,eps:ni/shares,assets,equity,currentAssets:assets*.36,inventory:rev*(.045+.002*i),currentLiabilities:assets*.18,debt,cash,cfo,capex,fcf:cfo-capex,interestExpense:debt*.045,shares:shares*(1-.004*i),dividends:(ni/shares)*p.div});
    }
    return {ticker:t,name:p.name,currency:p.currency,exchange:t.endsWith('.BK')?'Thailand':'US',sector:p.sector,industry:p.industry,description:p.desc,price:p.price,marketCap:p.cap,shares, beta:1.05,dividendYield:p.div,source:'Simulated demo engine',dataMode:'simulated',rows,liveNote:'Illustrative financials are generated for demonstration. They are not company filings or verified market data.'};
  }
  async function getCompany(ticker) {
    const t=ticker.trim().toUpperCase(); if (!/^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(t)) throw new Error('Ticker format looks invalid. Try a symbol such as AAPL or PTT.BK.');
    try {
      const live=await fetchYahoo(t);
      AppState.isMock = live.dataMode !== 'live';
      return live;
    } catch (err) {
      // Network, CORS proxy, HTTP, parsing and missing-ticker failures all use the demo engine.
      AppState.isMock = true;
      const demo=mockCompany(t);
      demo.apiError=err?.name==='AbortError'?'The live data request timed out.':(err?.message||'Live data unavailable.');
      return demo;
    }
  }
  return { getCompany, mockCompany, fetchYahoo };
})();
