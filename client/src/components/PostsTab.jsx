import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Send, FileText, Eye, Mail } from 'lucide-react';
import { api } from '../api.js';
import { Button, Input, Textarea, Card, Badge, Modal, EmptyState, fmtDate } from './ui.jsx';

const TAG_OPTIONS = ['New', 'Improved', 'Fixed'];
const TAG_COLORS = { New: 'green', Improved: 'blue', Fixed: 'amber' };

function Editor({ post, onSaved, onClose }) {
  const [title, setTitle] = useState(post?.title || '');
  const [body, setBody] = useState(post?.body_md || '');
  const [tags, setTags] = useState(post ? JSON.parse(post.tags || '[]') : ['New']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function toggleTag(t) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function save(publish) {
    setBusy(true);
    setError('');
    try {
      const payload = { title, body_md: body, tags, publish };
      const saved = post ? await api.put(`/api/posts/${post.id}`, payload) : await api.post('/api/posts', payload);
      onSaved(saved);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  const isPublished = post?.status === 'published';

  return (
    <div className="space-y-4">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title — e.g. Dark mode is here 🌙" autoFocus />
      <div className="flex gap-2">
        {TAG_OPTIONS.map((t) => (
          <button
            key={t}
            onClick={() => toggleTag(t)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              tags.includes(t)
                ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} placeholder={'Write in **Markdown**…\n\n- Added X\n- Fixed Y'} className="font-mono text-[13px]" />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-600">Publishing emails all active subscribers (if SMTP is configured).</p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {!isPublished && (
            <Button variant="subtle" disabled={busy || !title.trim()} onClick={() => save(false)}>
              Save draft
            </Button>
          )}
          <Button disabled={busy || !title.trim()} onClick={() => save(isPublished ? undefined : true)}>
            <Send size={14} /> {isPublished ? 'Save changes' : 'Publish'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PostsTab() {
  const [posts, setPosts] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | post
  const [notice, setNotice] = useState('');

  const load = () => api.get('/api/posts').then(setPosts);
  useEffect(() => { load(); }, []);

  async function remove(p) {
    if (!confirm(`Delete "${p.title}"?`)) return;
    await api.del(`/api/posts/${p.id}`);
    load();
  }

  function onSaved(saved) {
    setEditing(null);
    if (saved.notify) {
      const n = saved.notify;
      setNotice(
        n.sent > 0
          ? `Published — notified ${n.sent} subscriber${n.sent === 1 ? '' : 's'}.`
          : n.reason === 'SMTP not configured'
            ? 'Published. (Email not sent — configure SMTP in Settings to notify subscribers.)'
            : 'Published.'
      );
      setTimeout(() => setNotice(''), 6000);
    }
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold tracking-tight">Changelog posts</h1>
        <Button onClick={() => setEditing('new')}><Plus size={15} /> New post</Button>
      </div>

      {notice && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-4 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <Mail size={14} /> {notice}
        </motion.div>
      )}

      {posts.length === 0 ? (
        <Card><EmptyState icon={FileText} title="No posts yet" sub="Write your first changelog entry — your users will love it." /></Card>
      ) : (
        <div className="space-y-2.5">
          {posts.map((p) => (
            <Card key={p.id} className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm truncate">{p.title}</span>
                  {JSON.parse(p.tags || '[]').map((t) => <Badge key={t} color={TAG_COLORS[t]}>{t}</Badge>)}
                  <Badge color={p.status === 'published' ? 'indigo' : 'zinc'}>{p.status}</Badge>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {p.status === 'published' ? `Published ${fmtDate(p.published_at)}` : `Draft · created ${fmtDate(p.created_at)}`}
                  {p.notified ? ' · subscribers emailed' : ''}
                </p>
              </div>
              {p.status === 'published' && (
                <a href={`/post/${p.slug}`} target="_blank" rel="noopener" className="text-zinc-500 hover:text-zinc-200 transition-colors" title="View">
                  <Eye size={16} />
                </a>
              )}
              <button onClick={() => setEditing(p)} className="text-zinc-500 hover:text-zinc-200 transition-colors" title="Edit"><Pencil size={16} /></button>
              <button onClick={() => remove(p)} className="text-zinc-600 hover:text-red-400 transition-colors" title="Delete"><Trash2 size={16} /></button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New changelog post' : 'Edit post'} wide>
        {editing && <Editor post={editing === 'new' ? null : editing} onSaved={onSaved} onClose={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
