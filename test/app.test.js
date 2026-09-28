import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../app.js';

async function withServer(run) {
  const server = createServer(createApp());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

test('createApp serves health and JSON API errors', async () => {
  await withServer(async base => {
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).service, 'stock-fundamental-analyzer');

    const invalid = await fetch(`${base}/api/stocks/not%20valid`);
    assert.equal(invalid.status, 400);
    assert.match((await invalid.json()).error, /Ticker format is invalid/);

    const missing = await fetch(`${base}/api/not-real`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: 'API endpoint not found.' });
  });
});
