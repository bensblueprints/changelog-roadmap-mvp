import React, { useEffect, useState } from 'react';
import { Check, X, GitMerge, Trash2, MessageSquare, ChevronUp, Lightbulb, Send } from 'lucide-react';
import { api } from '../api.js';
import { Button, Input, Textarea, Card, Badge, Modal, EmptyState, fmtDate } from './ui.jsx';

const STATUS_META = {
  pending: { label: 'Pending', color: 'amber' },
  open: { label: 'Open', color: 'zinc' },
  planned: { label: 'Planned', color: 'violet' },
  in_progress: { label: 'In progress', color: 'blue' },
  shipped: { label: 'Shipped', color: 'green' },
  declined: { label: 'Declined', color: 'red' },
  merged: { label: 'Merged', color: 'zinc' }
};

const FILTERS = ['all', 'pending', 'open', 'planned', 'in_progress', 'shipped', 'declined'];
const SET_STATUSES = ['open', 'planned', 'in_progress', 'shipped'];

function Comments({ request }) {
  const [comments, setComments] = useState([]);
  const [reply, setReply] = useState('');

  const load = () => api.get(`/api/requests/${request.id}/comments`).then(setComments);
  useEffect(() => { load(); }, [request.id]);

  async function send() {
    if (!reply.trim()) return;
    await api.post(`/api/requests/${request.id}/comments`, { body: reply });
    setReply('');
    load();
  }

  async function remove(id) {
    await api.del(`/api/comments/${id}`);
    load();
  }

  return (
    <div className="space-y-3">
      {request.body && <p className="text-sm text-zinc-400 whitespace-pre-wrap border-l-2 border-zinc-700 pl-3">{request.body}</p>}
      <p className="text-xs text-zinc-500">
        {request.votes} vote{request.votes === 1 ? '' : 's'} · submitted {fmtDate(request.created_at)}
        {request.email ? ` · ${request.email}` : ''}
      </p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {comments.length === 0 && <p className="text-xs text-zinc-600">No comments yet.</p>}
        {comments.map((c) => (
          <div key={c.id} className={`rounded-lg p-3 text-sm ${c.is_admin ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-zinc-800/60'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">
                {c.author} {c.is_admin ? <Badge color="indigo">Team</Badge> : null}
                <span className="text-zinc-600 font-normal ml-2">{fmtDate(c.created_at)}</span>
              </span>
              <button onClick={() => remove(c.id)} className="text-zinc-600 hover:text-red-400"><Trash2 size={13} /></button>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-zinc-300">{c.body}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply as Team…" onKeyDown={(e) => e.key === 'Enter' && send()} />
        <Button onClick={send} disabled={!reply.trim()}><Send size={14} /></Button>
      </div>
    </div>
  );
}

export default function RequestsTab() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('all');
  const [declining, setDeclining] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [merging, setMerging] = useState(null);
  const [mergeTarget, setMergeTarget] = useState('');
  const [commentsFor, setCommentsFor] = useState(null);

  const load = () => api.get('/api/requests').then(setRequests);
  useEffect(() => { load(); }, []);

  const shown = filter === 'all' ? requests.filter((r) => r.status !== 'merged') : requests.filter((r) => r.status === filter);

  async function setStatus(r, status) {
    await api.put(`/api/requests/${r.id}`, { status });
    load();
  }

  async function decline() {
    await api.put(`/api/requests/${declining.id}`, { status: 'declined', decline_reason: declineReason });
    setDeclining(null);
    setDeclineReason('');
    load();
  }

  async function merge() {
    await api.put(`/api/requests/${merging.id}`, { status: 'merged', merged_into: Number(mergeTarget) });
    setMerging(null);
    setMergeTarget('');
    load();
  }

  async function remove(r) {
    if (!confirm(`Delete "${r.title}" and all its votes/comments?`)) return;
    await api.del(`/api/requests/${r.id}`);
    load();
  }

  const mergeCandidates = merging ? requests.filter((r) => r.id !== merging.id && !['merged', 'declined'].includes(r.status)) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-lg font-bold tracking-tight">Feature requests</h1>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                filter === f ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              {f === 'all' ? 'All' : STATUS_META[f].label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <Card><EmptyState icon={Lightbulb} title="No requests here" sub="Visitor-submitted feature requests will appear in this queue." /></Card>
      ) : (
        <div className="space-y-2.5">
          {shown.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center bg-zinc-800/70 rounded-lg px-2.5 py-1.5 min-w-[46px]">
                  <ChevronUp size={14} className="text-indigo-400" />
                  <span className="text-sm font-bold">{r.votes}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{r.title}</span>
                    <Badge color={STATUS_META[r.status].color}>{STATUS_META[r.status].label}</Badge>
                  </div>
                  {r.body && <p className="text-xs text-zinc-500 mt-1 line-clamp-2 whitespace-pre-wrap">{r.body}</p>}
                  {r.status === 'declined' && r.decline_reason && (
                    <p className="text-xs text-red-400/80 mt-1">Reason: {r.decline_reason}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    {r.status === 'pending' && (
                      <Button variant="subtle" className="!px-2.5 !py-1 text-xs" onClick={() => setStatus(r, 'open')}>
                        <Check size={13} /> Approve
                      </Button>
                    )}
                    {SET_STATUSES.filter((s) => s !== r.status).map((s) =>
                      r.status !== 'pending' && r.status !== 'merged' ? (
                        <Button key={s} variant="ghost" className="!px-2.5 !py-1 text-xs" onClick={() => setStatus(r, s)}>
                          → {STATUS_META[s].label}
                        </Button>
                      ) : null
                    )}
                    {!['declined', 'merged'].includes(r.status) && (
                      <>
                        <Button variant="ghost" className="!px-2.5 !py-1 text-xs" onClick={() => { setDeclining(r); setDeclineReason(''); }}>
                          <X size={13} /> Decline
                        </Button>
                        <Button variant="ghost" className="!px-2.5 !py-1 text-xs" onClick={() => { setMerging(r); setMergeTarget(''); }}>
                          <GitMerge size={13} /> Merge
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" className="!px-2.5 !py-1 text-xs" onClick={() => setCommentsFor(r)}>
                      <MessageSquare size={13} /> {r.comment_count}
                    </Button>
                    <button onClick={() => remove(r)} className="text-zinc-600 hover:text-red-400 ml-auto" title="Delete"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!declining} onClose={() => setDeclining(null)} title={`Decline "${declining?.title}"`}>
        <div className="space-y-3">
          <Textarea rows={3} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="Reason shown publicly on the request page (optional but recommended)" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeclining(null)}>Cancel</Button>
            <Button variant="danger" onClick={decline}>Decline request</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!merging} onClose={() => setMerging(null)} title={`Merge "${merging?.title}" into…`}>
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">Votes and comments move to the target (each visitor still counts once).</p>
          <select
            value={mergeTarget}
            onChange={(e) => setMergeTarget(e.target.value)}
            className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">Select target request…</option>
            {mergeCandidates.map((r) => (
              <option key={r.id} value={r.id}>#{r.id} — {r.title} ({r.votes} votes)</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMerging(null)}>Cancel</Button>
            <Button onClick={merge} disabled={!mergeTarget}><GitMerge size={14} /> Merge</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!commentsFor} onClose={() => setCommentsFor(null)} title={commentsFor?.title || ''} wide>
        {commentsFor && <Comments request={commentsFor} />}
      </Modal>
    </div>
  );
}
