async function req(url, opts = {}) {
  const r = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...opts
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || `HTTP ${r.status}`), { status: r.status, data });
  return data;
}

export const api = {
  get: (url) => req(url),
  post: (url, body) => req(url, { method: 'POST', body: JSON.stringify(body || {}) }),
  put: (url, body) => req(url, { method: 'PUT', body: JSON.stringify(body || {}) }),
  del: (url) => req(url, { method: 'DELETE' })
};
