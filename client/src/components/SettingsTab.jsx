import React, { useEffect, useState } from 'react';
import { Save, Code2, Check } from 'lucide-react';
import { api } from '../api.js';
import { Button, Input, Card, Badge } from './ui.jsx';

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-zinc-600 mt-1">{hint}</p>}
    </div>
  );
}

export default function SettingsTab() {
  const [s, setS] = useState(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { api.get('/api/settings').then(setS); }, []);
  if (!s) return null;

  const set = (k) => (e) => setS({ ...s, [k]: e.target.value });

  async function save() {
    const r = await api.put('/api/settings', s);
    setS(r);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const base = s.site_url || window.location.origin;
  const snippet = `<script src="${base.replace(/\/$/, '')}/widget.js" defer></script>`;

  function copySnippet() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-sm">Site</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Site name"><Input value={s.site_name} onChange={set('site_name')} /></Field>
          <Field label="Accent color"><Input value={s.accent} onChange={set('accent')} placeholder="#6366f1" /></Field>
        </div>
        <Field label="Tagline"><Input value={s.site_tagline} onChange={set('site_tagline')} /></Field>
        <Field label="Public URL" hint="Used in RSS links and email unsubscribe links, e.g. https://updates.yourapp.com">
          <Input value={s.site_url} onChange={set('site_url')} placeholder="https://updates.yourapp.com" />
        </Field>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm">Email notifications (BYO SMTP)</h2>
          {s.smtp_configured ? <Badge color="green">Configured</Badge> : <Badge color="zinc">Not configured</Badge>}
        </div>
        <p className="text-xs text-zinc-500">When you publish a post, every active subscriber gets an email with an unsubscribe link. Works with any SMTP provider (Postmark, SES, Mailgun, Gmail…).</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="SMTP host"><Input value={s.smtp_host} onChange={set('smtp_host')} placeholder="smtp.postmarkapp.com" /></Field>
          <Field label="Port"><Input value={s.smtp_port} onChange={set('smtp_port')} placeholder="587" /></Field>
          <Field label="Username"><Input value={s.smtp_user} onChange={set('smtp_user')} /></Field>
          <Field label="Password"><Input type="password" value={s.smtp_pass} onChange={set('smtp_pass')} /></Field>
        </div>
        <Field label="From address"><Input value={s.smtp_from} onChange={set('smtp_from')} placeholder='"YourApp Updates" <updates@yourapp.com>' /></Field>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Code2 size={15} className="text-indigo-400" />
          <h2 className="font-semibold text-sm">Embed the "What's new" widget</h2>
        </div>
        <p className="text-xs text-zinc-500">Paste this on any site — it shows a floating bell with an unread badge and a dropdown of your latest posts.</p>
        <div className="flex gap-2">
          <code className="flex-1 text-[12px] bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 overflow-x-auto whitespace-nowrap">{snippet}</code>
          <Button variant="ghost" onClick={copySnippet}>{copied ? <Check size={14} /> : 'Copy'}</Button>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save}>{saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save settings</>}</Button>
      </div>
    </div>
  );
}
