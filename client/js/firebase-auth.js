/* Firebase Authentication REST client. The server verifies every ID token with Firebase Admin. */
(() => {
  const SESSION_KEY = 'stock-analyzer-firebase-session';
  let firebaseConfig = null;
  let enabled = false;
  let session = readSession();

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  }
  function saveSession(value) {
    session = value;
    if (value) sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new CustomEvent('stock-auth-state', { detail: { user: value ? { email: value.email, uid: value.localId } : null } }));
  }
  function authUrl(method) {
    return `https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${encodeURIComponent(firebaseConfig.apiKey)}`;
  }
  async function authRequest(method, body) {
    const response = await fetch(authUrl(method), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message?.replaceAll('_', ' ') || 'Firebase Authentication request failed.');
    return payload;
  }
  async function signIn(email, password, create = false) {
    if (!enabled) throw new Error('Firebase Auth is not configured on this server.');
    const payload = await authRequest(create ? 'signUp' : 'signInWithPassword', { email, password, returnSecureToken: true });
    saveSession({ idToken: payload.idToken, refreshToken: payload.refreshToken, localId: payload.localId, email: payload.email, expiresAt: Date.now() + Number(payload.expiresIn) * 1000 });
    return session;
  }
  async function getIdToken() {
    if (!session?.idToken) throw new Error('Sign in to continue.');
    if (session.expiresAt > Date.now() + 60_000) return session.idToken;
    const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(firebaseConfig.apiKey)}`, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: session.refreshToken })
    });
    const payload = await response.json();
    if (!response.ok) { saveSession(null); throw new Error(payload?.error?.message || 'Your session expired. Sign in again.'); }
    saveSession({ idToken: payload.id_token, refreshToken: payload.refresh_token, localId: payload.user_id, email: session.email, expiresAt: Date.now() + Number(payload.expires_in) * 1000 });
    return session.idToken;
  }
  async function authorizedFetch(url, options = {}) {
    const token = await getIdToken();
    return fetch(url, { ...options, headers: { ...options.headers, authorization: `Bearer ${token}` } });
  }

  const api = {
    get user() { return session ? { email: session.email, uid: session.localId } : null; },
    get enabled() { return enabled; },
    async signIn(email, password) { return signIn(email, password); },
    async register(email, password) { return signIn(email, password, true); },
    signOut() { saveSession(null); },
    getIdToken,
    async listWatchlist() {
      const response = await authorizedFetch('/api/watchlist');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not load watchlist.');
      return payload.items;
    },
    async addTicker(ticker) {
      const response = await authorizedFetch(`/api/watchlist/${encodeURIComponent(ticker)}`, { method: 'PUT' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not save ticker.');
      return payload.items;
    },
    async removeTicker(ticker) {
      const response = await authorizedFetch(`/api/watchlist/${encodeURIComponent(ticker)}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not remove ticker.');
      return payload.items;
    }
  };
  window.StockAuth = api;

  function setFeedback(message, isError = false) {
    const feedback = document.getElementById('authFeedback');
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.toggle('text-rose-500', isError);
  }
  function renderWatchlist(items) {
    const list = document.getElementById('watchlistList');
    if (!list) return;
    if (!items.length) { list.innerHTML = '<li class="text-xs text-slate-500">No saved tickers yet.</li>'; return; }
    list.innerHTML = items.map(item => `<li><button class="watchlist-symbol" data-analyze-ticker="${item.ticker}">${item.ticker}</button><span>${String(item.name || item.dataMode).replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]))}</span><button class="watchlist-remove" data-remove-ticker="${item.ticker}" aria-label="Remove ${item.ticker}">×</button></li>`).join('');
    list.querySelectorAll('[data-analyze-ticker]').forEach(button => button.addEventListener('click', () => {
      document.getElementById('authDialog').close();
      window.dispatchEvent(new CustomEvent('stock-analyze', { detail: { ticker: button.dataset.analyzeTicker } }));
    }));
    list.querySelectorAll('[data-remove-ticker]').forEach(button => button.addEventListener('click', async () => {
      try { renderWatchlist(await api.removeTicker(button.dataset.removeTicker)); setFeedback('Ticker removed.'); }
      catch (error) { setFeedback(error.message, true); }
    }));
  }
  async function refreshWatchlist() {
    if (!api.user) { renderWatchlist([]); return; }
    try { renderWatchlist(await api.listWatchlist()); }
    catch (error) { setFeedback(error.message, true); }
  }
  function openDialog() {
    const dialog = document.getElementById('authDialog');
    if (dialog && !dialog.open) dialog.showModal();
    if (api.user) refreshWatchlist();
  }
  function updateAuthUi() {
    const user = api.user;
    document.getElementById('authFormPanel').classList.toggle('hidden', Boolean(user));
    document.getElementById('authUserPanel').classList.toggle('hidden', !user);
    document.getElementById('authDialogTitle').textContent = user ? 'Your account and watchlist' : 'Sign in to sync your watchlist';
    document.getElementById('authUserEmail').textContent = user?.email || '';
    document.getElementById('authOpen').textContent = user ? `Watchlist · ${user.email}` : 'Sign in / Watchlist';
    document.getElementById('watchlistAdd').disabled = !user;
    document.getElementById('watchlistAdd').title = user ? 'Save or remove this ticker' : 'Sign in to save tickers';
    if (user) refreshWatchlist();
  }
  async function boot() {
    for (const id of ['authFormPanel','authUserPanel','authDialogTitle','authUserEmail','authOpen','watchlistAdd']) {
      if (!document.getElementById(id)) return;
    }
    const response = await fetch('/api/config');
    const data = await response.json();
    enabled = Boolean(data.authEnabled && data.firebase?.apiKey);
    firebaseConfig = data.firebase;
    document.getElementById('authDisabled').classList.toggle('hidden', enabled);
    document.getElementById('authOpen').addEventListener('click', openDialog);
    document.getElementById('watchlistAdd').addEventListener('click', async () => {
      if (!api.user) { openDialog(); return; }
      const ticker = window.AppState?.ticker;
      if (!ticker) return;
      try { renderWatchlist(await api.addTicker(ticker)); setFeedback(`${ticker} saved to your watchlist.`); }
      catch (error) { setFeedback(error.message, true); }
    });
    document.getElementById('authSignIn').addEventListener('click', async () => submitAuth(false));
    document.getElementById('authRegister').addEventListener('click', async () => submitAuth(true));
    document.getElementById('authSignOut').addEventListener('click', () => { api.signOut(); updateAuthUi(); setFeedback('Signed out.'); });
    document.getElementById('watchlistRefresh').addEventListener('click', refreshWatchlist);
    document.getElementById('watchlistList').addEventListener('click', event => { if (event.target.closest('[data-remove-ticker]')) event.stopPropagation(); });
    window.addEventListener('stock-auth-state', updateAuthUi);
    updateAuthUi();
  }
  async function submitAuth(create) {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    if (!email || password.length < 6) { setFeedback('Enter a valid email and a password with at least 6 characters.', true); return; }
    try {
      await signIn(email, password, create);
      updateAuthUi();
      setFeedback(create ? 'Account created and signed in.' : 'Signed in successfully.');
    } catch (error) { setFeedback(error.message, true); }
  }
  document.addEventListener('DOMContentLoaded', () => boot().catch(error => { console.error('Firebase Auth setup failed:', error); setFeedback(error.message, true); }));
})();
