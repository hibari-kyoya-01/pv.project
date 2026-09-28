/* Application workflow and interactions. */
(() => {
  const $=id=>document.getElementById(id);let requestId=0;
  async function analyze(raw){const ticker=raw.trim().toUpperCase();StockUI.clearError();if(!ticker){StockUI.error('Enter a ticker to begin. Try AAPL, NVDA, TSLA, PTT.BK or KBANK.BK.');$('tickerInput').focus();return}
    const id=++requestId;AppState.ticker=ticker;StockUI.setView('loadingView');StockUI.loading(0);let stage=0;const timer=setInterval(()=>{if(id===requestId){stage=Math.min(stage+1,2);StockUI.loading(stage)}},1050);
    try{const result=await StockAPI.getCompany(ticker);if(id!==requestId)return;StockUI.loading(1);const calculated=result.calculated;StockUI.loading(2);const {buffett,lynch,flags}=result.analysis;await new Promise(resolve=>setTimeout(resolve,280));if(id!==requestId)return;StockUI.showDashboard(calculated,buffett,lynch,flags);}
    catch(err){if(id!==requestId)return;StockUI.setView('landing');StockUI.error(`${err.message||'Unable to analyze this ticker.'} Suggested tickers: AAPL, NVDA, TSLA, PTT.BK, KBANK.BK.`)}finally{clearInterval(timer)}
  }
  function initTheme(){const key='stock-analyzer-theme',stored=localStorage.getItem(key);if(stored)document.documentElement.classList.toggle('dark',stored==='dark');document.querySelectorAll('#themeToggle,#dashboardThemeToggle').forEach(button=>button.addEventListener('click',()=>{const dark=!document.documentElement.classList.contains('dark');document.documentElement.classList.toggle('dark',dark);localStorage.setItem(key,dark?'dark':'light');if(AppState.calculated)StockUI.renderChart(AppState.chartMode)}))}
  document.addEventListener('DOMContentLoaded',()=>{
    $('year').textContent=new Date().getFullYear();$('searchForm').addEventListener('submit',e=>{e.preventDefault();analyze($('tickerInput').value)});
    document.querySelectorAll('[data-ticker]').forEach(chip=>chip.addEventListener('click',()=>{$('tickerInput').value=chip.dataset.ticker;analyze(chip.dataset.ticker)}));
    $('backButton').addEventListener('click',()=>{requestId++;StockUI.clearError();StockUI.setView('landing');$('tickerInput').value=AppState.ticker});
    document.querySelectorAll('.chart-chip').forEach(chip=>chip.addEventListener('click',()=>StockUI.renderChart(chip.dataset.chart)));
    window.addEventListener('stock-analyze',event=>{if(event.detail?.ticker){$('tickerInput').value=event.detail.ticker;analyze(event.detail.ticker)}});
    initTheme();StockUI.bindNav();$('tickerInput').addEventListener('input',StockUI.clearError);
  });
})();
