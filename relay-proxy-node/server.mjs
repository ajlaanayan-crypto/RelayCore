import http from 'node:http';
import { URL } from 'node:url';

const PORT = process.env.PORT || 8085;
const connectionPool = new Map();

function getEnvClients(env) {
  if (!connectionPool.has(env)) {
    connectionPool.set(env, new Set());
  }
  return connectionPool.get(env);
}

function getActiveCount() {
  let count = 0;
  for (const set of connectionPool.values()) {
    count += set.size;
  }
  return count;
}

export function broadcastDelta(env, event) {
  const clients = getEnvClients(env);
  if (clients.size === 0) return;

  const payload = `data: ${JSON.stringify(event)}\n\n`;

  for (const res of clients) {
    try {
      const canWrite = res.write(payload);
      if (!canWrite) {
        res.once('drain', () => {});
      }
    } catch {
      clients.delete(res);
    }
  }
}

setInterval(() => {
  const heartbeat = {
    type: 'HEARTBEAT',
    timestamp: new Date().toISOString(),
  };
  const payload = `data: ${JSON.stringify(heartbeat)}\n\n`;

  for (const set of connectionPool.values()) {
    for (const res of set) {
      try {
        res.write(payload);
      } catch {
        set.delete(res);
      }
    }
  }
}, 15000);

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  const env = parsedUrl.searchParams.get('env') || 'production';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        runtime: `Node.js ${process.version}`,
        activeConnections: getActiveCount(),
        memoryUsageMB: {
          rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
          heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
        },
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  if (pathname === '/api/internal/invalidate' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        if (!event.timestamp) event.timestamp = new Date().toISOString();
        broadcastDelta(event.environment || 'production', event);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'broadcasted', activeClients: getEnvClients(event.environment).size }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const clientEnv = getEnvClients(env);
    clientEnv.add(res);

    res.write(`: connected [env: ${env}, node: ${process.version}]\n\n`);

    req.on('close', () => {
      clientEnv.delete(res);
    });

    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
  console.log(`NexusFlag Edge Relay running on :${PORT}`);
});
