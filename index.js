const width = 1280;
const height = 720;

let imageBitmap;

async function updateImage(matrix) {
  const imageData = new ImageData(new Uint8ClampedArray(matrix.flat(2)), width, height);
  imageBitmap = await createImageBitmap(imageData);
}

function fillPixel(context, x, y, color) {
  context.fillStyle = `rgba(${color.join(', ')})`;
  context.fillRect(x, y, 1, 1);
}

function fillMatrix(context, matrix, transform) {
  const xs = [];
  const ys = [];
  for (let i = 0; i < width; i += 1) {
    const x = transform.applyX(i);
    if (x > -transform.k && x < width) {
      xs.push(i);
    }
  }
  for (let i = 0; i < height; i += 1) {
    const y = transform.applyY(i);
    if (y > -transform.k && y < height) {
      ys.push(i);
    }
  }
  ys.forEach((i) => {
    xs.forEach((j) => {
      fillPixel(context, j, i, matrix[i][j]);
    });
  });
}

const canvas = window.d3.select('#app').append('canvas')
  .attr('width', width)
  .attr('height', height);
const context = canvas.node().getContext('2d');

let matrix;

function zoomed(transform, end = true) {
  context.save();
  context.clearRect(0, 0, width, height);
  context.translate(transform.x, transform.y);
  context.scale(transform.k, transform.k);
  context.beginPath();
  if (transform.k < 2 || (transform.k < 5 && !end)) {
    context.drawImage(imageBitmap, 0, 0);
  } else {
    fillMatrix(context, matrix, transform);
  }
  context.fill();
  context.restore();
}

async function updatePixel(x, y, color) {
  matrix[y][x] = color;
  await updateImage(matrix);
  zoomed(window.d3.zoomTransform(canvas.node()));
}

const socket = window.io();

window.axios.get('board').then((response) => {
  matrix = response.data;

  socket.on('matrix_update', ({ x, y, color }) => {
    updatePixel(x, y, color);
  });

  updateImage(matrix).then(() => {
    canvas.call(window.d3.zoom()
      .scaleExtent([1, 32])
      .translateExtent([[0, 0], [width, height]])
      .on('end', ({ transform }) => zoomed(transform))
      .on('zoom', ({ transform }) => zoomed(transform, false)))
      .on('click', (arg) => {
        const transform = window.d3.zoomTransform(canvas.node());
        const x = Math.floor((arg.offsetX - transform.x) / transform.k);
        const y = Math.floor((arg.offsetY - transform.y) / transform.k);
        const [r, g, b, a] = [255, 255, 255, 255];
        window.axios.post('paint', {
          x, y, r, g, b, a,
        });
        updatePixel(x, y, [r, g, b, a]);
      });

    zoomed(window.d3.zoomIdentity);
  });
});
