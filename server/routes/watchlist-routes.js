import { Router } from 'express';
import { requireFirebaseUser } from '../middleware/require-firebase-user.js';
import { addWatchlistTicker, listWatchlist, removeWatchlistTicker } from '../repositories/watchlist-repository.js';
import { getCompanyForWatchlist, normalizeTicker } from '../services/stock-service.js';

export const watchlistRouter = Router();
watchlistRouter.use(requireFirebaseUser);

watchlistRouter.get('/', async (req, res, next) => {
  try { return res.json({ items: await listWatchlist(req.firebaseUser.uid) }); }
  catch (error) { return next(error); }
});

watchlistRouter.put('/:ticker', async (req, res, next) => {
  try {
    const ticker = normalizeTicker(req.params.ticker);
    await getCompanyForWatchlist(ticker);
    return res.status(200).json({ items: await addWatchlistTicker(req.firebaseUser.uid, ticker), ticker });
  } catch (error) { return next(error); }
});

watchlistRouter.delete('/:ticker', async (req, res, next) => {
  try { return res.json({ items: await removeWatchlistTicker(req.firebaseUser.uid, normalizeTicker(req.params.ticker)) }); }
  catch (error) { return next(error); }
});
