const BASE = '/api';
let _campaignId = null;

export function setCampaignId(id) { _campaignId = id ? Number(id) : null; }

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (_campaignId) headers['X-Campaign-Id'] = String(_campaignId);
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
