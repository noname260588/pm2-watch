const io = require('@pm2/io');
const express = require('express');
const http = require('http');

const app = express();
const PORT = Math.floor(Math.random() * (4000 - 3001 + 1)) + 3001;

// Define custom PM2 metrics
const reqMeter = io.meter({
  name: 'req/min',
  samples: 1,
  timeframe: 60
});

const latencyHistogram = io.histogram({
  name: 'latency',
  measurement: 'mean'
});

const dbConns = io.metric({
  name: 'Active DB Conns'
});

const extApiMeter = io.meter({
  name: 'Ext API / min',
  samples: 1,
  timeframe: 60
});

const successMeter = io.meter({
  name: 'Success Req/min',
  samples: 1,
  timeframe: 60
});

const errorMeter = io.meter({
  name: 'Error Req/min',
  samples: 1,
  timeframe: 60
});

app.get('/api/test', (req, res) => {
  const start = Date.now();
  
  // Mark request
  reqMeter.mark();

  // Simulate random delay between 20ms and 500ms
  const delay = Math.floor(Math.random() * 480) + 20;
  
  setTimeout(() => {
    // Record latency
    latencyHistogram.update(Date.now() - start);
    
    if (Math.random() < 0.1) {
      errorMeter.mark();
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      successMeter.mark();
      res.json({ success: true, delay });
    }
  }, delay);
});

app.listen(PORT, () => {
  console.log(`[Worker] Express Server running on port ${PORT}`);
  
  let logCounter = 0;
  // Simulate random traffic using native http module
  setInterval(() => {
    const burst = Math.floor(Math.random() * 15) + 5; // 5 to 20 requests per second
    
    logCounter++;
    if (logCounter % 5 === 0) {
      console.error(`[Worker] Simulated Error: Database connection timeout during burst of ${burst}`);
    } else {
      console.log(`[Worker] Generating HTTP traffic: Sending ${burst} concurrent requests...`);
    }

    // Simulate DB connection fluctuations
    dbConns.set(Math.floor(Math.random() * 80) + 20); // 20 to 100 conns
    
    // Simulate external API calls (e.g., payment gateway, SMS)
    if (Math.random() > 0.3) {
      const extBurst = Math.floor(Math.random() * 3) + 1;
      for(let i=0; i<extBurst; i++) extApiMeter.mark();
    }

    for(let i = 0; i < burst; i++) {
      http.get(`http://localhost:${PORT}/api/test`, (res) => {
        // consume response to avoid memory leaks
        res.on('data', () => {}); 
        res.on('end', () => {});
      }).on('error', () => {});
    }
  }, 1000);
});
