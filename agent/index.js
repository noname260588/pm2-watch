require('dotenv').config();
const pm2 = require('pm2');
const os = require('os');
const { io } = require('socket.io-client');

const SERVER_ID = process.env.SERVER_ID || 'server-1';
const SERVER_NAME = process.env.SERVER_NAME || 'Node.js Server 1';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const AGENT_API_KEY = process.env.AGENT_API_KEY || 'default_secret';

console.log(`[Agent] Starting for server: ${SERVER_ID} (${SERVER_NAME})`);

const socket = io(BACKEND_URL, {
  auth: {
    token: AGENT_API_KEY,
    serverId: SERVER_ID,
    serverName: SERVER_NAME
  }
});

socket.on('connect', () => {
  console.log('[Agent] Connected to Central Backend');
  
  pm2.connect((err) => {
    if (err) {
      console.error('[Agent] PM2 connect error:', err);
      process.exit(2);
    }
    
    console.log('[Agent] Connected to local PM2 Daemon');

    setInterval(() => {
      // 1. Gather PM2 Metrics
      pm2.list((err, list) => {
        if (err) return;
        
        const metrics = list.map(proc => ({
          id: proc.pm_id,
          name: proc.name,
          pid: proc.pid,
          status: proc.pm2_env.status,
          memory: proc.monit ? proc.monit.memory : 0,
          max_memory: proc.pm2_env.max_memory_restart || 0,
          cpu: proc.monit ? proc.monit.cpu : 0,
          restarts: proc.pm2_env.restart_time,
          uptime: proc.pm2_env.pm_uptime,
          req_min: proc.pm2_env.axm_monitor && proc.pm2_env.axm_monitor['req/min'] ? proc.pm2_env.axm_monitor['req/min'].value : 0,
          latency: proc.pm2_env.axm_monitor && proc.pm2_env.axm_monitor['latency'] ? proc.pm2_env.axm_monitor['latency'].value : 0,
          custom_metrics: proc.pm2_env.axm_monitor ? Object.keys(proc.pm2_env.axm_monitor).reduce((acc, key) => {
            acc[key] = proc.pm2_env.axm_monitor[key].value;
            return acc;
          }, {}) : {},
          env: proc.pm2_env // For drill-down
        }));
        
        socket.emit('agent:metrics', metrics);
      });

      // 2. Gather System Metrics
      const sysinfo = {
        uptime: os.uptime(),
        totalmem: os.totalmem(),
        freemem: os.freemem(),
        loadavg: os.loadavg(),
        cpus: os.cpus().length
      };
      socket.emit('agent:sysinfo', sysinfo);

    }, 1000);

    // 3. Listen to Logs
    pm2.launchBus((err, bus) => {
      if (err) return console.error('[Agent] Error launching PM2 bus', err);

      bus.on('log:out', (data) => {
        socket.emit('agent:log', {
          process_id: data.process.pm_id,
          process_name: data.process.name,
          type: 'out',
          message: data.data,
          timestamp: Date.now()
        });
      });

      bus.on('log:err', (data) => {
        socket.emit('agent:log', {
          process_id: data.process.pm_id,
          process_name: data.process.name,
          type: 'err',
          message: data.data,
          timestamp: Date.now()
        });
      });
    });
  });
});

socket.on('disconnect', () => {
  console.log('[Agent] Disconnected from Central Backend');
});

socket.on('action:process', (payload) => {
  if (payload.action === 'restart') {
    pm2.restart(payload.processId, (err) => {
      if (err) console.error(`[Agent] Restart failed:`, err);
    });
  } else if (payload.action === 'stop') {
    pm2.stop(payload.processId, (err) => {
      if (err) console.error(`[Agent] Stop failed:`, err);
    });
  } else if (payload.action === 'start') {
    pm2.start(payload.processId, (err) => {
      if (err) console.error(`[Agent] Start failed:`, err);
    });
  } else if (payload.action === 'reload') {
    pm2.reload(payload.processId, (err) => {
      if (err) console.error(`[Agent] Reload failed:`, err);
    });
  }
});
