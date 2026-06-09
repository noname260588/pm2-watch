import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Cpu, HardDrive, ActivitySquare, Server, Zap } from 'lucide-react';
import { cn, formatMemory } from '../lib/utils';

export default function GlobalDashboard({ servers }) {
  // Aggregate global history across all servers
  const { globalHistory, topProcesses, currentGlobal } = useMemo(() => {
    const timeMap = {};
    const processMap = new Map();
    let currentGlobalStats = { totalMem: 0, totalCpu: 0, totalReqMin: 0, totalLatency: 0, activeWorkers: 0, errors: 0 };
    
    servers.forEach(server => {
      // Current Stats
      server.metrics?.forEach(m => {
        currentGlobalStats.totalMem += (m.memory || 0);
        currentGlobalStats.totalCpu += (m.cpu || 0);
        currentGlobalStats.totalReqMin += (m.req_min ? parseFloat(m.req_min) : 0);
        currentGlobalStats.totalLatency += (m.latency ? parseFloat(m.latency) : 0);
        currentGlobalStats.activeWorkers++;
        if (m.custom_metrics && m.custom_metrics['Error Req/min']) {
          currentGlobalStats.errors += parseFloat(m.custom_metrics['Error Req/min']);
        }
        
        // Track for Top Processes
        processMap.set(`${server.serverId}-${m.id}`, {
           id: m.id,
           serverId: server.serverId,
           serverName: server.serverName,
           name: m.name,
           cpu: m.cpu || 0,
           memory: m.memory || 0
        });
      });

      // History Stats
      if (!server.history) return;
      server.history.forEach(h => {
        if (!timeMap[h.time]) timeMap[h.time] = { time: h.time, cpu: 0, memory: 0, req_min: 0, latency: 0, count: 0 };
        let cpuSum = 0, memSum = 0, reqSum = 0, latSum = 0, cnt = 0;
        h.metrics.forEach(m => {
           cpuSum += (m.cpu || 0);
           memSum += (m.memory || 0);
           reqSum += (m.req_min ? parseFloat(m.req_min) : 0);
           latSum += (m.latency ? parseFloat(m.latency) : 0);
           cnt++;
        });
        timeMap[h.time].cpu += cpuSum;
        timeMap[h.time].memory += (memSum / 1024 / 1024);
        timeMap[h.time].req_min += reqSum;
        timeMap[h.time].latency += latSum;
        timeMap[h.time].count += cnt;
      });
    });

    if (currentGlobalStats.activeWorkers > 0) {
      currentGlobalStats.avgLatency = currentGlobalStats.totalLatency / currentGlobalStats.activeWorkers;
    } else {
      currentGlobalStats.avgLatency = 0;
    }

    const historyArr = Object.values(timeMap).sort((a,b) => a.time.localeCompare(b.time)).map(d => ({
      ...d,
      avgLatency: d.count ? d.latency / d.count : 0
    }));

    const topProcArr = Array.from(processMap.values()).sort((a,b) => (b.cpu + b.memory/(1024*1024)) - (a.cpu + a.memory/(1024*1024))).slice(0, 5);

    return { globalHistory: historyArr, topProcesses: topProcArr, currentGlobal: currentGlobalStats };
  }, [servers]);

  if (servers.length === 0) {
    return (
      <div className="glass-panel p-12 text-center text-slate-400 flex flex-col items-center gap-4 animate-fade-in">
        <Server className="w-12 h-12 text-slate-600 animate-pulse" />
        <p className="text-lg">Waiting for cluster data...</p>
        <p className="text-sm opacity-50">Please ensure pm2-watch-agent is running on your nodes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary-500/10 rounded-full blur-xl group-hover:bg-primary-500/20 transition-all"></div>
          <div className="text-slate-400 text-sm font-semibold mb-2">Total App Memory</div>
          <div className="text-3xl font-bold text-white font-mono">{formatMemory(currentGlobal.totalMem)}</div>
        </div>
        <div className="glass-panel p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="text-slate-400 text-sm font-semibold mb-2">Cluster CPU Load</div>
          <div className="text-3xl font-bold text-emerald-400 font-mono">{currentGlobal.totalCpu.toFixed(1)}%</div>
        </div>
        <div className="glass-panel p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all"></div>
          <div className="text-slate-400 text-sm font-semibold mb-2">Global Throughput</div>
          <div className="text-3xl font-bold text-purple-400 font-mono">{currentGlobal.totalReqMin.toFixed(0)} <span className="text-sm text-slate-500">rpm</span></div>
        </div>
        <div className="glass-panel p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 relative overflow-hidden group">
           <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/10 rounded-full blur-xl group-hover:bg-rose-500/20 transition-all"></div>
          <div className="text-slate-400 text-sm font-semibold mb-2">Active Errors</div>
          <div className={cn("text-3xl font-bold font-mono", currentGlobal.errors > 0 ? "text-rose-500 animate-pulse" : "text-slate-500")}>{currentGlobal.errors.toFixed(0)} <span className="text-sm text-slate-500">rpm</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Area Chart */}
        <div className="lg:col-span-2 glass-panel p-6 bg-slate-800/40">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><ActivitySquare className="w-5 h-5 text-primary-400"/> Cluster Resource History (60s)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={globalHistory}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickMargin={10} />
                <YAxis yAxisId="left" stroke="#10b981" fontSize={12} unit="%" />
                <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={12} unit=" MB" />
                <RechartsTooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px'}} />
                <Area yAxisId="left" type="monotone" dataKey="cpu" stroke="#10b981" fillOpacity={1} fill="url(#colorCpu)" isAnimationActive={false} />
                <Area yAxisId="right" type="monotone" dataKey="memory" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMem)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Resource Hogs */}
        <div className="glass-panel p-6 bg-slate-800/40 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Zap className="w-5 h-5 text-amber-400"/> Top Resource Hogs</h3>
          <div className="flex-1 space-y-4">
            {topProcesses.length === 0 && <p className="text-slate-500 italic text-center mt-10">No processes running.</p>}
            {topProcesses.map((proc, idx) => (
              <div key={`${proc.serverId}-${proc.id}`} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-semibold text-slate-200 truncate w-32" title={proc.name}>
                    <span className="text-xs text-slate-500 mr-2">#{idx+1}</span>{proc.name}
                  </div>
                  <div className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md truncate max-w-[80px]" title={proc.serverName}>{proc.serverName}</div>
                </div>
                <div className="flex items-center gap-4 text-sm font-mono">
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex justify-between text-xs"><span className="text-emerald-500">CPU</span><span className="text-slate-300">{proc.cpu.toFixed(1)}%</span></div>
                    <div className="w-full bg-slate-800 rounded-full h-1"><div className="bg-emerald-500 h-1 rounded-full" style={{width: `${Math.min(proc.cpu, 100)}%`}}></div></div>
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex justify-between text-xs"><span className="text-primary-500">MEM</span><span className="text-slate-300">{formatMemory(proc.memory)}</span></div>
                    <div className="w-full bg-slate-800 rounded-full h-1"><div className="bg-primary-500 h-1 rounded-full" style={{width: `${Math.min((proc.memory/(1024*1024*1024))*100, 100)}%`}}></div></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
