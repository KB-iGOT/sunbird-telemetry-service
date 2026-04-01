const express = require('express'),
  cluster = require('express-cluster'),
  cookieParser = require('cookie-parser'),
  logger = require('morgan'),
  bodyParser = require('body-parser'),
  envVariables = require('./envVariables'),
  port = envVariables.port,
  threads = envVariables.threads;

// Global error handlers to prevent service crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (error.code === 'ERR_HTTP_HEADERS_SENT') {
    console.error('Headers already sent error - continuing service operation');
    return; // Don't crash on this specific error
  }
  // For other critical errors, still exit
  console.error('Critical error, exiting...');
  // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const createAppServer = () => {
  const app = express();
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization,' + 'cid, user-id, x-auth, Cache-Control, X-Requested-With, datatype, *')
    if (req.method === 'OPTIONS') res.sendStatus(200)
    else next()
  })
  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(logger('dev'));
  app.use(express.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use('/', require('./routes'));
  
  // Error handling middleware - must be last
  app.use((err, req, res, next) => {
    console.error('Express error handler:', err);
    
    // Handle ERR_HTTP_HEADERS_SENT specifically
    if (err.code === 'ERR_HTTP_HEADERS_SENT') {
      console.error('Headers already sent error caught in middleware');
      return; // Don't try to send response
    }
    
    // Handle other errors
    if (!res.headersSent) {
      res.status(500).json({
        id: 'api.error',
        ver: '1.0',
        ets: new Date().getTime(),
        params: { err: err.message || 'Internal server error' },
        responseCode: 'SERVER_ERROR'
      });
    }
  });
  
  module.exports = app;
  return app;
}

if (process.env.node_env !== 'test') {
  cluster((worker) => {
    const app = createAppServer();
    const server = app.listen(port, () => console.log(`telemetry services cluster is running on port ${port} with ${process.pid} pid`));
    server.keepAliveTimeout = 60000 * 5;
    return server;
  }, { count: threads });
} else {
  const app = createAppServer();
  const server = app.listen(port, () => console.log(`telemetry services is running in test env on port ${port} with ${process.pid} pid`));
  server.keepAliveTimeout = 60000 * 5;
  return server;
}
