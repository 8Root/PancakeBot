const http = require('http');
const os = require('os');
const readline = require('readline');

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const PORT = 80;
const PATH = '/server';
let isUp = true;

const server = http.createServer((req, res) => {
  if (req.url === PATH) {
    if (isUp) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Server is UP');
    } else {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Server is DOWN');
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  const ip = getLocalIP();
  console.log(`Example server running at http://${ip}${PATH}`);
  console.log(`Type 'down' to simulate server down, 'up' to simulate server up.`);
  console.log(`Current state: ${isUp ? 'UP' : 'DOWN'}`);
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  if (input.trim().toLowerCase() === 'down') {
    isUp = false;
    console.log('Server state changed: DOWN');
  } else if (input.trim().toLowerCase() === 'up') {
    isUp = true;
    console.log('Server state changed: UP');
  }
}); 