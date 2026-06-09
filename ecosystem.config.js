const path = require('path');

module.exports = {
  apps: [
    {
      name: "pm2-watch-backend",
      script: "./server.js",
      cwd: path.join(__dirname, "backend"),
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "pm2-watch-agent",
      script: "./index.js",
      cwd: path.join(__dirname, "agent"),
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
