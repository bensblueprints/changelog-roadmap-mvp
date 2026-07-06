// End-to-end smoke test: boots the real app on an ephemeral port with a throwaway
// data dir and exercises the full spec — admin post + request creation, public pages,
// one-vote-per-visitor (409 on repeat), RSS validity, subscribe/unsubscribe, widget.
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { createApp } = require('../server/app.js');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipnotes-smoke-'));
const ADMIN_PW = 'smoke-test-pw';
const app = createApp({ dataDir, adminPassword: ADMIN_PW });

let passed = 0;
function ok(name) {
  passed++;
  console.log(`  ✓ ${name}`);
}

// Tiny XML well-formedness checker (tags balance + single root + escaped text).
function assertWellFormedXml(xml) {
  let s = xml.trim();
  assert(s.startsWith('<?xml'), 'must start with XML declaration');
  s = s.replace(/^<\?xml[^?]*\?>/, '');
  s = s.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  const stack = [];
  const tagRe = /<(\/?)([A-Za-z_][\w:.-]*)((?:[^"'>]|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let m;
  let roots = 0;
  let last = 0;
  while ((m = tagRe.exec(s))) {
    const text = s.slice(last, m.index);
    assert(!/<|(&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;))/.test(text), `unescaped text near: ${text.slice(0, 60)}`);
    last = tagRe.lastIndex;
    const [, close, name, , selfClose] = m;
    if (close) {
      assert.strictEqual(stack.pop(), name, `mismatched closing tag </${name}>`);
      if (stack.length === 0) roots++;
    } else if (!selfClose) {
      stack.push(name);
    } else if (stack.length === 0) roots++;
  }
  assert.strictEqual(stack.length, 0, `unclosed tags: ${stack.join(',')}`);
  assert.strictEqual(roots, 1, `expected exactly 1 root element, got ${roots}`);
}

const server = app.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  let failed = false;
  try {
    // ---- admin login ----
    let r = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: ADMIN_PW })
    });
    assert.strictEqual(r.status, 200, 'login should succeed');
    const sid = r.headers.get('set-cookie').match(/sid=[^;]+/)[0];
    const adminHeaders = { 'Content-Type': 'application/json', Cookie: sid };

    r = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong' })
    });
    assert.strictEqual(r.status, 401, 'wrong password rejected');
    ok('admin login (and wrong password 401)');

    // ---- create + publish changelog post via API ----
    r = await fetch(`${base}/api/posts`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: 'Dark mode & <script> safety',
        body_md: 'We shipped **dark mode**!\n\n- Toggle in settings\n- Respects `prefers-color-scheme`',
        tags: ['New', 'Improved', 'Bogus'],
        publish: true
      })
    });
    assert.strictEqual(r.status, 201, 'post created');
    const post = await r.json();
    assert.strictEqual(post.status, 'published');
    assert.deepStrictEqual(JSON.parse(post.tags), ['New', 'Improved'], 'invalid tags filtered');
    assert(post.slug.length > 0);
    ok('admin creates + publishes changelog post');

    // ---- create feature request via public API ----
    const visitorA = 'visitor-token-aaaa';
    r = await fetch(`${base}/api/public/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-visitor-token': visitorA },
      body: JSON.stringify({ title: 'Add CSV export', body: 'Please let me export my data', email: 'req@example.com' })
    });
    assert.strictEqual(r.status, 201, 'request created');
    const reqData = await r.json();
    assert.strictEqual(reqData.status, 'pending', 'new requests await moderation');
    ok('visitor submits feature request (pending)');

    // pending requests are not votable / not public
    r = await fetch(`${base}/api/public/requests/${reqData.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-visitor-token': 'someone-else-1' },
      body: '{}'
    });
    assert.strictEqual(r.status, 404, 'pending request not votable');

    // ---- admin approves, then moves to planned (roadmap) ----
    r = await fetch(`${base}/api/requests/${reqData.id}`, {
      method: 'PUT', headers: adminHeaders, body: JSON.stringify({ status: 'open' })
    });
    assert.strictEqual(r.status, 200);
    r = await fetch(`${base}/api/requests/${reqData.id}`, {
      method: 'PUT', headers: adminHeaders, body: JSON.stringify({ status: 'planned' })
    });
    const approved = await r.json();
    assert.strictEqual(approved.status, 'planned');
    assert.strictEqual(approved.votes, 1, 'submitter auto-vote counted');
    ok('admin moderates request onto roadmap (open → planned)');

    // ---- public pages render ----
    r = await fetch(`${base}/`);
    let html = await r.text();
    assert.strictEqual(r.status, 200);
    assert(html.includes('Dark mode &amp; &lt;script&gt; safety'), 'changelog shows post title (escaped)');
    assert(html.includes('<strong>dark mode</strong>'), 'markdown rendered');
    assert(r.headers.get('set-cookie')?.includes('vt='), 'visitor token cookie set');

    r = await fetch(`${base}/post/${post.slug}`);
    assert.strictEqual(r.status, 200);
    assert((await r.text()).includes('prefers-color-scheme'), 'post page renders body');

    r = await fetch(`${base}/roadmap`);
    html = await r.text();
    assert.strictEqual(r.status, 200);
    assert(html.includes('Add CSV export'), 'roadmap shows planned request');
    assert(html.includes('Planned'), 'roadmap has Planned column');
    ok('public changelog, post, and roadmap pages render');

    // ---- voting: once per visitor, repeat 409s, second visitor increments ----
    r = await fetch(`${base}/api/public/requests/${reqData.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-visitor-token': 'visitor-token-bbbb' },
      body: '{}'
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual((await r.json()).votes, 2, 'second visitor increments to 2');

    r = await fetch(`${base}/api/public/requests/${reqData.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-visitor-token': 'visitor-token-bbbb' },
      body: '{}'
    });
    assert.strictEqual(r.status, 409, 'repeat vote from same visitor 409s');
    assert.strictEqual((await r.json()).votes, 2, 'count unchanged after repeat vote');

    r = await fetch(`${base}/api/public/requests/${reqData.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-visitor-token': 'visitor-token-cccc' },
      body: '{}'
    });
    assert.strictEqual((await r.json()).votes, 3, 'third visitor increments to 3');
    ok('upvotes: one per visitor token, repeat 409, new token increments');

    // ---- comments ----
    r = await fetch(`${base}/api/public/requests/${reqData.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-visitor-token': visitorA },
      body: JSON.stringify({ author: 'Jane', body: 'This would save me hours!' })
    });
    assert.strictEqual(r.status, 201);
    r = await fetch(`${base}/requests/${reqData.id}`);
    html = await r.text();
    assert(html.includes('This would save me hours!'), 'comment shows on request page');
    ok('comment thread on request');

    // ---- RSS ----
    r = await fetch(`${base}/rss.xml`);
    assert.strictEqual(r.status, 200);
    assert(r.headers.get('content-type').includes('rss'), 'rss content-type');
    const rss = await r.text();
    assertWellFormedXml(rss);
    assert(rss.includes('<rss version="2.0"'), 'is RSS 2.0');
    assert(rss.includes('Dark mode &amp; &lt;script&gt; safety'), 'RSS contains post title escaped');
    assert(rss.includes('<category>New</category>'), 'RSS has category tags');
    ok('RSS feed is valid, well-formed XML containing the post');

    // ---- subscribers ----
    r = await fetch(`${base}/api/public/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fan@example.com' })
    });
    assert.strictEqual(r.status, 200);
    r = await fetch(`${base}/api/public/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' })
    });
    assert.strictEqual(r.status, 400, 'bad email rejected');

    r = await fetch(`${base}/api/subscribers`, { headers: adminHeaders });
    let subs = await r.json();
    const sub = subs.find((x) => x.email === 'fan@example.com');
    assert(sub && !sub.unsubscribed_at, 'subscriber listed as active');

    // unsubscribe via token link
    const token = app.locals.db.prepare('SELECT token FROM subscribers WHERE id = ?').get(sub.id).token;
    r = await fetch(`${base}/unsubscribe?token=${token}`);
    assert.strictEqual(r.status, 200);
    assert((await r.text()).includes('unsubscribed'), 'unsubscribe page confirms');
    r = await fetch(`${base}/api/subscribers`, { headers: adminHeaders });
    subs = await r.json();
    assert(subs.find((x) => x.email === 'fan@example.com').unsubscribed_at, 'marked unsubscribed');
    r = await fetch(`${base}/unsubscribe?token=${token}`);
    assert((await r.text()).includes('Invalid link'), 'token single-use');
    ok('subscribe → listed → unsubscribed via token link');

    // ---- widget ----
    r = await fetch(`${base}/widget.js`);
    assert.strictEqual(r.status, 200);
    assert(r.headers.get('content-type').includes('javascript'), 'widget served as JS');
    assert((await r.text()).includes('sn-badge'), 'widget script has badge logic');

    r = await fetch(`${base}/api/widget/posts`);
    assert.strictEqual(r.headers.get('access-control-allow-origin'), '*', 'widget JSON is CORS-open');
    const widget = await r.json();
    assert(Array.isArray(widget.posts) && widget.posts.length === 1);
    assert.strictEqual(widget.posts[0].title, 'Dark mode & <script> safety');
    assert.deepStrictEqual(widget.posts[0].tags, ['New', 'Improved']);
    ok('widget JS served + latest-posts JSON endpoint');

    // ---- auth guard ----
    r = await fetch(`${base}/api/posts`);
    assert.strictEqual(r.status, 401, 'admin API requires auth');
    ok('admin API rejects unauthenticated requests');

    console.log(`\nAll ${passed} smoke checks passed.`);
  } catch (e) {
    failed = true;
    console.error('\nSMOKE TEST FAILED:', e.message);
    console.error(e.stack);
  } finally {
    server.close();
    try { app.locals.db.close(); } catch {}
    try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch {}
    process.exit(failed ? 1 : 0);
  }
});
