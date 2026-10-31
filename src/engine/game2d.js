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

    this.pressedKeys = new Set();
    this.keyboardTarget = null;
    this.handleKeyDown = event => {
      if (event && typeof event.key === "string") {
        this.pressedKeys.add(event.key);
      }
    };
    this.handleKeyUp = event => {
      if (event && typeof event.key === "string") {
        this.pressedKeys.delete(event.key);
      }
    };
    this.handleBlur = () => this.pressedKeys.clear();

    if (options.keyboardTarget) {
      this.attachKeyboard(options.keyboardTarget);
    }

    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  attachKeyboard(target) {
    if (!target ||
        typeof target.addEventListener !== "function" ||
        typeof target.removeEventListener !== "function") {
      throw new Error("VietGame: Doi tuong ban phim khong hop le.");
    }

    if (this.keyboardTarget === target) return;

    this.detachKeyboard();
    this.keyboardTarget = target;
    target.addEventListener("keydown", this.handleKeyDown);
    target.addEventListener("keyup", this.handleKeyUp);
    target.addEventListener("blur", this.handleBlur);
  }

  detachKeyboard() {
    if (!this.keyboardTarget) return;

    this.keyboardTarget.removeEventListener("keydown", this.handleKeyDown);
    this.keyboardTarget.removeEventListener("keyup", this.handleKeyUp);
    this.keyboardTarget.removeEventListener("blur", this.handleBlur);
    this.keyboardTarget = null;
    this.pressedKeys.clear();
  }

  isKeyDown(key) {
    if (typeof key !== "string" || key.length === 0) return false;
    return this.pressedKeys.has(key);
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

  createCharacter(x, y, width, height, color = "#ffffff") {
    const values = [x, y, width, height];

    if (!values.every(Number.isFinite) || width <= 0 || height <= 0) {
      throw new Error("VietGame: Toa do va kich thuoc nhan vat khong hop le.");
    }

    return {
      __vietgameCharacter: true,
      x: Math.max(0, Math.min(x, this.width - Math.min(width, this.width))),
      y: Math.max(0, Math.min(y, this.height - Math.min(height, this.height))),
      width,
      height,
      color: String(color)
    };
  }

  moveCharacter(character, dx, dy) {
    if (!character || character.__vietgameCharacter !== true) {
      throw new Error("VietGame: Doi tuong khong phai nhan vat.");
    }

    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
      throw new Error("VietGame: Toc do di chuyen phai la so hop le.");
    }

    const maxX = Math.max(0, this.width - Math.min(character.width, this.width));
    const maxY = Math.max(0, this.height - Math.min(character.height, this.height));

    character.x = Math.max(0, Math.min(character.x + dx, maxX));
    character.y = Math.max(0, Math.min(character.y + dy, maxY));

    return character;
  }

  drawCharacter(character) {
    if (!character || character.__vietgameCharacter !== true) {
      throw new Error("VietGame: Doi tuong khong phai nhan vat.");
    }

    this.rect(
      character.x,
      character.y,
      character.width,
      character.height,
      character.color
    );
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

  destroy() {
    this.stop();
    this.detachKeyboard();
  }

  stop() {
    this.running = false;

    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}
