const test = require('node:test');
const assert = require('node:assert/strict');
const diagnostics = require('../www/network-diagnostics.js');

test('validates IPv4 and IPv6 and rejects malformed values', () => {
  assert.equal(diagnostics.isValidIpAddress('203.0.113.8'), true);
  assert.equal(diagnostics.isValidIpAddress('2001:4860:4860::8888'), true);
  assert.equal(diagnostics.isValidIpAddress('256.1.1.1'), false);
  assert.equal(diagnostics.isValidIpAddress('not-an-ip'), false);
  assert.equal(diagnostics.isValidIpAddress(''), false);
});

test('calculates Mbps using decimal megabits and rejects invalid timing', () => {
  assert.equal(diagnostics.calculateMbps(1_000_000, 1000), 8);
  assert.throws(() => diagnostics.calculateMbps(0, 100), RangeError);
  assert.throws(() => diagnostics.calculateMbps(100, 0), RangeError);
});

test('reports limited Network Information API values as estimates', () => {
  const snapshot = diagnostics.getConnectionSnapshot({
    onLine: true,
    connection: { type: 'wifi', effectiveType: '4g', downlink: 12.5, rtt: 80, saveData: false }
  });
  assert.deepEqual(snapshot, {
    online: true, type: 'wifi', effectiveType: '4g',
    estimatedDownlinkMbps: 12.5, estimatedRttMs: 80, saveData: false
  });
  assert.equal(diagnostics.getConnectionSnapshot({ onLine: false }).online, false);
  assert.equal(diagnostics.getConnectionSnapshot({}).estimatedDownlinkMbps, null);
});

test('looks up public IP without credentials or referrer and validates provider response', async () => {
  let request;
  const result = await diagnostics.lookupPublicIp({
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ ip: '2001:4860:4860::8888' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }
  });
  assert.equal(result.family, 'IPv6');
  assert.equal(request.options.credentials, 'omit');
  assert.equal(request.options.referrerPolicy, 'no-referrer');
  assert.equal(request.options.cache, 'no-store');
  await assert.rejects(() => diagnostics.lookupPublicIp({
    fetchImpl: async () => new Response(JSON.stringify({ ip: 'fake' }), { status: 200 })
  }), /invalid address/);
});

test('runs a quick download and upload measurement and returns measured byte counts', async () => {
  const calls = [];
  let tick = 0;
  const result = await diagnostics.runQuickSpeedTest({
    downloadBytes: 1024,
    uploadBytes: 512,
    uploadPayload: new Uint8Array(512),
    now: () => { tick += 500; return tick; },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.includes('__down')) return new Response(new Uint8Array(1024), { status: 200 });
      return new Response(null, { status: 204 });
    }
  });
  assert.equal(result.downloadBytes, 1024);
  assert.equal(result.uploadBytes, 512);
  assert.ok(result.downloadMbps > 0);
  assert.ok(result.uploadMbps > 0);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(calls[1].options.credentials, 'omit');
  assert.equal(calls[1].options.referrerPolicy, 'no-referrer');
});

test('surfaces failed transfer requests rather than inventing a measurement', async () => {
  await assert.rejects(() => diagnostics.runQuickSpeedTest({
    fetchImpl: async () => new Response('unavailable', { status: 503 })
  }), /Download test failed with HTTP 503/);
});
