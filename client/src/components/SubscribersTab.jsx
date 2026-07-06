import React, { useEffect, useState } from 'react';
import { Download, Trash2, Users } from 'lucide-react';
import { api } from '../api.js';
import { Button, Card, Badge, EmptyState, fmtDate } from './ui.jsx';

export default function SubscribersTab() {
  const [subs, setSubs] = useState([]);

  const load = () => api.get('/api/subscribers').then(setSubs);
  useEffect(() => { load(); }, []);

  async function remove(s) {
    if (!confirm(`Remove ${s.email}?`)) return;
    await api.del(`/api/subscribers/${s.id}`);
    load();
  }

  const active = subs.filter((s) => !s.unsubscribed_at).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold tracking-tight">
          Subscribers <span className="text-zinc-500 font-normal text-sm">({active} active)</span>
        </h1>
        <a href="/api/subscribers.csv">
          <Button variant="ghost"><Download size={15} /> Export CSV</Button>
        </a>
      </div>

      {subs.length === 0 ? (
        <Card><EmptyState icon={Users} title="No subscribers yet" sub="The subscribe box on your public changelog collects emails here." /></Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Subscribed</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id} className="border-b border-zinc-800/60 last:border-0">
                  <td className="px-4 py-2.5">{s.email}</td>
                  <td className="px-4 py-2.5 text-zinc-500">{fmtDate(s.created_at)}</td>
                  <td className="px-4 py-2.5">
                    {s.unsubscribed_at ? <Badge color="red">Unsubscribed</Badge> : <Badge color="green">Active</Badge>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => remove(s)} className="text-zinc-600 hover:text-red-400"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
