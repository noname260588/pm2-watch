import React, { useState } from 'react';
import { X, Cpu, HardDrive, Globe, ActivitySquare, Server, LayoutTemplate, Terminal } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { cn, formatMemory, getStatusColor } from '../lib/utils';

export default function ProcessModal({ selectedProcess, servers, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!selectedProcess) return null;
  const { serverId, process: snapshotProcess } = selectedProcess;
  const server = servers.find(s => s.serverId === serverId);
  
  // Live process data
  const process = server?.metrics?.find(m => m.id === snapshotProcess.id) || snapshotProcess;
  
  const processHistory = server?.history?.map(h => {
    const pm = h.metrics.find(m => m.id === process.id);
    return { 
      time: h.time, 
      cpu: pm ? pm.cpu : 0, 
      memory: pm ? (pm.memory / 1024 / 1024) : 0,
      req_min: pm ? pm.req_min : 0,
      latency: pm ? pm.latency : 0
    };
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden bg-slate-900/90 shadow-2xl border-slate-700/60 ring-1 ring-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50 bg-slate-800/80">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center border border-primary-500/30">
              <Server className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{process.name}</h2>
                <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", getStatusColor(process.status))}>
                  {process.status.toUpperCase()}
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1">Node: {server?.serverName} • PM2 ID: {process.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Inner Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6">
          <button onClick={() => setActiveTab('overview')} className={cn("px-6 py-4 text-sm font-semibold border-b-2 transition-colors", activeTab === 'overview' ? "border-primary-500 text-primary-400" : "border-transparent text-slate-400 hover:text-slate-200")}>Overview Charts</button>
          <button onClick={() => setActiveTab('environment')} className={cn("px-6 py-4 text-sm font-semibold border-b-2 transition-colors", activeTab === 'environment' ? "border-primary-500 text-primary-400" : "border-transparent text-slate-400 hover:text-slate-200")}>Environment Variables</button>
          <button onClick={() => setActiveTab('custom_metrics')} className={cn("px-6 py-4 text-sm font-semibold border-b-2 transition-colors", activeTab === 'custom_metrics' ? "border-primary-500 text-primary-400" : "border-transparent text-slate-400 hover:text-slate-200")}>Custom Integrations</button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-gradient-to-b from-slate-900/50 to-[#0a0f18] custom-scrollbar">
          
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel p-5 bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><Cpu className="w-4 h-4 text-emerald-400"/> CPU Usage (60s)</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={processHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={12} tick={{fill: '#64748b'}} />
                        <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} unit="%" />
                        <RechartsTooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px'}} />
                        <Line type="monotone" dataKey="cpu" stroke="#10b981" strokeWidth={3} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="glass-panel p-5 bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><HardDrive className="w-4 h-4 text-primary-400"/> Memory Usage (60s)</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={processHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} unit=" MB" />
                        <RechartsTooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px'}} />
                        <Line type="monotone" dataKey="memory" stroke="#3b82f6" strokeWidth={3} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel p-5 bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-purple-400"/> Network Requests (req/min)</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={processHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <RechartsTooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px'}} />
                        <Line type="monotone" dataKey="req_min" stroke="#a855f7" strokeWidth={3} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="glass-panel p-5 bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><ActivitySquare className="w-4 h-4 text-amber-400"/> API Latency (ms)</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={processHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} unit=" ms" />
                        <RechartsTooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px'}} />
                        <Line type="monotone" dataKey="latency" stroke="#fbbf24" strokeWidth={3} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'environment' && (
            <div className="animate-fade-in">
               <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Terminal className="w-5 h-5 text-primary-400"/> Environment Variables</h3>
               <div className="glass-panel bg-[#0a0f18] overflow-hidden rounded-xl border-slate-700/50">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-slate-900 text-slate-400">
                     <tr>
                       <th className="p-3 font-semibold w-1/3">Key</th>
                       <th className="p-3 font-semibold">Value</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800 font-mono text-xs">
                     <tr className="hover:bg-slate-800/50 transition-colors"><td className="p-3 text-slate-400">pm_cwd</td><td className="p-3 text-slate-300">{process.env?.pm_cwd || 'N/A'}</td></tr>
                     <tr className="hover:bg-slate-800/50 transition-colors"><td className="p-3 text-slate-400">NODE_ENV</td><td className="p-3 text-emerald-400">{process.env?.NODE_ENV || 'N/A'}</td></tr>
                     <tr className="hover:bg-slate-800/50 transition-colors"><td className="p-3 text-slate-400">instances</td><td className="p-3 text-amber-400">{process.env?.instances || '1'}</td></tr>
                     <tr className="hover:bg-slate-800/50 transition-colors"><td className="p-3 text-slate-400">exec_mode</td><td className="p-3 text-purple-400">{process.env?.exec_mode || 'fork_mode'}</td></tr>
                     <tr className="hover:bg-slate-800/50 transition-colors"><td className="p-3 text-slate-400">max_memory_restart</td><td className="p-3 text-rose-400">{process.max_memory > 0 ? formatMemory(process.max_memory) : 'Unlimited'}</td></tr>
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === 'custom_metrics' && (
             <div className="animate-fade-in space-y-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2"><LayoutTemplate className="w-5 h-5 text-amber-400"/> Custom Integration Metrics</h3>
                {!process.custom_metrics || Object.keys(process.custom_metrics).length === 0 ? (
                  <div className="p-12 text-center text-slate-500 border border-dashed border-slate-700 rounded-xl bg-slate-900/30">
                    No custom metrics exported by this process. Use `@pm2/io` in your code.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Object.entries(process.custom_metrics).map(([key, value], idx) => {
                      if (key === 'req/min' || key === 'latency') return null; // already shown in charts
                      
                      // Auto format based on value type
                      let valDisplay = value;
                      let isError = key.toLowerCase().includes('error');
                      
                      return (
                        <div key={key} className={cn("glass-panel p-5 flex flex-col justify-center bg-slate-800/40 hover:bg-slate-800/80 transition-colors border-t-2", isError ? "border-t-rose-500" : "border-t-primary-500")}>
                          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 truncate" title={key}>{key}</div>
                          <div className={cn("text-2xl font-bold font-mono truncate", isError && parseFloat(value) > 0 ? "text-rose-400 animate-pulse" : "text-white")} title={valDisplay}>{valDisplay}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
