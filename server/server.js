const websocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');
const uuid = require('uuid');

(async () => {
  const app = express();

  app.use(express.static('dist'));
  app.use('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/index.html'));
  });

  const server = http.createServer(app);
  const websocketServer = new websocket.Server({ server });
  const channels = {};

  websocketServer.on('connection', (connection, req) => {
    const channel = req.url.replace('/', '');
    if (!(channel in channels)) {
      channels[channel] = {};
    }

    connection.id = uuid.v4();
    channels[channel][connection.id] = connection;

    connection.on('message', (data, isBinary) => {
      Object.values(channels[channel])
        .filter((c) => c.id !== connection.id)
        .forEach((c) => c.send(data, { binary: isBinary }));
    });

    connection.on('close', (e) => {
      delete channels[channel][connection.id];

      if (Object.values(channels[channel]).length === 0) {
        delete channels[channel];
      }
    });
  });

  await server.listen(2001, () => {
    console.log('App listening on port : 2001');
  });
})();
