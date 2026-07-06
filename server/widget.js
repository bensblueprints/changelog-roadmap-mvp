// Embeddable "What's new" widget. Served at GET /widget.js.
// Usage on any site:
//   <script src="https://your-shipnotes-host/widget.js" defer></script>
//   <!-- optional: attach to your own trigger element -->
//   <script src=".../widget.js" data-target="#whats-new-btn" data-accent="#6366f1" defer></script>
//
// The script derives its host from its own src, fetches /api/widget/posts (CORS-open),
// shows a floating bell badge with the unread count (localStorage-tracked), and a
// dropdown panel of the latest posts.

function widgetSource() {
  return `(function () {
  var script = document.currentScript;
  if (!script) { var s = document.getElementsByTagName('script'); script = s[s.length - 1]; }
  var origin;
  try { origin = new URL(script.src).origin; } catch (e) { return; }
  var accent = script.getAttribute('data-accent') || '#6366f1';
  var targetSel = script.getAttribute('data-target');
  var LS_KEY = 'shipnotes:lastSeen:' + origin;

  fetch(origin + '/api/widget/posts')
    .then(function (r) { return r.json(); })
    .then(init)
    .catch(function () {});

  function init(data) {
    var posts = (data && data.posts) || [];
    if (!posts.length) return;
    var lastSeen = Number(localStorage.getItem(LS_KEY) || 0);
    var unread = posts.filter(function (p) { return p.id > lastSeen; }).length;

    var css = document.createElement('style');
    css.textContent =
      '.sn-w{position:fixed;bottom:24px;right:24px;z-index:99999;font-family:system-ui,sans-serif}' +
      '.sn-btn{position:relative;width:48px;height:48px;border-radius:50%;background:' + accent + ';border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;transition:transform .15s}' +
      '.sn-btn:hover{transform:scale(1.06)}' +
      '.sn-btn svg{width:22px;height:22px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
      '.sn-badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;min-width:19px;height:19px;border-radius:999px;display:flex;align-items:center;justify-content:center;padding:0 5px;border:2px solid #fff}' +
      '.sn-panel{position:absolute;bottom:60px;right:0;width:340px;max-height:440px;overflow-y:auto;background:#111114;color:#e4e4e7;border:1px solid #26262b;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.5);display:none}' +
      '.sn-panel.open{display:block}' +
      '.sn-head{padding:14px 16px;border-bottom:1px solid #26262b;font-weight:700;font-size:14px;display:flex;justify-content:space-between;align-items:center}' +
      '.sn-head a{color:' + accent + ';font-size:12px;text-decoration:none;font-weight:500}' +
      '.sn-item{padding:13px 16px;border-bottom:1px solid #1c1c21;display:block;text-decoration:none;color:inherit}' +
      '.sn-item:hover{background:#18181c}.sn-item:last-child{border-bottom:none}' +
      '.sn-item .t{font-size:13px;font-weight:600;line-height:1.4}' +
      '.sn-item .d{font-size:11px;color:#8b8b94;margin-top:2px}' +
      '.sn-tag{display:inline-block;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:1px 6px;border-radius:99px;margin-right:5px;background:rgba(99,102,241,.15);color:' + accent + '}';
    document.head.appendChild(css);

    var wrap, btn;
    if (targetSel && document.querySelector(targetSel)) {
      btn = document.querySelector(targetSel);
      wrap = document.createElement('div');
      wrap.style.position = 'relative';
      btn.parentNode.insertBefore(wrap, btn);
      wrap.appendChild(btn);
    } else {
      wrap = document.createElement('div');
      wrap.className = 'sn-w';
      btn = document.createElement('button');
      btn.className = 'sn-btn';
      btn.setAttribute('aria-label', "What's new");
      btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
      wrap.appendChild(btn);
      document.body.appendChild(wrap);
    }

    var badge = null;
    if (unread > 0) {
      badge = document.createElement('span');
      badge.className = 'sn-badge';
      badge.textContent = unread > 9 ? '9+' : String(unread);
      (btn.style.position || (btn.style.position = 'relative'));
      btn.appendChild(badge);
    }

    var panel = document.createElement('div');
    panel.className = 'sn-panel';
    panel.innerHTML =
      '<div class="sn-head"><span>What\\u2019s new</span><a href="' + origin + '/" target="_blank" rel="noopener">View all \\u2192</a></div>' +
      posts.map(function (p) {
        return '<a class="sn-item" href="' + origin + '/post/' + encodeURIComponent(p.slug) + '" target="_blank" rel="noopener">' +
          '<div>' + (p.tags || []).map(function (t) { return '<span class="sn-tag">' + t + '</span>'; }).join('') + '</div>' +
          '<div class="t">' + escapeHtml(p.title) + '</div>' +
          '<div class="d">' + (p.published_at || '').slice(0, 10) + '</div></a>';
      }).join('');
    wrap.appendChild(panel);

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) {
        localStorage.setItem(LS_KEY, String(posts[0].id));
        if (badge) { badge.remove(); badge = null; }
      }
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) panel.classList.remove('open');
    });

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
  }
})();
`;
}

module.exports = { widgetSource };
