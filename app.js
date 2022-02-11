const express = require('express');
const bodyParser = require('body-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const PaintBoardSizeX = 1280;
const PaintBoardSizeY = 720;

const matrix = new Array(PaintBoardSizeY).fill(null).map(
  () => new Array(PaintBoardSizeX).fill([0, 0, 0, 255]),
);

app.get('/', (req, res) => res.sendFile(`${__dirname}/index.html`));

app.get('/index.js', (req, res) => res.sendFile(`${__dirname}/index.js`));

app.use('/node_modules', express.static('node_modules'));

app.get(
  '/board',
  (req, res) => res.send(JSON.stringify(matrix)),
);

app.post('/paint', (req, res) => {
  const {
    x, y, r, g, b, a,
  } = req.body;
  if (
    x > PaintBoardSizeX || x < 0 || y > PaintBoardSizeY || y < 0
    || r > 255 || r < 0 || g > 255 || g < 0 || b > 255 || b < 0 || a > 255 || a < 0
  ) {
    res.status(400);
    res.json({ success: false, data: 'Invalid parameters' });
  }

  matrix[y][x] = [r, g, b, a];
  res.json({ success: true, data: null });
  io.emit('matrix_update', {
    x, y, color: matrix[y][x],
  });
});

httpServer.listen(3003, () => console.log('Listening on :3003'));
