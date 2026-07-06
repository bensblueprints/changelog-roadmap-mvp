// BYO-SMTP mailer. Silently no-ops when SMTP isn't configured — the app must
// never break because email isn't set up. Settings (admin UI) override env vars.
const nodemailer = require('nodemailer');

function smtpConfig(settings) {
  const host = settings.smtp_host || process.env.SMTP_HOST || '';
  if (!host) return null;
  return {
    host,
    port: Number(settings.smtp_port || process.env.SMTP_PORT || 587),
    secure: (settings.smtp_secure || process.env.SMTP_SECURE || '0') === '1',
    auth: (settings.smtp_user || process.env.SMTP_USER)
      ? {
          user: settings.smtp_user || process.env.SMTP_USER,
          pass: settings.smtp_pass || process.env.SMTP_PASS || ''
        }
      : undefined,
    from: settings.smtp_from || process.env.SMTP_FROM || `Shipnotes <no-reply@${host}>`
  };
}

/**
 * Sends "new post" notifications to every active subscriber.
 * Returns { sent, skipped, errors } — never throws.
 */
async function notifySubscribers({ settings, post, subscribers, postHtml }) {
  const cfg = smtpConfig(settings);
  if (!cfg) return { sent: 0, skipped: subscribers.length, errors: [], reason: 'SMTP not configured' };
  if (!subscribers.length) return { sent: 0, skipped: 0, errors: [] };

  const transporter = nodemailer.createTransport(cfg);
  const base = (settings.site_url || '').replace(/\/$/, '');
  let sent = 0;
  const errors = [];

  for (const sub of subscribers) {
    const unsubUrl = `${base}/unsubscribe?token=${sub.token}`;
    const postUrl = `${base}/post/${post.slug}`;
    try {
      await transporter.sendMail({
        from: cfg.from,
        to: sub.email,
        subject: `${settings.site_name}: ${post.title}`,
        text: `${post.title}\n\n${post.body_md}\n\nRead online: ${postUrl}\n\nUnsubscribe: ${unsubUrl}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#18181b">
            <p style="color:#71717a;font-size:13px">${escapeHtml(settings.site_name)} — new update</p>
            <h2 style="margin:8px 0">${escapeHtml(post.title)}</h2>
            <div style="font-size:15px;line-height:1.6">${postHtml}</div>
            <p><a href="${postUrl}" style="color:#6366f1">Read online →</a></p>
            <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0">
            <p style="font-size:12px;color:#a1a1aa">You're receiving this because you subscribed to ${escapeHtml(settings.site_name)} updates.
            <a href="${unsubUrl}" style="color:#a1a1aa">Unsubscribe</a></p>
          </div>`
      });
      sent++;
    } catch (e) {
      errors.push({ email: sub.email, error: e.message });
    }
  }
  return { sent, skipped: 0, errors };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

module.exports = { notifySubscribers, smtpConfig };
