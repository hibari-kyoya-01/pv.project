/* Rule-based summaries are signals for research, never individualized advice. */
window.AnalysisEngines = (() => {
  const good=(label,detail)=>({label,detail,ok:true}), watch=(label,detail)=>({label,detail,ok:false});
  function buffett(c){const {ratios:r,rows,latest:l,metrics:m}=c, checks=[];
    const gmYears=rows.filter(x=>x.grossMargin>=40).length, returnYears=rows.filter(x=>x.roe>=15&&x.roic>=15).length;
    checks.push(gmYears>=4?good('Pricing power / gross margin',`${gmYears} of ${rows.length} years at or above 40% gross margin.`):watch('Pricing power / gross margin',`${gmYears} of ${rows.length} years at or above the 40% reference level.`));
    checks.push(returnYears>=4?good('Capital efficiency',`ROE and estimated ROIC both exceeded 15% in ${returnYears} of ${rows.length} years.`):watch('Capital efficiency',`ROE and estimated ROIC both exceeded 15% in ${returnYears} of ${rows.length} years.`));
    const debtYears=l.netIncome>0?l.debt/l.netIncome:null;
    checks.push(debtYears!==null&&debtYears<4?good('Debt repayment capacity',`Long-term debt is about ${debtYears.toFixed(1)} years of current net income.`):watch('Debt repayment capacity',debtYears===null?'Net income is negative or unavailable; debt payback cannot be estimated.':`Debt is about ${debtYears.toFixed(1)} years of current net income (reference < 4).`));
    checks.push(r.interestCoverage>=5?good('Interest coverage',`${r.interestCoverage.toFixed(1)}× operating income covers interest expense.`):watch('Interest coverage',`${fmt(r.interestCoverage,'×')} coverage; above 5× is the reference level.`));
    checks.push(r.capexCfo<50?good('Reinvestment burden',`CapEx is ${fmt(r.capexCfo,'%')} of operating cash flow.`):watch('Reinvestment burden',`CapEx is ${fmt(r.capexCfo,'%')} of operating cash flow.`));
    checks.push(r.cfoNetIncome>=1?good('Cash earnings quality',`Operating cash flow is ${fmt(r.cfoNetIncome,'×')} net income.`):watch('Cash earnings quality',`Operating cash flow is ${fmt(r.cfoNetIncome,'×')} net income.`));
    const score=Math.round(checks.reduce((n,x)=>n+(x.ok?1:0),0)/checks.length*100);
    const oe=Math.max(0,m.avgFcf), growth=Math.min(.08,Math.max(0,(m.growth||0)/100)), discount=.10, terminalMultiple=12;
    let dcf=0;for(let yr=1;yr<=10;yr++)dcf+=oe*Math.pow(1+growth,yr)/Math.pow(1+discount,yr);dcf+=oe*Math.pow(1+growth,10)*terminalMultiple/Math.pow(1+discount,10);
    const fair=dcf/(c.company.shares||1), upside=(fair/c.company.price-1)*100;
    return {checks,score,verdict:score>=80?'Durable quality signals':score>=50?'Mixed quality signals':'Several quality tests need review',ownerEarnings:oe,fairValue:fair,upside,oeps:oe/(c.company.shares||1),growth,discount,terminalMultiple,debtYears};
  }
  function fmt(n,s=''){return Number.isFinite(n)?`${n.toFixed(1)}${s}`:'N/A'}
  function lynch(c){const {company}=c,{ratios:r,rows,latest:l,metrics:m}=c;let category='Stalwarts',reason='Moderate growth with an established earnings base.';
    const positive=rows.filter(x=>x.netIncome>0).length, epsFirst=rows[0].eps, epsLast=l.eps, epsGrowth=m.epsGrowth;
    const variability=c.FinanceCalc?.stdev; const revs=rows.map(x=>x.revenue), mean=revs.reduce((a,b)=>a+b,0)/revs.length, volatility=Math.sqrt(revs.reduce((a,b)=>a+Math.pow(b-mean,2),0)/revs.length)/mean;
    if(positive<rows.length&&l.netIncome>0){category='Turnarounds';reason='Recent profitability follows one or more loss-making years; check whether recovery is sustained.'}
    else if((l.cash+l.currentAssets*.6-l.debt)>company.marketCap){category='Asset Plays';reason='Estimated liquid assets net of debt exceed the current market capitalization under a simplified balance-sheet screen.'}
    else if(volatility>.23){category='Cyclicals';reason='Revenue has varied materially across the available period; cycle timing can distort earnings multiples.'}
    else if(epsGrowth>=15){category='Fast Growers';reason=`Estimated EPS CAGR of ${fmt(epsGrowth,'%')} is in the high-growth range; verify reinvestment returns and durability.`}
    else if(epsGrowth>=8){category='Stalwarts';reason=`Estimated EPS CAGR of ${fmt(epsGrowth,'%')} suggests a steadier established-company profile.`}
    else if(epsGrowth>=0&&epsGrowth<=5&&r.dividendYield>=3){category='Slow Growers';reason='Low earnings growth with a meaningful indicated yield fits a slow-grower profile.'}
    else if(epsFirst<0&&epsLast>0){category='Turnarounds';reason='Earnings moved from negative to positive across the selected period.'}
    const divAdjPeg=epsGrowth>0?(r.pe-r.dividendYield)/epsGrowth:null;
    const invAlert=Number.isFinite(m.inventoryGrowth)&&Number.isFinite(m.salesGrowth)&&m.inventoryGrowth>m.salesGrowth+5;
    return {category,reason,peg:r.peg,divAdjPeg,inventoryGrowth:m.inventoryGrowth,salesGrowth:m.salesGrowth,inventoryAlert:invAlert,volatility,epsGrowth};
  }
  function flags(c,b,l){const green=[],red=[],r=c.ratios,m=c.metrics;
    if(m.growth>5)green.push(`Revenue compounded at approximately ${fmt(m.growth,'%')} annually over the modeled/available history.`);
    if(r.roe>15&&r.roic>15)green.push(`Latest ROE (${fmt(r.roe,'%')}) and estimated ROIC (${fmt(r.roic,'%')}) are above 15%.`);
    if(r.fcfMargin>10)green.push(`Free cash flow margin is ${fmt(r.fcfMargin,'%')}.`);
    if(r.debtEquity<.5)green.push(`Debt-to-equity is relatively contained at ${fmt(r.debtEquity,'×')}.`);
    if(b.score>=67)green.push('Most of the selected quality checklist is passing.');
    if(!green.length)green.push('No major quantitative green flag met the simple screening thresholds; review primary filings.');
    if(r.currentRatio<1)red.push(`Current ratio of ${fmt(r.currentRatio,'×')} is below 1.0.`);
    if(r.interestCoverage<3)red.push(`Interest coverage is only ${fmt(r.interestCoverage,'×')}; refinancing and earnings sensitivity merit review.`);
    if(r.cfoNetIncome<.8)red.push(`Operating cash flow is below net income (${fmt(r.cfoNetIncome,'×')}).`);
    if(m.shareChange>3)red.push(`Diluted share count increased approximately ${fmt(m.shareChange,'%')} across the five-year sample.`);
    if(l.inventoryAlert)red.push(`Inventory growth (${fmt(l.inventoryGrowth,'%')}) exceeds sales growth (${fmt(l.salesGrowth,'%')}) by more than 5 percentage points.`);
    if(r.pe>35)red.push(`P/E is elevated at ${fmt(r.pe,'×')}; growth assumptions matter more to valuation.`);
    if(r.debtEquity>1)red.push(`Debt-to-equity of ${fmt(r.debtEquity,'×')} is above 1.0.`);
    if(c.company.dataMode==='simulated')red.push('All displayed fundamentals are simulated. Confirm company filings and live market data before relying on any metric.');
    if(!red.length)red.push('No major red flag met the chosen thresholds. Threshold screens can miss business-specific risks.');
    return {green,red};
  }
  return {buffett,lynch,flags};
})();
