import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { Activity, Square, RotateCcw, TerminalSquare, Info, Search, LayoutDashboard } from 'lucide-react';
import { cn, formatMemory, getStatusColor } from './lib/utils';
import toast, { Toaster } from 'react-hot-toast';
import FlexSearch from 'flexsearch';
import GlobalDashboard from './components/GlobalDashboard';
import ProcessModal from './components/ProcessModal';

const BACKEND_URL = 'http://localhost:3000';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [servers, setServers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('global');
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [selectedLogProcess, setSelectedLogProcess] = useState('All');
  
  const logsEndRef = useRef(null);
  const logIdCounter = useRef(0);
  const searchIndex = useRef(null);
  
  if (!searchIndex.current) {
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
      searchIndex.current.add(id, `${logData.process_name} ${logData.message}`);

      setLogs((prevLogs) => {
        const updated = [...prevLogs, logWithId];
        if (updated.length > 500) {
          const removed = updated.shift();
          searchIndex.current.remove(removed._id);
        }
        return updated;
      });
    });

    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  useEffect(() => {
    let result = logs;
    
    if (selectedLogProcess !== 'All') {
      result = result.filter(l => l.process_name === selectedLogProcess);
    }

    if (searchTerm) {
      const results = searchIndex.current.search(searchTerm);
      const resultSet = new Set(results);
      result = result.filter(l => resultSet.has(l._id));
    }
    
    setFilteredLogs(result);
  }, [searchTerm, logs, selectedLogProcess]);

  useEffect(() => {
    if (activeTab === 'logs') logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredLogs, activeTab]);

  const handleAction = (serverId, processId, action) => {
    if (confirm(`Are you sure you want to ${action} process ID ${processId}?`)) {
      socket?.emit('dash:action', { serverId, processId, action });
      toast(`Sent ${action} command`, { icon: '🚀' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f18] via-slate-900 to-[#0a0f18] p-4 md:p-8 text-slate-200 font-sans">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } }}/>
      
      <ProcessModal 
        selectedProcess={selectedProcess} 
        servers={servers} 
        onClose={() => setSelectedProcess(null)} 
      />

      <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-6 bg-slate-900/60 shadow-2xl border-slate-800/80">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-gradient-to-br from-primary-500/20 to-purple-500/20 rounded-2xl relative overflow-hidden group border border-white/5 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <div className="absolute inset-0 bg-primary-500/20 blur-xl group-hover:bg-primary-500/40 transition-all"></div>
              <Activity className="w-8 h-8 text-primary-400 relative z-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                PM2-Watch 
                <span className="text-xs font-bold text-white bg-gradient-to-r from-primary-600 to-purple-600 px-2.5 py-1 rounded-full border border-white/10 tracking-widest shadow-lg">PRO</span>
              </h1>
              <p className="text-slate-400 font-medium mt-1 text-sm">Centralized Performance Monitoring</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="glass-panel px-4 py-2 flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl shadow-inner">
              <span className="relative flex h-3 w-3">
                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", socket?.connected ? "bg-emerald-400" : "bg-rose-400")}></span>
                <span className={cn("relative inline-flex rounded-full h-3 w-3", socket?.connected ? "bg-emerald-500" : "bg-rose-500")}></span>
              </span>
              <span className="text-sm font-semibold tracking-wide text-slate-300">{socket?.connected ? 'Live Sync Active' : 'Disconnected'}</span>
            </div>
          </div>
        </header>

        <div className="flex gap-2 p-1.5 glass-panel w-fit rounded-xl bg-slate-900/60 border border-slate-700/50 shadow-lg">
          <button onClick={() => setActiveTab('global')} className={cn("flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300", activeTab === 'global' ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] border-white/10" : "text-slate-400 hover:text-white hover:bg-white/5 border-transparent")}><LayoutDashboard className="w-4 h-4" /> Global Dashboard</button>
          <button onClick={() => setActiveTab('processes')} className={cn("flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300", activeTab === 'processes' ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] border-white/10" : "text-slate-400 hover:text-white hover:bg-white/5 border-transparent")}><Activity className="w-4 h-4" /> Nodes & Processes</button>
          <button onClick={() => setActiveTab('logs')} className={cn("flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300", activeTab === 'logs' ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] border-white/10" : "text-slate-400 hover:text-white hover:bg-white/5 border-transparent")}><TerminalSquare className="w-4 h-4" /> Stream Logs</button>
        </div>

        {activeTab === 'global' && <GlobalDashboard servers={servers} />}

        {activeTab === 'processes' && (
          <div className="grid gap-6 animate-fade-in">
            {servers.length === 0 && (
              <div className="glass-panel p-12 text-center text-slate-400 flex flex-col items-center gap-4">
                <div className="w-16 h-16 relative">
                   <div className="absolute inset-0 bg-primary-500/20 rounded-full animate-ping"></div>
                   <Activity className="w-16 h-16 text-slate-600 relative z-10" />
                </div>
                <p className="text-lg">Waiting for PM2 Agents to connect...</p>
              </div>
            )}
            
            {servers.map((server) => (
              <div key={`proc-${server.serverId}`} className="glass-panel overflow-hidden bg-slate-900/60 border-slate-700/50 shadow-xl">
                 <div className="bg-slate-800/80 p-4 border-b border-slate-700/50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Node: {server.serverName}
                    </h3>
                 </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/40 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700/50">
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
                          <tr key={proc.id} className="hover:bg-slate-800/40 transition-colors group">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center font-mono text-xs text-slate-400 group-hover:border-primary-500/30 transition-colors">
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
                              <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium inline-block shadow-sm", getStatusColor(proc.status))}>
                                {proc.status}
                              </span>
                            </td>
                            <td className="p-4 text-right font-mono">
                              <div className={cn("flex items-center justify-end gap-2 text-sm", proc.cpu > 80 ? 'text-rose-400 font-bold' : 'text-emerald-400')}>
                                {proc.cpu}%
                              </div>
                            </td>
                            <td className="p-4 text-right font-mono text-purple-400 font-medium">
                               {proc.req_min ? parseFloat(proc.req_min).toFixed(1) : 0}
                            </td>
                            <td className="p-4 text-right font-mono text-amber-400 font-medium">
                               {proc.latency ? parseFloat(proc.latency).toFixed(1) + 'ms' : '0ms'}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex flex-col gap-1.5 items-end w-full">
                                <div className="flex items-center justify-end gap-1 text-xs font-mono">
                                  <span className="text-primary-400 font-bold">{formatMemory(proc.memory)}</span>
                                  {proc.max_memory > 0 && <span className="text-slate-500">/ {formatMemory(proc.max_memory)}</span>}
                                </div>
                                <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden shadow-inner">
                                  {proc.max_memory > 0 ? (
                                    <div 
                                      className={cn("h-full rounded-full transition-all duration-500", memPercent > 85 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-primary-500')} 
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
                                <button onClick={() => { setActiveTab('logs'); setSelectedLogProcess(proc.name); }} className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-purple-500 hover:border-purple-500 text-white transition-all shadow-lg" title="View Logs">
                                  <TerminalSquare className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleAction(server.serverId, proc.id, 'restart')} className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-emerald-500 hover:border-emerald-500 text-white transition-all shadow-lg" title="Restart">
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
          <div className="glass-panel overflow-hidden flex flex-col h-[650px] bg-slate-900/60 shadow-xl border-slate-700/50 animate-fade-in">
            <div className="bg-slate-800/80 p-5 border-b border-slate-700/50 flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
                  <TerminalSquare className="text-purple-400 w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-white">Aggregated Log Stream</h2>
                {searchTerm && (
                  <span className="text-xs font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-1 rounded-full ml-2">
                    {filteredLogs.length} matches
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <select
                  value={selectedLogProcess}
                  onChange={(e) => setSelectedLogProcess(e.target.value)}
                  className="bg-[#0a0f18] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 shadow-inner"
                >
                  <option value="All">All Processes</option>
                  {Array.from(new Set(servers.flatMap(s => (s.metrics || []).map(m => m.name)))).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <div className="relative w-full md:w-64">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="FlexSearch ultra-fast..." 
                    className="w-full bg-[#0a0f18] border border-slate-700 rounded-full pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all shadow-inner"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 px-4 py-2 rounded-full transition-colors font-semibold shrink-0 text-slate-300" onClick={() => { setLogs([]); searchIndex.current = new (FlexSearch.Index || FlexSearch)({ tokenize: "forward" }); }}>
                  Clear Stream
                </button>
              </div>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto font-mono text-sm bg-[#0a0f18] custom-scrollbar">
              {filteredLogs.length === 0 ? (
                <div className="text-slate-500 italic flex items-center justify-center h-full">
                  {searchTerm ? 'No logs match your FlexSearch query.' : 'Listening for stdout/stderr...'}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredLogs.map((log) => {
                    const timeStr = new Date(log.timestamp || Date.now()).toLocaleTimeString('vi-VN', { hour12: false });
                    return (
                      <div key={`log-${log._id}`} className="flex gap-3 hover:bg-slate-800/40 px-2 py-1 rounded border-l-2 border-transparent hover:border-purple-500/50 transition-colors">
                        <span className="text-slate-500 shrink-0 select-none w-20">[{timeStr}]</span>
                        <span className="text-slate-600 shrink-0 select-none">[{log.serverName || log.serverId}]</span>
                        <span className="text-purple-400 font-bold shrink-0 w-32 truncate" title={log.process_name}>{log.process_name}</span>
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
