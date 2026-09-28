import { Router } from 'express';
import { getStockAnalysis, normalizeTicker } from '../services/stock-service.js';

export const stockRouter = Router();

stockRouter.get('/:ticker', async (req, res, next) => {
  try {
    const result = await getStockAnalysis(normalizeTicker(req.params.ticker));
    res.set('Cache-Control', result.calculated.company.dataMode === 'live' ? 'private, max-age=60' : 'no-store');
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});
