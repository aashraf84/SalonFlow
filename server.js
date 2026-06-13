const { createServer } = require('http');
const next = require('next');

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = process.env.HOSTNAME || '0.0.0.0';

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

// Global error handlers to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error('[REQUEST ERROR]', err.message);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });
  });

  server.on('error', (err) => {
    console.error('[SERVER ERROR]', err.message);
  });

  server.listen(port, hostname, () => {
    console.log(`> Server listening on http://${hostname}:${port}`);
  });
}).catch((err) => {
  console.error('[STARTUP ERROR]', err);
  process.exit(1);
});
