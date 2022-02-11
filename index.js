class PaintBoard {
  constructor(selector, width, height, matrix, callback) {
    this.width = width;
    this.height = height;
    this.matrix = matrix;
    this.canvas = window.d3.select(selector)
      .attr('width', width)
      .attr('height', height);
    this.context = this.canvas.node().getContext('2d');
    this.updateImage(matrix).then(() => {
      this.canvas.call(window.d3.zoom()
        .scaleExtent([1, 32])
        .translateExtent([[0, 0], [width, height]])
        .on('end', ({ transform }) => this.zoomed(transform))
        .on('zoom', ({ transform }) => this.zoomed(transform, false)))
        .on('click', (arg) => {
          const transform = window.d3.zoomTransform(this.canvas.node());
          const x = Math.floor((arg.offsetX - transform.x) / transform.k);
          const y = Math.floor((arg.offsetY - transform.y) / transform.k);
          callback(x, y);
        });
      this.zoomed(window.d3.zoomIdentity);
    });
  }

  async updateImage(matrix) {
    const imageData = new ImageData(new Uint8ClampedArray(matrix.flat(2)), this.width, this.height);
    this.imageBitmap = await createImageBitmap(imageData);
  }

  fillMatrix(context, matrix, transform) {
    const xs = [];
    const ys = [];
    for (let i = 0; i < this.width; i += 1) {
      const x = transform.applyX(i);
      if (x > -transform.k && x < this.width) {
        xs.push(i);
      }
    }
    for (let i = 0; i < this.height; i += 1) {
      const y = transform.applyY(i);
      if (y > -transform.k && y < this.height) {
        ys.push(i);
      }
    }
    ys.forEach((i) => {
      xs.forEach((j) => {
        context.fillStyle = `rgba(${matrix[i][j].join(', ')})`;
        context.fillRect(j, i, 1, 1);
      });
    });
  }

  zoomed(transform, end = true) {
    this.context.save();
    this.context.clearRect(0, 0, this.width, this.height);
    this.context.translate(transform.x, transform.y);
    this.context.scale(transform.k, transform.k);
    this.context.beginPath();
    if (transform.k < 2 || (transform.k < 5 && !end)) {
      this.context.drawImage(this.imageBitmap, 0, 0);
    } else {
      this.fillMatrix(this.context, this.matrix, transform);
    }
    this.context.fill();
    this.context.restore();
  }

  async updatePixel(x, y, color) {
    this.matrix[y][x] = color;
    await this.updateImage(this.matrix);
    this.zoomed(window.d3.zoomTransform(this.canvas.node()));
  }
}

const socket = window.io();

window.axios.get('board').then((response) => {
  window.d3.select('#app').append('canvas');
  const paintboard = new PaintBoard('#app > canvas', 1280, 720, response.data, (x, y) => {
    const [r, g, b, a] = [255, 255, 255, 255];
    window.axios.post('paint', {
      x, y, r, g, b, a,
    });
    paintboard.updatePixel(x, y, [r, g, b, a]);
  });

  socket.on('matrix_update', ({ x, y, color }) => {
    paintboard.updatePixel(x, y, color);
  });
});
