// Minimal, valid RSS 2.0 feed builder — no dependencies.
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function rfc822(iso) {
  const d = iso ? new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z')) : new Date();
  return isNaN(d) ? new Date().toUTCString() : d.toUTCString();
}

function buildRss({ settings, posts, origin, postHtml }) {
  const base = (settings.site_url || origin || '').replace(/\/$/, '');
  const items = posts
    .map((p) => {
      const tags = JSON.parse(p.tags || '[]');
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(`${base}/post/${p.slug}`)}</link>
      <guid isPermaLink="true">${esc(`${base}/post/${p.slug}`)}</guid>
      <pubDate>${rfc822(p.published_at)}</pubDate>
${tags.map((t) => `      <category>${esc(t)}</category>`).join('\n')}
      <description>${esc(postHtml(p.body_md))}</description>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(settings.site_name)}</title>
    <link>${esc(base || '/')}</link>
    <description>${esc(settings.site_tagline)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${esc(`${base}/rss.xml`)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

module.exports = { buildRss };
