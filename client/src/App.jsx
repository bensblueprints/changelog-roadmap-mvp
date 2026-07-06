import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, FileText, Lightbulb, Users, Settings, LogOut, ExternalLink } from 'lucide-react';
import { api } from './api.js';
import { Button, Input, Card } from './components/ui.jsx';
import PostsTab from './components/PostsTab.jsx';
import RequestsTab from './components/RequestsTab.jsx';
import SubscribersTab from './components/SubscribersTab.jsx';
import SettingsTab from './components/SettingsTab.jsx';

const TABS = [
  { id: 'posts', label: 'Changelog', icon: FileText },
  { id: 'requests', label: 'Requests', icon: Lightbulb },
  { id: 'subscribers', label: 'Subscribers', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings }
];

function Login({ onAuthed }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/api/login', { password });
      onAuthed();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_14px_#6366f1]" />
          <h1 className="text-xl font-bold tracking-tight">Shipnotes</h1>
        </div>
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-3">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Admin password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoFocus />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full justify-center">
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </Card>
        <p className="text-center text-xs text-zinc-600 mt-4">Default password is <code className="text-zinc-500">admin</code> — set ADMIN_PASSWORD to change it.</p>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(null);
  const [tab, setTab] = useState('posts');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/api/me').then((r) => setAuthed(r.authed)).catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (authed) api.get('/api/stats').then(setStats).catch(() => {});
  }, [authed, tab]);

  if (authed === null) return null;
  if (!authed) return <Login onAuthed={() => setAuthed(true)} />;

  async function logout() {
    await api.post('/api/logout');
    setAuthed(false);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_12px_#6366f1]" />
            <span className="font-bold tracking-tight">Shipnotes</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mt-0.5">Admin</span>
          </div>
          <nav className="flex items-center gap-1 flex-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id ? 'text-white bg-zinc-800/80' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <t.icon size={15} />
                {t.label}
                {t.id === 'requests' && stats?.pending > 0 && (
                  <span className="ml-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full px-1.5 py-px">{stats.pending}</span>
                )}
              </button>
            ))}
          </nav>
          <a href="/" target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
            <ExternalLink size={13} /> View site
          </a>
          <button onClick={logout} className="text-zinc-500 hover:text-zinc-200 transition-colors" title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {stats && (
        <div className="max-w-6xl mx-auto px-5 pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Published posts', value: stats.posts, icon: Rocket },
              { label: 'Open requests', value: stats.requests, icon: Lightbulb },
              { label: 'Total votes', value: stats.votes, icon: FileText },
              { label: 'Subscribers', value: stats.subscribers, icon: Users }
            ].map((s) => (
              <Card key={s.label} className="p-4 flex items-center gap-3">
                <s.icon size={18} className="text-indigo-400" />
                <div>
                  <div className="text-lg font-bold leading-none">{s.value}</div>
                  <div className="text-[11px] text-zinc-500 mt-1">{s.label}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-5 py-6">
        {tab === 'posts' && <PostsTab />}
        {tab === 'requests' && <RequestsTab />}
        {tab === 'subscribers' && <SubscribersTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}
