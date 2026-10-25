export default async function handler(req, res) {
  // Set permissive CORS headers for cross-device requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Pragma, Cache-Control, x-device-id'
  );

  // Prevent ANY caching at Vercel CDN, Edge proxy, or client browser level
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const BASE_STORAGE_URL = 'https://extendsclass.com/api/json-storage/bin';

  try {
    if (req.method === 'POST') {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const upstreamRes = await fetch(BASE_STORAGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      if (!upstreamRes.ok) {
        return res
          .status(upstreamRes.status)
          .json({ error: `Upstream storage error (HTTP ${upstreamRes.status})` });
      }

      const data = await upstreamRes.json();
      return res.status(200).json(data);
    }

    if (req.method === 'GET') {
      const id = req.query.id;
      if (!id) {
        return res.status(400).json({ error: 'Missing vault id query parameter' });
      }

      const upstreamRes = await fetch(`${BASE_STORAGE_URL}/${encodeURIComponent(id)}?_t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
        cache: 'no-store',
      });

      if (!upstreamRes.ok) {
        return res
          .status(upstreamRes.status)
          .json({ error: `Vault not found or unavailable (HTTP ${upstreamRes.status})` });
      }

      const data = await upstreamRes.json();
      const clientDeviceId = req.headers['x-device-id'];
      if (
        clientDeviceId &&
        Array.isArray(data?.revokedDeviceIds) &&
        data.revokedDeviceIds.includes(clientDeviceId)
      ) {
        return res.status(403).json({ error: 'Device has been revoked from this sync vault.' });
      }

      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const id = req.query.id;
      if (!id) {
        return res.status(400).json({ error: 'Missing vault id query parameter' });
      }

      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const clientDeviceId = req.headers['x-device-id'] || payload?.sourceDeviceId;

      // Check if this device was revoked in the existing vault
      try {
        const checkRes = await fetch(`${BASE_STORAGE_URL}/${encodeURIComponent(id)}?_t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
          cache: 'no-store',
        });
        if (checkRes.ok) {
          const existing = await checkRes.json();
          if (
            clientDeviceId &&
            Array.isArray(existing?.revokedDeviceIds) &&
            existing.revokedDeviceIds.includes(clientDeviceId)
          ) {
            return res.status(403).json({ error: 'Device has been revoked from this sync vault.' });
          }
        }
      } catch {
        // Proceed with update if upstream pre-check could not complete
      }

      const upstreamRes = await fetch(`${BASE_STORAGE_URL}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      if (!upstreamRes.ok) {
        return res
          .status(upstreamRes.status)
          .json({ error: `Failed to update vault (HTTP ${upstreamRes.status})` });
      }

      const data = await upstreamRes.json();
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Server error occurred during vault sync',
    });
  }
}
