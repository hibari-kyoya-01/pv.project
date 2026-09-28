import test from 'node:test';
import assert from 'node:assert/strict';
import { createStockService } from '../server/services/stock-service.js';
import { createMockCompany } from '../server/services/mock-provider.js';

const liveCompany = ticker => ({ ...createMockCompany(ticker), dataMode: 'live', source: 'test fixture' });

test('simulated results are neither cached nor saved', async () => {
  let calls = 0, writes = 0;
  const service = createStockService({ pool: null, demoFallback: false,
    providers: [['fixture', async ticker => { calls += 1; return createMockCompany(ticker); }]],
    saveCompany: async () => { writes += 1; }
  });
  await service.getStockAnalysis('SIM');
  await service.getStockAnalysis('SIM');
  assert.equal(calls, 2);
  assert.equal(writes, 0);
  assert.equal(service.memory.size, 0);
});

test('provider failure with demo fallback disabled returns a 502 error', async () => {
  const service = createStockService({ pool: null, demoFallback: false, providers: [['fixture', async () => { throw new Error('offline'); }]] });
  await assert.rejects(service.getStockAnalysis('DOWN'), error => error.status === 502 && /offline/.test(error.message));
});

test('concurrent requests for one ticker share a provider request', async () => {
  let calls = 0;
  const service = createStockService({ pool: null, demoFallback: false, providers: [['fixture', async ticker => {
    calls += 1;
    await new Promise(resolve => setTimeout(resolve, 20));
    return liveCompany(ticker);
  }]] });
  const [first, second] = await Promise.all([service.getStockAnalysis('ONCE'), service.getStockAnalysis('ONCE')]);
  assert.equal(calls, 1);
  assert.equal(first.calculated.company.ticker, second.calculated.company.ticker);
  assert.equal(service.inFlight.size, 0);
});
