const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const { openDb, getSettings, setSettings, uniqueSlug } = require('./db');
const pages = require('./public-pages');
const { buildRss } = require('./rss');
const { widgetSource } = require('./widget');
const { notifySubscribers, smtpConfig } = require('./mailer');

const TAGS = ['New', 'Improved', 'Fixed'];
const REQUEST_STATUSES = ['pending', 'open', 'planned', 'in_progress', 'shipped', 'declined', 'merged'];
const PUBLIC_STATUSES = ['open', 'planned', 'in_progress', 'shipped'];

function createApp(opts = {}) {
  const dataDir = opts.dataDir || process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  const adminPassword = opts.adminPassword || process.env.ADMIN_PASSWORD || 'admin';
  const autologinToken = opts.autologinToken || process.env.AUTOLOGIN_TOKEN || null;

  const db = openDb(dataDir);
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // ---- admin sessions (in-memory, simple by design) ----
  const sessions = new Set();
  function newSession(res) {
    const sid = crypto.randomBytes(24).toString('hex');
    sessions.add(sid);
    res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000 });
    return sid;
  }
  function requireAuth(req, res, next) {
    if (req.cookies.sid && sessions.has(req.cookies.sid)) return next();
    res.status(401).json({ error: 'Unauthorized' });
  }

  // ---- visitor tokens (anonymous, one vote per visitor) ----
  // Priority: explicit header (API clients / smoke test) > cookie > new cookie.
  function visitorToken(req, res) {
    const fromHeader = req.get('x-visitor-token');
    if (fromHeader && /^[a-zA-Z0-9_-]{8,64}$/.test(fromHeader)) return fromHeader;
    if (req.cookies.vt && /^[a-f0-9]{32}$/.test(req.cookies.vt)) return req.cookies.vt;
    const vt = crypto.randomBytes(16).toString('hex');
    if (res) res.cookie('vt', vt, { httpOnly: true, sameSite: 'lax', maxAge: 365 * 24 * 3600 * 1000 });
    return vt;
  }

  // ---- query helpers ----
  const publishedPosts = () =>
    db.prepare(`SELECT * FROM posts WHERE status = 'published' ORDER BY published_at DESC, id DESC`).all();

  const requestWithCounts = `
    SELECT r.*,
      (SELECT COUNT(*) FROM votes v WHERE v.request_id = r.id) AS votes,
      (SELECT COUNT(*) FROM comments c WHERE c.request_id = r.id) AS comment_count
    FROM requests r`;

  function votedRequestIds(vt) {
    return db.prepare('SELECT request_id FROM votes WHERE visitor_token = ?').all(vt).map((r) => r.request_id);
  }

  // ================= PUBLIC PAGES =================

  app.get('/', (req, res) => {
    visitorToken(req, res);
    const settings = getSettings(db);
    res.set('Cache-Control', 'no-store');
    res.type('html').send(pages.renderChangelog({ settings, posts: publishedPosts() }));
  });

  app.get('/post/:slug', (req, res) => {
    visitorToken(req, res);
    const settings = getSettings(db);
    const post = db.prepare(`SELECT * FROM posts WHERE slug = ? AND status = 'published'`).get(req.params.slug);
    if (!post) return res.status(404).type('html').send(pages.renderChangelog({ settings, posts: publishedPosts() }));
    res.type('html').send(pages.renderPost({ settings, post }));
  });

  app.get('/roadmap', (req, res) => {
    const vt = visitorToken(req, res);
    const settings = getSettings(db);
    const all = db.prepare(`${requestWithCounts} WHERE r.status IN ('planned','in_progress','shipped') ORDER BY votes DESC, r.id DESC`).all();
    const open = db.prepare(`${requestWithCounts} WHERE r.status = 'open' ORDER BY votes DESC, r.id DESC`).all();
    res.set('Cache-Control', 'no-store');
    res.type('html').send(pages.renderRoadmap({ settings, requests: all, open, votedIds: votedRequestIds(vt) }));
  });

  app.get('/requests/:id', (req, res) => {
    const vt = visitorToken(req, res);
    const settings = getSettings(db);
    const request = db.prepare(`${requestWithCounts} WHERE r.id = ?`).get(req.params.id);
    if (!request || !PUBLIC_STATUSES.includes(request.status) && request.status !== 'declined') {
      return res.redirect('/roadmap');
    }
    const comments = db.prepare('SELECT * FROM comments WHERE request_id = ? ORDER BY created_at ASC, id ASC').all(request.id);
    res.set('Cache-Control', 'no-store');
    res.type('html').send(pages.renderRequestDetail({ settings, request, comments, voted: votedRequestIds(vt).includes(request.id) }));
  });

  app.get('/rss.xml', (req, res) => {
    const settings = getSettings(db);
    const origin = `${req.protocol}://${req.get('host')}`;
    res.type('application/rss+xml').send(buildRss({ settings, posts: publishedPosts(), origin, postHtml: pages.md }));
  });

  app.get('/unsubscribe', (req, res) => {
    const settings = getSettings(db);
    const token = String(req.query.token || '');
    const sub = token ? db.prepare('SELECT * FROM subscribers WHERE token = ? AND unsubscribed_at IS NULL').get(token) : null;
    if (sub) db.prepare(`UPDATE subscribers SET unsubscribed_at = datetime('now') WHERE id = ?`).run(sub.id);
    res.type('html').send(pages.renderUnsubscribe({ settings, ok: !!sub }));
  });

  // ================= WIDGET =================

  app.get('/widget.js', (req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.type('application/javascript').send(widgetSource());
  });

  app.get('/api/widget/posts', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    const posts = db
      .prepare(`SELECT id, title, slug, tags, published_at FROM posts WHERE status = 'published' ORDER BY published_at DESC, id DESC LIMIT 10`)
      .all()
      .map((p) => ({ ...p, tags: JSON.parse(p.tags || '[]') }));
    res.json({ posts });
  });

  // ================= PUBLIC API =================

  app.post('/api/public/subscribe', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }
    const existing = db.prepare('SELECT * FROM subscribers WHERE email = ?').get(email);
    if (existing) {
      // re-subscribe if previously unsubscribed
      db.prepare('UPDATE subscribers SET unsubscribed_at = NULL WHERE id = ?').run(existing.id);
    } else {
      db.prepare('INSERT INTO subscribers (email, token) VALUES (?, ?)').run(email, crypto.randomBytes(20).toString('hex'));
    }
    res.json({ ok: true });
  });

  app.post('/api/public/requests', (req, res) => {
    const vt = visitorToken(req, res);
    const title = String(req.body?.title || '').trim();
    const body = String(req.body?.body || '').trim();
    const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : null;
    if (title.length < 3) return res.status(400).json({ error: 'Title must be at least 3 characters' });
    if (title.length > 140) return res.status(400).json({ error: 'Title too long (max 140)' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
    const info = db
      .prepare('INSERT INTO requests (title, body, email, visitor_token) VALUES (?, ?, ?, ?)')
      .run(title, body.slice(0, 4000), email, vt);
    // submitter auto-votes their own request
    db.prepare('INSERT OR IGNORE INTO votes (request_id, visitor_token, email) VALUES (?, ?, ?)').run(info.lastInsertRowid, vt, email);
    res.status(201).json({ ok: true, id: info.lastInsertRowid, status: 'pending' });
  });

  app.post('/api/public/requests/:id/vote', (req, res) => {
    const vt = visitorToken(req, res);
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
    if (!request || !PUBLIC_STATUSES.includes(request.status)) {
      return res.status(404).json({ error: 'Request not found' });
    }
    const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : null;
    try {
      db.prepare('INSERT INTO votes (request_id, visitor_token, email) VALUES (?, ?, ?)').run(request.id, vt, email);
    } catch (e) {
      if (/UNIQUE/.test(String(e))) {
        const votes = db.prepare('SELECT COUNT(*) AS n FROM votes WHERE request_id = ?').get(request.id).n;
        return res.status(409).json({ error: 'Already voted', votes });
      }
      throw e;
    }
    const votes = db.prepare('SELECT COUNT(*) AS n FROM votes WHERE request_id = ?').get(request.id).n;
    res.json({ ok: true, votes });
  });

  app.get('/api/public/requests/:id/comments', (req, res) => {
    res.json(db.prepare('SELECT id, author, body, is_admin, created_at FROM comments WHERE request_id = ? ORDER BY created_at ASC, id ASC').all(req.params.id));
  });

  app.post('/api/public/requests/:id/comments', (req, res) => {
    const vt = visitorToken(req, res);
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
    if (!request || !PUBLIC_STATUSES.includes(request.status)) {
      return res.status(404).json({ error: 'Request not found' });
    }
    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Comment cannot be empty' });
    const author = String(req.body?.author || 'Anonymous').trim().slice(0, 60) || 'Anonymous';
    const info = db
      .prepare('INSERT INTO comments (request_id, author, body, visitor_token) VALUES (?, ?, ?, ?)')
      .run(request.id, author, body.slice(0, 4000), vt);
    res.status(201).json({ ok: true, id: info.lastInsertRowid });
  });

  // ================= AUTH =================

  app.post('/api/login', (req, res) => {
    const pw = String(req.body?.password || '');
    const a = Buffer.from(pw);
    const b = Buffer.from(adminPassword);
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!ok) return res.status(401).json({ error: 'Wrong password' });
    newSession(res);
    res.json({ ok: true });
  });

  app.post('/api/logout', (req, res) => {
    sessions.delete(req.cookies.sid);
    res.clearCookie('sid');
    res.json({ ok: true });
  });

  app.get('/api/me', (req, res) => {
    res.json({ authed: !!(req.cookies.sid && sessions.has(req.cookies.sid)) });
  });

  // desktop-mode auto-login
  if (autologinToken) {
    app.get('/auth/auto', (req, res) => {
      if (req.query.token !== autologinToken) return res.status(403).send('Forbidden');
      newSession(res);
      res.redirect('/admin');
    });
  }

  // ================= ADMIN API =================

  // ---- posts ----
  const cleanTags = (tags) => (Array.isArray(tags) ? tags.filter((t) => TAGS.includes(t)) : []);

  app.get('/api/posts', requireAuth, (req, res) => {
    res.json(db.prepare('SELECT * FROM posts ORDER BY COALESCE(published_at, created_at) DESC, id DESC').all());
  });

  app.post('/api/posts', requireAuth, async (req, res) => {
    const title = String(req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Title required' });
    const body_md = String(req.body?.body_md || '');
    const tags = JSON.stringify(cleanTags(req.body?.tags));
    const publish = !!req.body?.publish;
    const slug = uniqueSlug(db, title);
    const info = db
      .prepare(
        `INSERT INTO posts (title, slug, body_md, tags, status, published_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(title, slug, body_md, tags, publish ? 'published' : 'draft', publish ? new Date().toISOString() : null);
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(info.lastInsertRowid);
    let notify = null;
    if (publish) notify = await maybeNotify(post);
    res.status(201).json({ ...post, notify });
  });

  app.put('/api/posts/:id', requireAuth, async (req, res) => {
    const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const title = String(req.body?.title ?? existing.title).trim() || existing.title;
    const body_md = String(req.body?.body_md ?? existing.body_md);
    const tags = req.body?.tags !== undefined ? JSON.stringify(cleanTags(req.body.tags)) : existing.tags;
    const slug = title !== existing.title ? uniqueSlug(db, title, existing.id) : existing.slug;

    let status = existing.status;
    let published_at = existing.published_at;
    const wasDraft = existing.status === 'draft';
    if (req.body?.publish === true && wasDraft) {
      status = 'published';
      published_at = new Date().toISOString();
    } else if (req.body?.publish === false) {
      status = 'draft';
    }

    db.prepare(
      `UPDATE posts SET title=?, slug=?, body_md=?, tags=?, status=?, published_at=?, updated_at=datetime('now') WHERE id=?`
    ).run(title, slug, body_md, tags, status, published_at, existing.id);
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(existing.id);
    let notify = null;
    if (wasDraft && status === 'published') notify = await maybeNotify(post);
    res.json({ ...post, notify });
  });

  app.delete('/api/posts/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  async function maybeNotify(post) {
    if (post.notified) return { sent: 0, skipped: 0, reason: 'already notified' };
    const settings = getSettings(db);
    const subscribers = db.prepare('SELECT * FROM subscribers WHERE unsubscribed_at IS NULL').all();
    const result = await notifySubscribers({ settings, post, subscribers, postHtml: pages.md(post.body_md) });
    if (result.sent > 0) db.prepare('UPDATE posts SET notified = 1 WHERE id = ?').run(post.id);
    return result;
  }

  // ---- feature requests moderation ----
  app.get('/api/requests', requireAuth, (req, res) => {
    const status = req.query.status;
    const rows = status && REQUEST_STATUSES.includes(status)
      ? db.prepare(`${requestWithCounts} WHERE r.status = ? ORDER BY votes DESC, r.id DESC`).all(status)
      : db.prepare(`${requestWithCounts} ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, votes DESC, r.id DESC`).all();
    res.json(rows);
  });

  app.put('/api/requests/:id', requireAuth, (req, res) => {
    const existing = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const status = req.body?.status;
    if (status && !REQUEST_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    if (status === 'merged') {
      const into = Number(req.body?.merged_into);
      const target = db.prepare('SELECT * FROM requests WHERE id = ?').get(into);
      if (!target || target.id === existing.id) return res.status(400).json({ error: 'Invalid merge target' });
      db.transaction(() => {
        // move votes across (ignore duplicates so one visitor still counts once)
        db.prepare('INSERT OR IGNORE INTO votes (request_id, visitor_token, email) SELECT ?, visitor_token, email FROM votes WHERE request_id = ?').run(target.id, existing.id);
        db.prepare('DELETE FROM votes WHERE request_id = ?').run(existing.id);
        db.prepare('UPDATE comments SET request_id = ? WHERE request_id = ?').run(target.id, existing.id);
        db.prepare(`UPDATE requests SET status='merged', merged_into=?, updated_at=datetime('now') WHERE id=?`).run(target.id, existing.id);
      })();
    } else {
      const decline_reason = status === 'declined' ? String(req.body?.decline_reason || '').trim() || null : existing.decline_reason;
      db.prepare(
        `UPDATE requests SET
           title = ?, body = ?, status = COALESCE(?, status), decline_reason = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        String(req.body?.title ?? existing.title).trim() || existing.title,
        String(req.body?.body ?? existing.body),
        status || null,
        decline_reason,
        existing.id
      );
    }
    res.json(db.prepare(`${requestWithCounts} WHERE r.id = ?`).get(existing.id));
  });

  app.delete('/api/requests/:id', requireAuth, (req, res) => {
    db.transaction(() => {
      db.prepare('DELETE FROM votes WHERE request_id = ?').run(req.params.id);
      db.prepare('DELETE FROM comments WHERE request_id = ?').run(req.params.id);
      db.prepare('DELETE FROM requests WHERE id = ?').run(req.params.id);
    })();
    res.json({ ok: true });
  });

  // ---- comments moderation ----
  app.get('/api/requests/:id/comments', requireAuth, (req, res) => {
    res.json(db.prepare('SELECT * FROM comments WHERE request_id = ? ORDER BY created_at ASC, id ASC').all(req.params.id));
  });

  app.post('/api/requests/:id/comments', requireAuth, (req, res) => {
    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Comment cannot be empty' });
    const info = db
      .prepare('INSERT INTO comments (request_id, author, body, is_admin) VALUES (?, ?, ?, 1)')
      .run(req.params.id, String(req.body?.author || 'Team').slice(0, 60), body.slice(0, 4000));
    res.status(201).json({ ok: true, id: info.lastInsertRowid });
  });

  app.delete('/api/comments/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  // ---- subscribers ----
  app.get('/api/subscribers', requireAuth, (req, res) => {
    res.json(db.prepare('SELECT id, email, created_at, unsubscribed_at FROM subscribers ORDER BY created_at DESC').all());
  });

  app.get('/api/subscribers.csv', requireAuth, (req, res) => {
    const rows = db.prepare('SELECT email, created_at FROM subscribers WHERE unsubscribed_at IS NULL ORDER BY created_at ASC').all();
    const csv = 'email,subscribed_at\n' + rows.map((r) => `${r.email.replace(/"/g, '""')},${r.created_at}`).join('\n') + '\n';
    res.set('Content-Disposition', 'attachment; filename="subscribers.csv"');
    res.type('text/csv').send(csv);
  });

  app.delete('/api/subscribers/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM subscribers WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  // ---- settings + stats ----
  app.get('/api/settings', requireAuth, (req, res) => {
    const s = getSettings(db);
    res.json({ ...s, smtp_configured: !!smtpConfig(s) });
  });

  app.put('/api/settings', requireAuth, (req, res) => {
    setSettings(db, req.body || {});
    const s = getSettings(db);
    res.json({ ...s, smtp_configured: !!smtpConfig(s) });
  });

  app.get('/api/stats', requireAuth, (req, res) => {
    res.json({
      posts: db.prepare(`SELECT COUNT(*) n FROM posts WHERE status='published'`).get().n,
      drafts: db.prepare(`SELECT COUNT(*) n FROM posts WHERE status='draft'`).get().n,
      pending: db.prepare(`SELECT COUNT(*) n FROM requests WHERE status='pending'`).get().n,
      requests: db.prepare(`SELECT COUNT(*) n FROM requests WHERE status NOT IN ('declined','merged')`).get().n,
      votes: db.prepare('SELECT COUNT(*) n FROM votes').get().n,
      subscribers: db.prepare('SELECT COUNT(*) n FROM subscribers WHERE unsubscribed_at IS NULL').get().n
    });
  });

  // ================= ADMIN SPA =================
  const distDir = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distDir)) {
    app.use('/admin', express.static(distDir));
    app.get('/admin/*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
  } else {
    app.get('/admin', (req, res) =>
      res.status(503).type('html').send('<h1>Admin UI not built</h1><p>Run <code>npm run build</code> first.</p>')
    );
  }

  app.locals.db = db;
  return app;
}

module.exports = { createApp };
