/* Pure financial transformations. Amounts are in statement currency units. */
window.FinanceCalc = (() => {
  const safe=(n,d=0)=>Number.isFinite(n)?n:d, div=(n,d)=>d?safe(n/d):null;
  const pct=(a,b)=>b?((a/b)-1)*100:null;
  const cagr=(first,last,periods)=>first>0&&last>0&&periods>0?(Math.pow(last/first,1/periods)-1)*100:null;
  const median=a=>{const x=a.filter(Number.isFinite).sort((u,v)=>u-v);return x.length?x[Math.floor(x.length/2)]:0};
  // Keep this helper in module scope so all calculations can safely use it.
  const trend=(values,higherIsBetter=true)=>{
    const valid=values.filter(Number.isFinite);
    if(valid.length<2)return 'stable';
    const delta=valid.at(-1)-valid[0], threshold=Math.max(.025,Math.abs(valid[0])*.04);
    if(Math.abs(delta)<=threshold)return 'stable';
    return (delta>0)===higherIsBetter?'improving':'deteriorating';
  };
  function calculate(company){
    const rows=company.rows.map(r=>({...r})).sort((a,b)=>a.year-b.year), latest=rows.at(-1), prev=rows.at(-2)||latest;
    rows.forEach((r,i)=>{
      r.yoyRevenue=pct(r.revenue,rows[i-1]?.revenue);
      r.yoyEps=pct(r.eps,rows[i-1]?.eps);
      r.grossMargin=div(r.grossProfit,r.revenue)*100; r.operatingMargin=div(r.operatingIncome,r.revenue)*100; r.netMargin=div(r.netIncome,r.revenue)*100;
      r.roe=div(r.netIncome,r.equity)*100; r.roa=div(r.netIncome,r.assets)*100;
      const invested=r.equity+r.debt-r.cash; r.roic=div(r.operatingIncome*(1-.21),invested)*100;
      r.currentRatio=div(r.currentAssets,r.currentLiabilities);r.quickRatio=div(r.currentAssets-r.inventory,r.currentLiabilities);
      r.debtEquity=div(r.debt,r.equity);r.netDebtEbitda=div(r.debt-r.cash,r.operatingIncome+r.operatingIncome*.15);
      r.interestCoverage=div(r.operatingIncome,r.interestExpense);r.cfoNetIncome=div(r.cfo,r.netIncome);
      r.fcfMargin=div(r.fcf,r.revenue)*100;r.fcfYield=div(r.fcf,company.marketCap)*100;r.capexCfo=div(r.capex,r.cfo)*100;
      r.bvps=div(r.equity,r.shares);r.inventoryGrowth=pct(r.inventory,rows[i-1]?.inventory);r.shareChange=pct(r.shares,rows[i-1]?.shares);
    });
    const netIncome=latest.netIncome, eps=latest.eps, growth=cagr(rows[0].revenue,latest.revenue,rows.length-1), epsGrowth=cagr(rows[0].eps,latest.eps,rows.length-1), bvGrowth=cagr(rows[0].bvps,latest.bvps,rows.length-1);
    const pe=eps>0?company.price/eps:null, peg=epsGrowth>0?pe/epsGrowth:null, fcfps=div(latest.fcf,company.shares);
    const ratios={revenueCagr:growth,yoyRevenue:latest.yoyRevenue,epsCagr:epsGrowth,bvpsGrowth:bvGrowth,grossMargin:latest.grossMargin,operatingMargin:latest.operatingMargin,netMargin:latest.netMargin,roe:latest.roe,roa:latest.roa,roic:latest.roic,currentRatio:latest.currentRatio,quickRatio:latest.quickRatio,debtEquity:latest.debtEquity,netDebtEbitda:latest.netDebtEbitda,interestCoverage:latest.interestCoverage,cfoNetIncome:latest.cfoNetIncome,fcfMargin:latest.fcfMargin,fcfYield:latest.fcfYield,capexCfo:latest.capexCfo,pe,peg,pb:div(company.price,latest.bvps),ps:div(company.marketCap,latest.revenue),evEbitda:div(company.marketCap+latest.debt-latest.cash,latest.operatingIncome+latest.operatingIncome*.15),pFcf:div(company.marketCap,latest.fcf),dividendYield:(company.dividendYield||div(latest.dividends,company.price))*100,dividendPayout:div(latest.dividends,eps)*100,fcfps};
    const history={revenueGrowth:rows.map(r=>r.yoyRevenue),epsGrowth:rows.map(r=>r.yoyEps),grossMargin:rows.map(r=>r.grossMargin),operatingMargin:rows.map(r=>r.operatingMargin),netMargin:rows.map(r=>r.netMargin),roe:rows.map(r=>r.roe),roa:rows.map(r=>r.roa),roic:rows.map(r=>r.roic),debt:rows.map(r=>r.debt),cash:rows.map(r=>r.cash),pe:rows.map((r,i)=>r.eps>0?company.price/(r.eps*Math.pow(1.08,rows.length-i-1)):null),shares:rows.map(r=>r.shares)};
    return {company,rows,latest,prev,ratios,history,trend,median,metrics:{growth,epsGrowth,bvGrowth,avgGross:median(rows.map(r=>r.grossMargin)),avgRoe:median(rows.map(r=>r.roe)),avgRoic:median(rows.map(r=>r.roic)),avgNetIncome:median(rows.map(r=>r.netIncome)),avgFcf:median(rows.map(r=>r.fcf)),shareChange:pct(latest.shares,rows[0].shares),inventoryGrowth:latest.inventoryGrowth,salesGrowth:latest.yoyRevenue,years:rows.map(r=>r.year)}};
  }
  return {calculate,pct,cagr,trend,median};
})();
