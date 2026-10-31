export class VietGame2D {
  constructor(canvas, options = {}) {
    if (!canvas || typeof canvas.getContext !== "function") {
      throw new Error("VietGame: Canvas khong hop le.");
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    if (!this.ctx) {
      throw new Error("VietGame: Khong the tao Canvas 2D context.");
    }

    this.width = options.width ?? 800;
    this.height = options.height ?? 600;
    this.background = options.background ?? "#111111";
    this.running = false;
    this.frameId = null;
    this.lastTime = 0;

    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  clear(color = this.background) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  rect(x, y, width, height, color = "#ffffff") {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  circle(x, y, radius, color = "#ffffff") {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }

  text(value, x, y, options = {}) {
    const size = options.size ?? 24;
    const color = options.color ?? "#ffffff";
    const font = options.font ?? "Arial";

    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px ${font}`;
    this.ctx.fillText(String(value), x, y);
  }

  start(update, render) {
    if (this.running) return;

    if (typeof update !== "function" ||
        typeof render !== "function") {
      throw new Error("VietGame: Can ham update va render.");
    }

    this.running = true;
    this.lastTime = 0;

    const loop = (time) => {
      if (!this.running) return;

      const deltaTime = this.lastTime === 0
        ? 0
        : Math.min((time - this.lastTime) / 1000, 0.1);

      this.lastTime = time;

      update(deltaTime);
      render(this.ctx);

      this.frameId = requestAnimationFrame(loop);
    };

    this.frameId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;

    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}
