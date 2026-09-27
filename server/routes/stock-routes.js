import { Router } from 'express';
import { getStockAnalysis, normalizeTicker } from '../services/stock-service.js';

export const stockRouter = Router();

stockRouter.get('/:ticker', async (req, res, next) => {
  try {
    const result = await getStockAnalysis(normalizeTicker(req.params.ticker));
    const response = { ...result, company: result.calculated.company };
    res.set('Cache-Control', response.company.dataMode === 'live' ? 'private, max-age=60' : 'no-store');
    return res.json(response);
  } catch (error) {
    return next(error);
  }
});
