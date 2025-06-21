const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '../logs.db');
const db = new sqlite3.Database(dbPath);

// Initialize the logs table if it doesn't exist
function init(cb) {
  db.run(`CREATE TABLE IF NOT EXISTS status_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT NOT NULL,
    note TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, cb);
}

// Insert a new status change, now with note
function logStatusChange(status, note = null) {
  db.run('INSERT INTO status_logs (status, note) VALUES (?, ?)', [status, note]);
}

// Fetch the last N status changes
function getLastStatusChanges(limit = 10, callback) {
  db.all('SELECT * FROM status_logs ORDER BY timestamp DESC LIMIT ?', [limit], (err, rows) => {
    callback(err, rows);
  });
}

// Fetch the last N downtimes (status = "offline")
function getLastDowntimes(limit = 10, callback) {
  db.all('SELECT * FROM status_logs WHERE status = ? ORDER BY timestamp DESC LIMIT ?', ['offline', limit], (err, rows) => {
    callback(err, rows);
  });
}

// Fetch the last N status notes (where note is not null or empty)
function getLastStatusNotes(limit = 10, callback) {
  db.all('SELECT * FROM status_logs WHERE note IS NOT NULL AND note != "" ORDER BY timestamp DESC LIMIT ?', [limit], (err, rows) => {
    callback(err, rows);
  });
}

module.exports = {
  init,
  logStatusChange,
  getLastStatusChanges,
  getLastDowntimes,
  getLastStatusNotes,
}; 