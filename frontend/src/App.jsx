import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { Server, Activity, Cpu, HardDrive, Square, RotateCcw, TerminalSquare, Info, X, Clock, Zap, Globe, ActivitySquare, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast, { Toaster } from 'react-hot-toast';
import FlexSearch from 'flexsearch';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const BACKEND_URL = 'http://localhost:3000';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [servers, setServers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('processes');
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLogs, setFilteredLogs] = useState([]);
  
  const logsEndRef = useRef(null);
  const alertCooldowns = useRef({});
  const logIdCounter = useRef(0);
  
  // FlexSearch index
  const searchIndex = useRef(null);
  if (!searchIndex.current) {
    // Handle both default and named exports of FlexSearch depending on Vite build
    const IndexClass = FlexSearch.Index || FlexSearch;
    searchIndex.current = new IndexClass({ tokenize: "forward" });
  }

  useEffect(() => {
    const newSocket = io(BACKEND_URL, { auth: { clientType: 'dashboard' } });

    newSocket.on('connect', () => toast.success('Connected to Central Server'));

    newSocket.on('dash:initial_state', (initialServers) => setServers(initialServers));

    newSocket.on('dash:update_metrics', (data) => {
      setServers((prev) => {
        const idx = prev.findIndex(s => s.serverId === data.serverId);
        if (idx === -1) return [...prev, { serverId: data.serverId, serverName: data.serverName, status: 'online', metrics: data.metrics, history: data.history }];
        const newServers = [...prev];
        newServers[idx] = { ...newServers[idx], status: 'online', metrics: data.metrics, history: data.history };
        return newServers;
      });
    });

    newSocket.on('dash:update_sysinfo', ({ serverId, sysinfo }) => {
      setServers((prev) => {
        const idx = prev.findIndex(s => s.serverId === serverId);
        if (idx === -1) return prev;
        const newServers = [...prev];
        newServers[idx] = { ...newServers[idx], sysinfo };
        return newServers;
      });
    });

    newSocket.on('dash:agent_offline', ({ serverId }) => {
      toast.error(`Agent ${serverId} went offline`);
      setServers((prev) => {
        const idx = prev.findIndex(s => s.serverId === serverId);
        if (idx === -1) return prev;
        const newServers = [...prev];
        newServers[idx] = { ...newServers[idx], status: 'offline' };
        return newServers;
      });
    });

    newSocket.on('dash:new_log', (logData) => {
      const id = logIdCounter.current++;
      const logWithId = { ...logData, _id: id };
      
      // Index the new log message for searching
      searchIndex.current.add(id, `${logData.process_name} ${logData.message}`);

      setLogs((prevLogs) => {
        const updated = [...prevLogs, logWithId];
        if (updated.length > 500) {
          const removed = updated.shift();
          // Remove old log from search index
          searchIndex.current.remove(removed._id);
        }
        return updated;
      });
    });

    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  // Effect to filter logs whenever searchTerm or logs array changes
  useEffect(() => {
    if (!searchTerm) {
      setFilteredLogs(logs);
      return;
    }
    const results = searchIndex.current.search(searchTerm);
    // FlexSearch returns array of IDs. We convert to Set for fast lookup.
    const resultSet = new Set(results);
    setFilteredLogs(logs.filter(l => resultSet.has(l._id)));
  }, [searchTerm, logs]);

  useEffect(() => {
    if (activeTab === 'logs') logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredLogs, activeTab]);

  const handleAction = (serverId, processId, action) => {
    if (confirm(`Are you sure you want to ${action} process ID ${processId}?`)) {
      socket?.emit('dash:action', { serverId, processId, action });
      toast(`Sent ${action} command`, { icon: '🚀' });
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'online': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      case 'stopped': return 'bg-rose-500/20 text-rose-400 border-rose-500/50';
      case 'errored': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  const formatMemory = (bytes) => (bytes / 1024 / 1024).toFixed(1) + ' MB';
  const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const renderProcessModal = () => {
    if (!selectedProcess) return null;
    const { serverId, process: snapshotProcess } = selectedProcess;
    const server = servers.find(s => s.serverId === serverId);
    
    // Use live process data from the state so it updates while modal is open
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="glass-panel w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-700/50 bg-slate-800/80">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">{process.name}</h2>
              <span className={cn("text-xs px-2 py-1 rounded-full border font-medium", getStatusColor(process.status))}>
                {process.status.toUpperCase()}
              </span>
            </div>
            <button onClick={() => setSelectedProcess(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto space-y-8 flex-1 bg-gradient-to-b from-slate-900/50 to-dark-900/50">
            
            {/* HW Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-panel p-4 bg-slate-800/40">
                <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2"><Cpu className="w-4 h-4"/> CPU Usage (60s)</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={processHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={12} tick={{fill: '#64748b'}} />
                      <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} unit="%" />
                      <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}} />
                      <Line type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="glass-panel p-4 bg-slate-800/40">
                <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2"><HardDrive className="w-4 h-4"/> Memory Usage (60s)</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={processHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} unit=" MB" />
                      <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}} />
                      <Line type="monotone" dataKey="memory" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Network Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-panel p-4 bg-slate-800/40">
                <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2"><Globe className="w-4 h-4"/> Requests (req/min)</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={processHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}} />
                      <Line type="monotone" dataKey="req_min" stroke="#a855f7" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="glass-panel p-4 bg-slate-800/40">
                <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2"><ActivitySquare className="w-4 h-4"/> Latency (ms)</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={processHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} unit=" ms" />
                      <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}} />
                      <Line type="monotone" dataKey="latency" stroke="#fbbf24" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div>
               <h3 className="text-lg font-semibold text-white mb-4">Environment & Meta</h3>
               <div className="glass-panel bg-black/40 overflow-hidden">
                 <table className="w-full text-left text-sm">
                   <tbody className="divide-y divide-slate-800">
                     <tr className="hover:bg-white/5"><td className="p-3 font-semibold text-slate-400 w-1/3">PM2 ID</td><td className="p-3 text-slate-200">{process.id}</td></tr>
                     <tr className="hover:bg-white/5"><td className="p-3 font-semibold text-slate-400">Memory Limit</td><td className="p-3 text-emerald-400">{process.max_memory > 0 ? formatMemory(process.max_memory) : 'Unlimited'}</td></tr>
                     <tr className="hover:bg-white/5"><td className="p-3 font-semibold text-slate-400">Working Directory</td><td className="p-3 text-slate-200 font-mono text-xs">{process.env?.pm_cwd || 'N/A'}</td></tr>
                   </tbody>
                 </table>
               </div>
            </div>

            {process.custom_metrics && Object.keys(process.custom_metrics).length > 0 && (
            <div>
               <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Globe className="w-5 h-5 text-purple-400"/> Custom Integration Metrics</h3>
               <div className="glass-panel bg-black/40 overflow-hidden">
                 <table className="w-full text-left text-sm">
                   <tbody className="divide-y divide-slate-800">
                     {Object.entries(process.custom_metrics).map(([key, value]) => {
                       if (key === 'req/min' || key === 'latency') return null; // already shown in charts
                       return (
                         <tr key={key} className="hover:bg-white/5">
                           <td className="p-3 font-semibold text-slate-400 w-1/2">{key}</td>
                           <td className="p-3 text-amber-400 font-mono">{value}</td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
            </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-6 md:p-12 text-slate-200 font-sans">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } }}/>
      
      {renderProcessModal()}

      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-500/20 rounded-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary-500/20 blur-xl group-hover:bg-primary-500/40 transition-all"></div>
              <Activity className="w-8 h-8 text-primary-400 relative z-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">PM2-Watch <span className="text-sm font-normal text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full ml-2 border border-primary-500/20 tracking-wider">PRO</span></h1>
              <p className="text-slate-400 font-medium mt-1">Advanced Network & Cluster Monitoring</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="glass-panel px-4 py-2 flex items-center gap-3 bg-slate-800/50">
              <span className="relative flex h-3 w-3">
                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", socket?.connected ? "bg-emerald-400" : "bg-rose-400")}></span>
                <span className={cn("relative inline-flex rounded-full h-3 w-3", socket?.connected ? "bg-emerald-500" : "bg-rose-500")}></span>
              </span>
              <span className="text-sm font-medium">{socket?.connected ? 'Live Data Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </header>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.filter(s => s.status === 'online').map(server => {
            const sys = server.sysinfo;
            const totalPm2Mem = (server.metrics || []).reduce((acc, p) => acc + p.memory, 0);
            const totalReqMin = (server.metrics || []).reduce((acc, p) => acc + (p.req_min ? parseFloat(p.req_min) : 0), 0);
            const totalErrors = (server.metrics || []).reduce((acc, p) => {
              const errVal = p.custom_metrics && p.custom_metrics['Error Req/min'];
              return acc + (errVal ? parseFloat(errVal) : 0);
            }, 0);
            
            if (!sys) return null;
            const totalMem = sys.totalmem;
            const freeMem = sys.freemem;
            const osMemUsage = ((totalMem - freeMem) / totalMem * 100).toFixed(1);
            const loadStr = sys.loadavg ? sys.loadavg[0].toFixed(2) : '';

            return (
              <div key={`sys-${server.serverId}`} className="glass-panel p-6 relative overflow-hidden group col-span-1 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-800/40 border-slate-700/50 hover:border-primary-500/30 transition-colors">
                {/* OS Stats */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Server className="w-4 h-4 text-primary-400"/> {server.serverName} (OS)
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-400 text-xs font-semibold">OS CPU Load</span>
                        <span className="font-mono text-sm text-white">{loadStr}</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2">
                        <div className={cn("h-2 rounded-full", sys.loadavg[0] > 1 ? 'bg-amber-500' : 'bg-primary-500')} style={{ width: `${Math.min(sys.loadavg[0]*100, 100)}%` }}></div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-400 text-xs font-semibold">OS Memory</span>
                        <span className={cn("font-mono text-sm", osMemUsage > 80 ? 'text-rose-400' : 'text-emerald-400')}>{osMemUsage}%</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2">
                        <div className={cn("h-2 rounded-full", osMemUsage > 80 ? 'bg-rose-500' : 'bg-emerald-500')} style={{ width: `${osMemUsage}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PM2 & Network Total Stats */}
                <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-700/50 pt-4 md:pt-0 md:pl-6">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-purple-400"/> App Network & Memory
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 font-semibold mb-1">TOTAL RPM</div>
                      <div className="text-2xl font-bold text-purple-400 font-mono tracking-tight">{totalReqMin.toFixed(0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-semibold mb-1">ERRORS RPM</div>
                      <div className={cn("text-2xl font-bold font-mono tracking-tight", totalErrors > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-500')}>{totalErrors.toFixed(0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-semibold mb-1">TOTAL MEMORY</div>
                      <div className="text-2xl font-bold text-amber-400 font-mono tracking-tight">{formatMemory(totalPm2Mem)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-semibold mb-1">WORKERS</div>
                      <div className="text-2xl font-bold text-white font-mono">{server.metrics?.length || 0}</div>
                    </div>
                  </div>
                </div>

                {/* Status & Uptime */}
                <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-700/50 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
                   <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700/30">
                    <span className="text-slate-400 text-xs font-semibold flex items-center gap-2"><Clock className="w-4 h-4"/> UPTIME</span>
                    <span className="font-mono text-sm text-emerald-400">{formatUptime(sys.uptime)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 p-1 glass-panel w-fit rounded-xl">
          <button onClick={() => setActiveTab('processes')} className={cn("px-6 py-2.5 rounded-lg text-sm font-semibold transition-all", activeTab === 'processes' ? "bg-primary-500 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-white/5")}>Processes Overview</button>
          <button onClick={() => setActiveTab('logs')} className={cn("px-6 py-2.5 rounded-lg text-sm font-semibold transition-all", activeTab === 'logs' ? "bg-primary-500 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-white/5")}>Real-time Logs</button>
        </div>

        {activeTab === 'processes' && (
          <div className="grid gap-6">
            {servers.length === 0 && (
              <div className="glass-panel p-12 text-center text-slate-400 flex flex-col items-center gap-4"><Activity className="w-12 h-12 text-slate-500 opacity-50" /><p>Waiting for PM2 Agents to connect...</p></div>
            )}
            
            {servers.map((server) => (
              <div key={`proc-${server.serverId}`} className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700/50">
                        <th className="p-4 font-semibold">Worker</th>
                        <th className="p-4 font-semibold text-center">Status</th>
                        <th className="p-4 font-semibold text-right">CPU</th>
                        <th className="p-4 font-semibold text-right">Req/Min</th>
                        <th className="p-4 font-semibold text-right">Latency</th>
                        <th className="p-4 font-semibold w-48 text-right">Memory Allocated</th>
                        <th className="p-4 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {server.metrics?.map((proc) => {
                        const memPercent = proc.max_memory > 0 ? (proc.memory / proc.max_memory) * 100 : 0;
                        return (
                          <tr key={proc.id} className="hover:bg-slate-800/30 transition-colors group">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-mono text-xs text-slate-400">
                                  #{proc.id}
                                </div>
                                <div className="font-semibold text-slate-200">
                                  <div className="flex items-center gap-2">
                                    {proc.name}
                                    <button onClick={() => setSelectedProcess({serverId: server.serverId, process: proc})} className="text-slate-500 hover:text-primary-400 transition-colors">
                                      <Info className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium inline-block", getStatusColor(proc.status))}>
                                {proc.status}
                              </span>
                            </td>
                            <td className="p-4 text-right font-mono">
                              <div className={cn("flex items-center justify-end gap-2 text-sm", proc.cpu > 80 ? 'text-rose-400 font-bold' : 'text-slate-300')}>
                                {proc.cpu}%
                              </div>
                            </td>
                            <td className="p-4 text-right font-mono text-purple-400">
                               {proc.req_min ? parseFloat(proc.req_min).toFixed(1) : 0}
                            </td>
                            <td className="p-4 text-right font-mono text-amber-400">
                               {proc.latency ? parseFloat(proc.latency).toFixed(1) + 'ms' : '0ms'}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex flex-col gap-1.5 items-end w-full">
                                <div className="flex items-center justify-end gap-1 text-xs font-mono">
                                  <span className="text-emerald-400 font-bold">{formatMemory(proc.memory)}</span>
                                  {proc.max_memory > 0 && <span className="text-slate-500">/ {formatMemory(proc.max_memory)}</span>}
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                  {proc.max_memory > 0 ? (
                                    <div 
                                      className={cn("h-full rounded-full transition-all duration-500", memPercent > 85 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-emerald-500')} 
                                      style={{ width: `${Math.min(memPercent, 100)}%` }}
                                    ></div>
                                  ) : (
                                    <div className="h-full rounded-full bg-primary-500/30 w-full animate-pulse"></div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleAction(server.serverId, proc.id, 'restart')} className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-primary-500 hover:border-primary-500 text-white transition-all shadow-lg" title="Restart">
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleAction(server.serverId, proc.id, 'stop')} className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-rose-500 hover:border-rose-500 text-white transition-all shadow-lg" title="Stop">
                                  <Square className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="glass-panel overflow-hidden flex flex-col h-[600px]">
            <div className="bg-slate-800/80 p-4 border-b border-slate-700/50 flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-500/20 rounded-lg">
                  <TerminalSquare className="text-primary-400 w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-white">Aggregated Log Stream</h2>
                {searchTerm && (
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full ml-2">
                    {filteredLogs.length} results
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="FlexSearch logs..." 
                    className="w-full bg-[#0a0f18] border border-slate-700 rounded-full pl-9 pr-4 py-1.5 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button className="text-xs bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-full transition-colors font-semibold shrink-0" onClick={() => { setLogs([]); searchIndex.current = new (FlexSearch.Index || FlexSearch)({ tokenize: "forward" }); }}>
                  Clear
                </button>
              </div>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto font-mono text-sm bg-[#0a0f18]">
              {filteredLogs.length === 0 ? (
                <div className="text-slate-500 italic flex items-center justify-center h-full">
                  {searchTerm ? 'No logs match your FlexSearch query.' : 'Listening for stdout/stderr...'}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredLogs.map((log, i) => {
                    const timeStr = new Date(log.timestamp || Date.now()).toLocaleTimeString('vi-VN', { hour12: false });
                    return (
                      <div key={`log-${log._id}`} className="flex gap-3 hover:bg-white/5 px-2 py-1 rounded border-l-2 border-transparent hover:border-primary-500/50 transition-colors">
                        <span className="text-slate-500 shrink-0 select-none w-20">[{timeStr}]</span>
                        <span className="text-slate-600 shrink-0 select-none">[{log.serverName || log.serverId}]</span>
                        <span className="text-primary-400 font-bold shrink-0 w-32 truncate">{log.process_name}</span>
                        <span className={cn("break-all", log.type === 'err' ? 'text-rose-400' : 'text-slate-300')}>
                          {log.message}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
