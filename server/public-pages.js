// Server-rendered public pages: changelog, post, roadmap board, request detail.
// Zero client framework — a sprinkle of vanilla JS for votes/submits/comments.
const { marked } = require('marked');

marked.setOptions({ mangle: false, headerIds: false });

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function md(src) {
  return marked.parse(String(src || ''));
}

const TAG_COLORS = {
  New: { bg: 'rgba(52,211,153,.12)', fg: '#34d399', bd: 'rgba(52,211,153,.3)' },
  Improved: { bg: 'rgba(96,165,250,.12)', fg: '#60a5fa', bd: 'rgba(96,165,250,.3)' },
  Fixed: { bg: 'rgba(251,191,36,.12)', fg: '#fbbf24', bd: 'rgba(251,191,36,.3)' }
};

function tagBadge(tag) {
  const c = TAG_COLORS[tag] || { bg: 'rgba(161,161,170,.12)', fg: '#a1a1aa', bd: 'rgba(161,161,170,.3)' };
  return `<span class="tag" style="background:${c.bg};color:${c.fg};border-color:${c.bd}">${esc(tag)}</span>`;
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
  return isNaN(d) ? iso : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function layout({ settings, title, active, content, extraHead = '' }) {
  const accent = settings.accent || '#6366f1';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · ${esc(settings.site_name)}</title>
<link rel="alternate" type="application/rss+xml" title="${esc(settings.site_name)} RSS" href="/rss.xml">
${extraHead}
<style>
:root{--accent:${accent};--bg:#09090b;--card:#111114;--border:#26262b;--text:#e4e4e7;--muted:#8b8b94}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
header.site{border-bottom:1px solid var(--border);background:rgba(9,9,11,.85);backdrop-filter:blur(12px);position:sticky;top:0;z-index:10}
.nav{display:flex;align-items:center;gap:24px;height:60px}
.brand{font-weight:700;font-size:17px;letter-spacing:-.02em;display:flex;align-items:center;gap:9px}
.brand .dot{width:9px;height:9px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px var(--accent)}
.nav a.link{color:var(--muted);font-size:14px;font-weight:500;padding:6px 2px;border-bottom:2px solid transparent;transition:color .15s}
.nav a.link:hover{color:var(--text)}
.nav a.link.active{color:var(--text);border-bottom-color:var(--accent)}
.nav .spacer{flex:1}
.rss{color:var(--muted);font-size:13px;display:flex;align-items:center;gap:5px}
.rss:hover{color:#f97316}
.hero{padding:48px 0 8px}
.hero h1{font-size:30px;letter-spacing:-.03em;font-weight:800}
.hero p{color:var(--muted);margin-top:6px;font-size:15px}
.card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:24px;margin:18px 0;transition:border-color .15s}
.card:hover{border-color:#3a3a42}
.tag{display:inline-block;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;padding:3px 9px;border-radius:999px;border:1px solid;margin-right:6px}
.date{color:var(--muted);font-size:13px}
.post-title{font-size:20px;font-weight:700;letter-spacing:-.02em;margin:8px 0 4px}
.post-title a:hover{color:var(--accent)}
.prose{margin-top:10px;font-size:15px;color:#c9c9d1}
.prose h1,.prose h2,.prose h3{color:var(--text);margin:18px 0 8px;letter-spacing:-.02em}
.prose p{margin:10px 0}
.prose ul,.prose ol{margin:10px 0 10px 22px}
.prose code{background:#1c1c21;border:1px solid var(--border);border-radius:5px;padding:1px 6px;font-size:13px}
.prose pre{background:#1c1c21;border:1px solid var(--border);border-radius:10px;padding:14px;overflow-x:auto;margin:12px 0}
.prose pre code{border:none;background:none;padding:0}
.prose img{max-width:100%;border-radius:10px}
.prose a{color:var(--accent)}
.prose blockquote{border-left:3px solid var(--accent);padding-left:14px;color:var(--muted);margin:12px 0}
.subscribe{display:flex;gap:10px;margin:26px 0}
.subscribe input{flex:1;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:11px 14px;color:var(--text);font-size:14px;outline:none}
.subscribe input:focus{border-color:var(--accent)}
.btn{background:var(--accent);color:#fff;border:none;border-radius:10px;padding:11px 18px;font-size:14px;font-weight:600;cursor:pointer;transition:filter .15s}
.btn:hover{filter:brightness(1.12)}
.btn.ghost{background:transparent;border:1px solid var(--border);color:var(--muted)}
.btn.ghost:hover{color:var(--text);border-color:#3a3a42;filter:none}
.msg{font-size:13px;color:var(--muted);margin-top:6px;min-height:18px}
.board{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:26px 0}
@media(max-width:760px){.board{grid-template-columns:1fr}}
.col h3{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);display:flex;align-items:center;gap:8px;margin-bottom:12px}
.col h3 .pip{width:8px;height:8px;border-radius:50%}
.req{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px;display:flex;gap:12px;align-items:flex-start}
.req:hover{border-color:#3a3a42}
.req .t{font-size:14px;font-weight:600;line-height:1.4}
.req .t a:hover{color:var(--accent)}
.req .b{font-size:13px;color:var(--muted);margin-top:3px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.vote{display:flex;flex-direction:column;align-items:center;gap:2px;background:#1c1c21;border:1px solid var(--border);border-radius:9px;padding:7px 11px;cursor:pointer;color:var(--muted);font-size:13px;font-weight:700;min-width:44px;transition:all .15s;user-select:none}
.vote:hover{border-color:var(--accent);color:var(--accent)}
.vote.voted{border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent)}
.vote .arr{font-size:11px;line-height:1}
.comments{margin-top:26px}
.comment{border-left:2px solid var(--border);padding:8px 0 8px 14px;margin:10px 0}
.comment.admin{border-left-color:var(--accent)}
.comment .who{font-size:13px;font-weight:600}
.comment .who .badge{font-size:10px;background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--accent);padding:1px 7px;border-radius:99px;margin-left:6px;text-transform:uppercase;letter-spacing:.05em}
.comment .body{font-size:14px;color:#c9c9d1;margin-top:2px;white-space:pre-wrap}
textarea,input[type=text],input[type=email]{width:100%;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:11px 14px;color:var(--text);font-size:14px;outline:none;font-family:inherit}
textarea:focus,input:focus{border-color:var(--accent)}
textarea{resize:vertical;min-height:80px}
.formrow{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}
@media(max-width:560px){.formrow{grid-template-columns:1fr}}
footer.site{border-top:1px solid var(--border);margin-top:64px;padding:26px 0;color:var(--muted);font-size:13px;text-align:center}
footer.site a{color:var(--muted)}
footer.site a:hover{color:var(--text)}
.empty{color:var(--muted);font-size:14px;padding:26px 0;text-align:center}
.status-note{font-size:13px;padding:10px 14px;border-radius:10px;margin:14px 0;border:1px solid}
.declined{background:rgba(248,113,113,.08);color:#f87171;border-color:rgba(248,113,113,.25)}
.shipped-note{background:rgba(52,211,153,.08);color:#34d399;border-color:rgba(52,211,153,.25)}
</style>
</head>
<body>
<header class="site"><div class="wrap nav">
  <a class="brand" href="/"><span class="dot"></span>${esc(settings.site_name)}</a>
  <a class="link${active === 'changelog' ? ' active' : ''}" href="/">Changelog</a>
  <a class="link${active === 'roadmap' ? ' active' : ''}" href="/roadmap">Roadmap</a>
  <span class="spacer"></span>
  <a class="rss" href="/rss.xml" title="RSS feed">RSS</a>
</div></header>
<main class="wrap">${content}</main>
<footer class="site"><div class="wrap">Powered by <a href="https://github.com/bensblueprints" target="_blank" rel="noopener">Shipnotes</a> — self-hosted changelog &amp; roadmap</div></footer>
<script>
window.SN = {
  api: async function(url, opts) {
    const r = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  }
};
</script>
</body>
</html>`;
}

// ---------------- Changelog ----------------

function renderChangelog({ settings, posts }) {
  const list = posts.length
    ? posts
        .map((p) => {
          const tags = JSON.parse(p.tags || '[]');
          return `<article class="card">
  <div>${tags.map(tagBadge).join('')}<span class="date">${fmtDate(p.published_at)}</span></div>
  <h2 class="post-title"><a href="/post/${esc(p.slug)}">${esc(p.title)}</a></h2>
  <div class="prose">${md(p.body_md)}</div>
</article>`;
        })
        .join('\n')
    : '<p class="empty">No updates published yet. Check back soon!</p>';

  const content = `
<div class="hero"><h1>Changelog</h1><p>${esc(settings.site_tagline)}</p></div>
<form class="subscribe" id="subForm">
  <input type="email" id="subEmail" placeholder="you@example.com — get new updates by email" required>
  <button class="btn" type="submit">Subscribe</button>
</form>
<p class="msg" id="subMsg"></p>
${list}
<script>
document.getElementById('subForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('subEmail').value.trim();
  const r = await SN.api('/api/public/subscribe', { method: 'POST', body: JSON.stringify({ email }) });
  document.getElementById('subMsg').textContent = r.ok ? "You're subscribed! We'll email you when something ships." : (r.data.error || 'Something went wrong');
  if (r.ok) document.getElementById('subEmail').value = '';
});
</script>`;
  return layout({ settings, title: 'Changelog', active: 'changelog', content });
}

function renderPost({ settings, post }) {
  const tags = JSON.parse(post.tags || '[]');
  const content = `
<div class="hero">
  <p><a href="/" style="color:var(--muted);font-size:13px">← All updates</a></p>
  <div style="margin-top:14px">${tags.map(tagBadge).join('')}<span class="date">${fmtDate(post.published_at)}</span></div>
  <h1 style="margin-top:8px">${esc(post.title)}</h1>
</div>
<div class="prose" style="font-size:16px">${md(post.body_md)}</div>`;
  return layout({ settings, title: post.title, active: 'changelog', content });
}

// ---------------- Roadmap ----------------

const COLUMNS = [
  { key: 'planned', label: 'Planned', pip: '#a78bfa' },
  { key: 'in_progress', label: 'In Progress', pip: '#60a5fa' },
  { key: 'shipped', label: 'Shipped', pip: '#34d399' }
];

function requestCard(r, votedSet) {
  const voted = votedSet.has(r.id);
  return `<div class="req">
  <button class="vote${voted ? ' voted' : ''}" data-id="${r.id}" title="Upvote">
    <span class="arr">▲</span><span class="count">${r.votes}</span>
  </button>
  <div style="flex:1;min-width:0">
    <div class="t"><a href="/requests/${r.id}">${esc(r.title)}</a></div>
    ${r.body ? `<div class="b">${esc(r.body)}</div>` : ''}
    <div class="date" style="margin-top:5px">${r.comment_count} comment${r.comment_count === 1 ? '' : 's'}</div>
  </div>
</div>`;
}

function renderRoadmap({ settings, requests, open, votedIds }) {
  const votedSet = new Set(votedIds);
  const cols = COLUMNS.map((c) => {
    const items = requests.filter((r) => r.status === c.key);
    return `<div class="col">
  <h3><span class="pip" style="background:${c.pip}"></span>${c.label} <span style="font-weight:400">(${items.length})</span></h3>
  ${items.map((r) => requestCard(r, votedSet)).join('\n') || '<p class="empty" style="padding:12px 0;font-size:13px">Nothing here yet</p>'}
</div>`;
  }).join('\n');

  const openList = open.map((r) => requestCard(r, votedSet)).join('\n') || '<p class="empty">No open requests — be the first to suggest something!</p>';

  const content = `
<div class="hero"><h1>Roadmap</h1><p>What we're planning, building, and shipping. Vote on what matters to you.</p></div>
<div class="board">${cols}</div>

<h2 style="font-size:20px;letter-spacing:-.02em;margin:36px 0 4px">Feature requests</h2>
<p class="date">Have an idea? Submit it below — most-voted requests make it onto the roadmap.</p>
<div class="card">
  <form id="reqForm">
    <input type="text" id="reqTitle" placeholder="Feature title (short and sweet)" required maxlength="140">
    <div style="margin:10px 0"><textarea id="reqBody" placeholder="Describe the feature and why it would help you (optional)"></textarea></div>
    <div class="formrow">
      <input type="email" id="reqEmail" placeholder="Your email (optional — for updates)">
      <button class="btn" type="submit">Submit request</button>
    </div>
    <p class="msg" id="reqMsg"></p>
  </form>
</div>
<div id="openList">${openList}</div>
<script>
document.getElementById('reqForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const r = await SN.api('/api/public/requests', { method: 'POST', body: JSON.stringify({
    title: document.getElementById('reqTitle').value.trim(),
    body: document.getElementById('reqBody').value.trim(),
    email: document.getElementById('reqEmail').value.trim() || null
  })});
  const msg = document.getElementById('reqMsg');
  if (r.ok) { msg.textContent = 'Thanks! Your request is in — it will appear once approved.'; e.target.reset(); }
  else msg.textContent = r.data.error || 'Something went wrong';
});
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.vote');
  if (!btn) return;
  const r = await SN.api('/api/public/requests/' + btn.dataset.id + '/vote', { method: 'POST', body: '{}' });
  if (r.ok) {
    btn.querySelector('.count').textContent = r.data.votes;
    btn.classList.add('voted');
  } else if (r.status === 409) {
    btn.classList.add('voted');
  }
});
</script>`;
  return layout({ settings, title: 'Roadmap', active: 'roadmap', content });
}

const STATUS_LABELS = {
  pending: 'Pending review', open: 'Open', planned: 'Planned',
  in_progress: 'In progress', shipped: 'Shipped', declined: 'Declined', merged: 'Merged'
};

function renderRequestDetail({ settings, request, comments, voted }) {
  const statusNote =
    request.status === 'declined'
      ? `<div class="status-note declined"><strong>Declined</strong>${request.decline_reason ? ' — ' + esc(request.decline_reason) : ''}</div>`
      : request.status === 'shipped'
        ? `<div class="status-note shipped-note"><strong>Shipped!</strong> This feature is live.</div>`
        : '';

  const content = `
<div class="hero">
  <p><a href="/roadmap" style="color:var(--muted);font-size:13px">← Roadmap</a></p>
  <div style="display:flex;gap:16px;align-items:flex-start;margin-top:16px">
    <button class="vote${voted ? ' voted' : ''}" data-id="${request.id}" style="padding:10px 14px">
      <span class="arr">▲</span><span class="count" style="font-size:16px">${request.votes}</span>
    </button>
    <div>
      <h1 style="font-size:24px">${esc(request.title)}</h1>
      <p class="date" style="margin-top:4px">${esc(STATUS_LABELS[request.status] || request.status)} · ${fmtDate(request.created_at)}</p>
    </div>
  </div>
</div>
${statusNote}
${request.body ? `<div class="prose">${md(request.body)}</div>` : ''}
<div class="comments">
  <h2 style="font-size:17px;letter-spacing:-.02em">Comments (${comments.length})</h2>
  ${comments
    .map(
      (c) => `<div class="comment${c.is_admin ? ' admin' : ''}">
    <div class="who">${esc(c.author)}${c.is_admin ? '<span class="badge">Team</span>' : ''} <span class="date" style="font-weight:400">· ${fmtDate(c.created_at)}</span></div>
    <div class="body">${esc(c.body)}</div>
  </div>`
    )
    .join('\n')}
  <div class="card" style="margin-top:18px">
    <form id="cForm">
      <div class="formrow"><input type="text" id="cAuthor" placeholder="Your name (optional)" maxlength="60"></div>
      <textarea id="cBody" placeholder="Add a comment…" required></textarea>
      <div style="margin-top:10px;display:flex;justify-content:flex-end"><button class="btn" type="submit">Comment</button></div>
      <p class="msg" id="cMsg"></p>
    </form>
  </div>
</div>
<script>
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.vote');
  if (!btn) return;
  const r = await SN.api('/api/public/requests/' + btn.dataset.id + '/vote', { method: 'POST', body: '{}' });
  if (r.ok) { btn.querySelector('.count').textContent = r.data.votes; btn.classList.add('voted'); }
  else if (r.status === 409) btn.classList.add('voted');
});
document.getElementById('cForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const r = await SN.api('/api/public/requests/${request.id}/comments', { method: 'POST', body: JSON.stringify({
    author: document.getElementById('cAuthor').value.trim() || 'Anonymous',
    body: document.getElementById('cBody').value.trim()
  })});
  if (r.ok) location.reload();
  else document.getElementById('cMsg').textContent = r.data.error || 'Something went wrong';
});
</script>`;
  return layout({ settings, title: request.title, active: 'roadmap', content });
}

function renderUnsubscribe({ settings, ok }) {
  const content = `
<div class="hero" style="text-align:center;padding-top:80px">
  <h1>${ok ? "You're unsubscribed" : 'Invalid link'}</h1>
  <p>${ok ? "You won't receive any more update emails from us. Changed your mind? Just re-subscribe on the changelog." : 'This unsubscribe link is invalid or was already used.'}</p>
  <p style="margin-top:20px"><a class="btn" href="/" style="display:inline-block">Back to changelog</a></p>
</div>`;
  return layout({ settings, title: 'Unsubscribe', active: '', content });
}

module.exports = { renderChangelog, renderPost, renderRoadmap, renderRequestDetail, renderUnsubscribe, md, esc };
