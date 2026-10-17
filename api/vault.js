export default async function handler(req, res) {
  // Set permissive CORS headers for cross-device requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const BASE_STORAGE_URL = 'https://extendsclass.com/api/json-storage/bin';

  try {
    if (req.method === 'POST') {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const upstreamRes = await fetch(BASE_STORAGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

      const upstreamRes = await fetch(`${BASE_STORAGE_URL}/${id}`);
      if (!upstreamRes.ok) {
        return res
          .status(upstreamRes.status)
          .json({ error: `Vault not found or unavailable (HTTP ${upstreamRes.status})` });
      }

      const data = await upstreamRes.json();
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const id = req.query.id;
      if (!id) {
        return res.status(400).json({ error: 'Missing vault id query parameter' });
      }

      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const upstreamRes = await fetch(`${BASE_STORAGE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
