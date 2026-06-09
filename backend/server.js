require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const PORT = process.env.PORT || 3000;
const AGENT_API_KEY = process.env.AGENT_API_KEY || 'default_secret';

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files
const distPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(distPath));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const connectedAgents = {};

io.on('connection', (socket) => {
  const token = socket.handshake.auth.token;
  const isAgent = token === AGENT_API_KEY;
  const isDashboard = socket.handshake.auth.clientType === 'dashboard';

  if (isAgent) {
    const serverId = socket.handshake.auth.serverId;
    const serverName = socket.handshake.auth.serverName;
    
    console.log(`[Backend] Agent connected: ${serverId} (${serverName})`);
    
    connectedAgents[serverId] = {
      socketId: socket.id,
      serverId,
      serverName,
      status: 'online',
      metrics: [],
      sysinfo: null,
      history: []
    };

    socket.on('agent:metrics', (metrics) => {
      if (connectedAgents[serverId]) {
        connectedAgents[serverId].metrics = metrics;
        
        // Push to history (max 60 points ~ 60 seconds)
        const timeStr = new Date().toLocaleTimeString();
        connectedAgents[serverId].history.push({
          time: timeStr,
          timestamp: Date.now(),
          metrics: metrics.map(m => ({ 
            id: m.id, 
            cpu: m.cpu, 
            memory: m.memory,
            req_min: m.req_min,
            latency: m.latency,
            custom_metrics: m.custom_metrics 
          }))
        });
        
        if (connectedAgents[serverId].history.length > 60) {
          connectedAgents[serverId].history.shift();
        }
      }
      io.to('dashboards').emit('dash:update_metrics', {
        serverId,
        serverName,
        metrics,
        history: connectedAgents[serverId]?.history || []
      });
    });

    socket.on('agent:sysinfo', (sysinfo) => {
      if (connectedAgents[serverId]) {
        connectedAgents[serverId].sysinfo = sysinfo;
      }
      io.to('dashboards').emit('dash:update_sysinfo', {
        serverId,
        sysinfo
      });
    });

    socket.on('agent:log', (logData) => {
      io.to('dashboards').emit('dash:new_log', { serverId, ...logData });
    });

    socket.on('disconnect', () => {
      console.log(`[Backend] Agent disconnected: ${serverId}`);
      if (connectedAgents[serverId]) {
        connectedAgents[serverId].status = 'offline';
        io.to('dashboards').emit('dash:agent_offline', { serverId });
      }
    });

  } else if (isDashboard) {
    socket.join('dashboards');
    
    // Initial payload
    socket.emit('dash:initial_state', Object.values(connectedAgents).map(agent => ({
      serverId: agent.serverId,
      serverName: agent.serverName,
      status: agent.status,
      metrics: agent.metrics,
      sysinfo: agent.sysinfo,
      history: agent.history
    })));

    socket.on('dash:action', (payload) => {
      const agent = connectedAgents[payload.serverId];
      if (agent && agent.status === 'online') {
        io.to(agent.socketId).emit('action:process', {
          action: payload.action,
          processId: payload.processId
        });
      }
    });
  }
});

app.get('/api/status', (req, res) => res.send('PM2-Watch Central Backend is running.'));

// Fallback for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

server.listen(PORT, () => console.log(`[Backend] Listening on port ${PORT}`));
