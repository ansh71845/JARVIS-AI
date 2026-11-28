(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JarvisNetworkDiagnostics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function isValidIpAddress(value) {
    const address = String(value || '').trim();
    if (!address || address.length > 64) return false;
    const ipv4Parts = address.split('.');
    if (ipv4Parts.length === 4 && ipv4Parts.every(part => /^\d{1,3}$/.test(part))) {
      return ipv4Parts.every(part => Number(part) >= 0 && Number(part) <= 255);
    }
    if (!/^[0-9a-f:]+$/i.test(address) || !address.includes(':')) return false;
    try {
      const parsed = new URL(`http://[${address}]/`);
      return parsed.hostname.startsWith('[') && parsed.hostname.endsWith(']');
    } catch (_) {
      return false;
    }
  }

  function calculateMbps(byteCount, elapsedMs) {
    const bytes = Number(byteCount);
    const duration = Number(elapsedMs);
    if (!Number.isFinite(bytes) || bytes <= 0 || !Number.isFinite(duration) || duration <= 0) {
      throw new RangeError('Bytes and elapsed time must be positive finite numbers.');
    }
    return (bytes * 8) / (duration / 1000) / 1_000_000;
  }

  function getConnectionSnapshot(navigatorLike) {
    const nav = navigatorLike || {};
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection || null;
    const numberOrNull = value => Number.isFinite(Number(value)) && value !== null && value !== '' ? Number(value) : null;
    return {
      online: nav.onLine !== false,
      type: connection && typeof connection.type === 'string' ? connection.type : null,
      effectiveType: connection && typeof connection.effectiveType === 'string' ? connection.effectiveType : null,
      estimatedDownlinkMbps: connection ? numberOrNull(connection.downlink) : null,
      estimatedRttMs: connection ? numberOrNull(connection.rtt) : null,
      saveData: connection && typeof connection.saveData === 'boolean' ? connection.saveData : null
    };
  }

  async function withTimeout(operation, timeoutMs) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    let timeoutId = null;
    try {
      if (controller && Number.isFinite(timeoutMs) && timeoutMs > 0) {
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      }
      return await operation(controller ? controller.signal : undefined);
    } finally {
      if (timeoutId !== null) clearTimeout(timeoutId);
    }
  }

  async function lookupPublicIp(options) {
    const opts = options || {};
    const fetchImpl = opts.fetchImpl || (typeof fetch === 'function' ? fetch : null);
    if (!fetchImpl) throw new Error('Fetch is unavailable in this browser.');
    return withTimeout(async signal => {
      const request = {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      };
      if (signal) request.signal = signal;
      const response = await fetchImpl('https://api64.ipify.org?format=json', request);
      if (!response || !response.ok) throw new Error(`Public IP provider returned HTTP ${response ? response.status : 'no response'}.`);
      const payload = await response.json();
      const ip = payload && typeof payload.ip === 'string' ? payload.ip.trim() : '';
      if (!isValidIpAddress(ip)) throw new Error('Public IP provider returned an invalid address.');
      return { ip, family: ip.includes(':') ? 'IPv6' : 'IPv4', provider: 'ipify' };
    }, opts.timeoutMs || 8000);
  }

  function createUploadPayload(byteCount) {
    const payload = new Uint8Array(byteCount);
    const cryptoApi = typeof crypto !== 'undefined' ? crypto : null;
    if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
      for (let offset = 0; offset < payload.length; offset += 65_536) {
        cryptoApi.getRandomValues(payload.subarray(offset, Math.min(offset + 65_536, payload.length)));
      }
    } else {
      for (let i = 0; i < payload.length; i += 1) payload[i] = Math.floor(Math.random() * 256);
    }
    return payload;
  }

  async function runQuickSpeedTest(options) {
    const opts = options || {};
    const fetchImpl = opts.fetchImpl || (typeof fetch === 'function' ? fetch : null);
    if (!fetchImpl) throw new Error('Fetch is unavailable in this browser.');
    const now = opts.now || (() => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()));
    const downloadBytes = Number.isInteger(opts.downloadBytes) && opts.downloadBytes > 0 ? opts.downloadBytes : 1_048_576;
    const uploadBytes = Number.isInteger(opts.uploadBytes) && opts.uploadBytes > 0 ? opts.uploadBytes : 262_144;
    const timeoutMs = opts.timeoutMs || 15_000;

    const download = await withTimeout(async signal => {
      const start = now();
      const request = {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      };
      if (signal) request.signal = signal;
      const response = await fetchImpl('https://speed.cloudflare.com/__down?bytes=' + downloadBytes, request);
      if (!response || !response.ok) throw new Error(`Download test failed with HTTP ${response ? response.status : 'no response'}.`);
      const body = await response.arrayBuffer();
      return { bytes: body.byteLength, elapsedMs: Math.max(1, now() - start) };
    }, timeoutMs);
    if (!download.bytes) throw new Error('Download test returned an empty payload.');

    const uploadPayload = opts.uploadPayload instanceof Uint8Array ? opts.uploadPayload : createUploadPayload(uploadBytes);
    const upload = await withTimeout(async signal => {
      const start = now();
      const request = {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: uploadPayload,
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      };
      if (signal) request.signal = signal;
      const response = await fetchImpl('https://speed.cloudflare.com/__up', request);
      if (!response || !response.ok) throw new Error(`Upload test failed with HTTP ${response ? response.status : 'no response'}.`);
      if (typeof response.arrayBuffer === 'function') await response.arrayBuffer();
      return { bytes: uploadPayload.byteLength, elapsedMs: Math.max(1, now() - start) };
    }, timeoutMs);

    return {
      downloadMbps: calculateMbps(download.bytes, download.elapsedMs),
      uploadMbps: calculateMbps(upload.bytes, upload.elapsedMs),
      downloadBytes: download.bytes,
      uploadBytes: upload.bytes,
      downloadElapsedMs: download.elapsedMs,
      uploadElapsedMs: upload.elapsedMs,
      provider: 'Cloudflare speed test endpoints',
      kind: 'quick estimate'
    };
  }

  return { isValidIpAddress, calculateMbps, getConnectionSnapshot, lookupPublicIp, runQuickSpeedTest };
});
