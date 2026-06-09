#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const command = process.argv[2];
const ecosystemPath = path.join(__dirname, '../ecosystem.config.js');

function runCommand(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error executing command: ${cmd}`);
    process.exit(1);
  }
}

if (command === 'start') {
  console.log('🚀 Starting PM2-Watch PRO...');
  runCommand(`npx pm2 start "${ecosystemPath}"`);
  console.log('\n✅ PM2-Watch PRO is now running on http://localhost:3000');
  console.log('💡 Type "pm2-watch logs" to see logs, or "pm2-watch stop" to stop.');
} else if (command === 'stop') {
  console.log('🛑 Stopping PM2-Watch PRO...');
  runCommand(`npx pm2 stop "${ecosystemPath}"`);
} else if (command === 'logs') {
  runCommand(`npx pm2 logs pm2-watch-backend`);
} else {
  console.log(`
PM2-Watch PRO CLI

Usage:
  pm2-watch start   - Start the PM2-Watch PRO monitoring system
  pm2-watch stop    - Stop the monitoring system
  pm2-watch logs    - View backend logs
  `);
}
