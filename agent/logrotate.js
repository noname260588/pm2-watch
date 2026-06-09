const fs = require('fs');
const path = require('path');
const pm2 = require('pm2');
const zlib = require('zlib');

// 10MB default max size
const MAX_SIZE = 10 * 1024 * 1024;
// 7 files max
const RETAIN_DAYS = 7;

function getFilesizeInBytes(filename) {
  try {
    const stats = fs.statSync(filename);
    return stats.size;
  } catch (e) {
    return 0;
  }
}

function rotateFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const size = getFilesizeInBytes(filePath);
  if (size < MAX_SIZE) return false;

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const newPath = `${filePath}.${dateStr}`;
  
  try {
    fs.renameSync(filePath, newPath);
    console.log(`[LogRotate] Rotated ${filePath} -> ${newPath}`);
    
    // Async compress
    const gzip = zlib.createGzip();
    const source = fs.createReadStream(newPath);
    const destination = fs.createWriteStream(`${newPath}.gz`);
    
    source.pipe(gzip).pipe(destination).on('finish', () => {
      try {
         fs.unlinkSync(newPath); // Delete uncompressed rotated file
      } catch(e){}
    });

    return true;
  } catch (err) {
    console.error(`[LogRotate] Failed to rotate ${filePath}:`, err.message);
    return false;
  }
}

function cleanOldLogs(dirPath, baseName) {
  if (!fs.existsSync(dirPath)) return;
  try {
    const files = fs.readdirSync(dirPath);
    const logFiles = files
      .filter(f => f.startsWith(baseName) && f.endsWith('.gz'))
      .map(f => ({ name: f, path: path.join(dirPath, f), time: fs.statSync(path.join(dirPath, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    // Keep only RETAIN_DAYS files
    if (logFiles.length > RETAIN_DAYS) {
      const toDelete = logFiles.slice(RETAIN_DAYS);
      toDelete.forEach(f => {
        try {
          fs.unlinkSync(f.path);
          console.log(`[LogRotate] Deleted old log ${f.name}`);
        } catch(e){}
      });
    }
  } catch(e) {}
}

function runLogRotation() {
  pm2.list((err, list) => {
    if (err) return;
    
    let rotated = false;
    list.forEach(proc => {
      const outPath = proc.pm2_env.pm_out_log_path;
      const errPath = proc.pm2_env.pm_err_log_path;

      if (outPath && rotateFile(outPath)) {
        rotated = true;
        cleanOldLogs(path.dirname(outPath), path.basename(outPath));
      }
      if (errPath && rotateFile(errPath)) {
        rotated = true;
        cleanOldLogs(path.dirname(errPath), path.basename(errPath));
      }
    });

    if (rotated) {
      // Tell PM2 to reopen log files
      pm2.reloadLogs((err) => {
        if (err) console.error('[LogRotate] Error reloading PM2 logs:', err);
        else console.log('[LogRotate] PM2 logs reloaded successfully.');
      });
    }
  });
}

function initLogRotation() {
  console.log('[LogRotate] Built-in Zero-Config Log Rotation started (Max: 10MB, Retain: 7 files)');
  // Check every 5 minutes
  setInterval(runLogRotation, 5 * 60 * 1000);
  // Run once on startup
  setTimeout(runLogRotation, 5000);
}

module.exports = { initLogRotation };
