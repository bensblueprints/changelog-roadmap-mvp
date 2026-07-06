import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    ghost: 'bg-transparent border border-zinc-700 hover:border-zinc-500 text-zinc-300',
    danger: 'bg-red-600/15 border border-red-600/40 hover:bg-red-600/25 text-red-400',
    subtle: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
  };
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-sm outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600 ${props.className || ''}`}
    />
  );
}

export function Textarea(props) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-sm outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600 resize-y ${props.className || ''}`}
    />
  );
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-xl bg-zinc-900/70 border border-zinc-800 ${className}`}>{children}</div>;
}

export function Badge({ children, color = 'zinc' }) {
  const colors = {
    zinc: 'bg-zinc-800 text-zinc-400',
    green: 'bg-emerald-500/15 text-emerald-400',
    blue: 'bg-blue-500/15 text-blue-400',
    amber: 'bg-amber-500/15 text-amber-400',
    violet: 'bg-violet-500/15 text-violet-400',
    red: 'bg-red-500/15 text-red-400',
    indigo: 'bg-indigo-500/15 text-indigo-400'
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${colors[color] || colors.zinc}`}>
      {children}
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-10 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl`}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h2 className="text-base font-semibold">{title}</h2>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon size={32} className="text-zinc-700 mb-3" />}
      <p className="text-sm font-medium text-zinc-400">{title}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(String(iso).replace(' ', 'T') + (String(iso).includes('Z') ? '' : 'Z'));
  return isNaN(d) ? iso : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
