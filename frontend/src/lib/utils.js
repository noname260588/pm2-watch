import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatMemory = (bytes) => (bytes / 1024 / 1024).toFixed(1) + ' MB';

export const getStatusColor = (status) => {
  switch(status) {
    case 'online': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
    case 'stopped': return 'bg-rose-500/20 text-rose-400 border-rose-500/50';
    case 'errored': return 'bg-red-500/20 text-red-400 border-red-500/50';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
  }
};
