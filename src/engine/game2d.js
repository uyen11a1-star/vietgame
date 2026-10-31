import { VietGameAudio } from "./audio.js";

export class VietGame2D {
  constructor(canvas, options = {}) {
    if (!canvas || typeof canvas.getContext !== "function") {
      throw new Error("VietGame: Canvas khong hop le.");
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.audio = new VietGameAudio({ audioFactory: options.audioFactory });

    if (!this.ctx) {
      throw new Error("VietGame: Khong the tao Canvas 2D context.");
    }

    this.width = options.width ?? 800;
    this.height = options.height ?? 600;
    this.background = options.background ?? "#111111";
    this.running = false;
    this.destroyed = false;
    this.frameId = null;
    this.lastTime = null;
    this.updateCallback = null;
    this.renderCallback = null;
    this.requestFrame = options.requestAnimationFrame ??
      globalThis.requestAnimationFrame?.bind(globalThis);
    this.cancelFrame = options.cancelAnimationFrame ??
      globalThis.cancelAnimationFrame?.bind(globalThis);

    this.pressedKeys = new Set();
    this.keyboardTarget = null;

    this.mouseTarget = null;
    this.mousePosition = { x: 0, y: 0 };
    this.pressedMouseButtons = new Set();

    this.touchTarget = null;
    this.activeTouches = new Map();
    this.touchPosition = { x: 0, y: 0 };

    this.handlePointerDown = event => {
      if (event?.pointerType !== "touch") return;
      this.updateTouchPosition(event);
      this.activeTouches.set(event.pointerId, { ...this.touchPosition });
      event.preventDefault?.();
      try {
        this.touchTarget?.setPointerCapture?.(event.pointerId);
      } catch {}
    };

    this.handlePointerMove = event => {
      if (!this.activeTouches.has(event?.pointerId)) return;
      this.updateTouchPosition(event);
      this.activeTouches.set(event.pointerId, { ...this.touchPosition });
      event.preventDefault?.();
    };

    this.handlePointerEnd = event => {
      if (this.activeTouches.has(event?.pointerId)) {
        this.updateTouchPosition(event);
        this.activeTouches.delete(event.pointerId);
        event.preventDefault?.();
      }
    };

    this.handleMouseMove = event => this.updateMousePosition(event);
    this.handleMouseDown = event => {
      this.updateMousePosition(event);
      if (Number.isInteger(event?.button)) {
        this.pressedMouseButtons.add(event.button);
      }
    };
    this.handleMouseUp = event => {
      this.updateMousePosition(event);
      if (Number.isInteger(event?.button)) {
        this.pressedMouseButtons.delete(event.button);
      }
    };
    this.handleMouseLeave = () => this.pressedMouseButtons.clear();
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

    if (options.mouseTarget) {
      this.attachMouse(options.mouseTarget);
    }

    if (options.touchTarget) {
      this.attachTouch(options.touchTarget);
    }
  }

  attachTouch(target) {
    if (this.destroyed) {
      throw new Error("VietGame: Game da bi huy.");
    }

    if (!target ||
        typeof target.addEventListener !== "function" ||
        typeof target.removeEventListener !== "function") {
      throw new Error("VietGame: Doi tuong cam ung khong hop le.");
    }

    if (this.touchTarget === target) return;

    this.detachTouch();
    this.touchTarget = target;
    this.previousTouchAction = target.style?.touchAction;

    if (target.style) target.style.touchAction = "none";

    target.addEventListener("pointerdown", this.handlePointerDown);
    target.addEventListener("pointermove", this.handlePointerMove);
    target.addEventListener("pointerup", this.handlePointerEnd);
    target.addEventListener("pointercancel", this.handlePointerEnd);
  }

  detachTouch() {
    if (!this.touchTarget) return;

    this.touchTarget.removeEventListener("pointerdown", this.handlePointerDown);
    this.touchTarget.removeEventListener("pointermove", this.handlePointerMove);
    this.touchTarget.removeEventListener("pointerup", this.handlePointerEnd);
    this.touchTarget.removeEventListener("pointercancel", this.handlePointerEnd);

    if (this.touchTarget.style) {
      this.touchTarget.style.touchAction = this.previousTouchAction ?? "";
    }

    this.touchTarget = null;
    this.activeTouches.clear();
    this.previousTouchAction = undefined;
  }

  updateTouchPosition(event) {
    if (!event ||
        !Number.isFinite(event.clientX) ||
        !Number.isFinite(event.clientY)) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect?.() ?? {
      left: 0,
      top: 0,
      width: this.width,
      height: this.height
    };

    const scaleX = rect.width > 0 ? this.width / rect.width : 1;
    const scaleY = rect.height > 0 ? this.height / rect.height : 1;

    this.touchPosition.x = Math.max(
      0,
      Math.min((event.clientX - rect.left) * scaleX, this.width)
    );
    this.touchPosition.y = Math.max(
      0,
      Math.min((event.clientY - rect.top) * scaleY, this.height)
    );
  }

  isTouching() {
    return this.activeTouches.size > 0;
  }

  getTouchPosition() {
    return { ...this.touchPosition };
  }

  getTouchCount() {
    return this.activeTouches.size;
  }

  isInputDown(input) {
    if (typeof input !== "string") return false;

    if (input === "touch") return this.isTouching();

    if (input.startsWith("key:")) {
      return this.isKeyDown(input.slice(4));
    }

    if (input.startsWith("mouse:")) {
      return this.isMouseDown(input.slice(6));
    }

    return false;
  }

  getInputPosition() {
    if (this.isTouching()) {
      return this.getTouchPosition();
    }

    return this.getMousePosition();
  }

  getInputCount() {
    return (
      this.pressedKeys.size +
      this.pressedMouseButtons.size +
      this.activeTouches.size
    );
  }

  attachMouse(target) {
    if (this.destroyed) {
      throw new Error("VietGame: Game da bi huy.");
    }

    if (!target ||
        typeof target.addEventListener !== "function" ||
        typeof target.removeEventListener !== "function") {
      throw new Error("VietGame: Doi tuong chuot khong hop le.");
    }

    if (this.mouseTarget === target) return;

    this.detachMouse();
    this.mouseTarget = target;

    target.addEventListener("mousemove", this.handleMouseMove);
    target.addEventListener("mousedown", this.handleMouseDown);
    target.addEventListener("mouseup", this.handleMouseUp);
    target.addEventListener("mouseleave", this.handleMouseLeave);
  }

  detachMouse() {
    if (!this.mouseTarget) return;

    this.mouseTarget.removeEventListener("mousemove", this.handleMouseMove);
    this.mouseTarget.removeEventListener("mousedown", this.handleMouseDown);
    this.mouseTarget.removeEventListener("mouseup", this.handleMouseUp);
    this.mouseTarget.removeEventListener("mouseleave", this.handleMouseLeave);

    this.mouseTarget = null;
    this.pressedMouseButtons.clear();
  }

  updateMousePosition(event) {
    if (!event ||
        !Number.isFinite(event.clientX) ||
        !Number.isFinite(event.clientY)) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect?.() ?? {
      left: 0,
      top: 0,
      width: this.width,
      height: this.height
    };

    const scaleX = rect.width > 0 ? this.width / rect.width : 1;
    const scaleY = rect.height > 0 ? this.height / rect.height : 1;

    this.mousePosition.x = Math.max(
      0,
      Math.min((event.clientX - rect.left) * scaleX, this.width)
    );
    this.mousePosition.y = Math.max(
      0,
      Math.min((event.clientY - rect.top) * scaleY, this.height)
    );
  }

  isMouseDown(button) {
    const buttons = {
      trai: 0,
      giua: 1,
      phai: 2
    };

    const normalized = typeof button === "string"
      ? buttons[button]
      : button;

    if (![0, 1, 2].includes(normalized)) return false;
    return this.pressedMouseButtons.has(normalized);
  }

  getMousePosition() {
    return { ...this.mousePosition };
  }

  attachKeyboard(target) {
    if (this.destroyed) {
      throw new Error("VietGame: Game da bi huy.");
    }

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

  phatAmThanh(src) {
    return this.audio.playSound(src);
  }

  phatNhacNen(src) {
    return this.audio.playMusic(src);
  }

  dungAmThanh() {
    this.audio.stop();
  }

  tamDungAmThanh() {
    this.audio.pause();
  }

  tiepTucAmThanh() {
    this.audio.resume();
  }

  datAmLuong(value) {
    return this.audio.setVolume(value);
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

  collides(first, second) {
    const valid = value =>
      value && typeof value === "object" &&
      Number.isFinite(value.x) &&
      Number.isFinite(value.y) &&
      Number.isFinite(value.width) &&
      Number.isFinite(value.height) &&
      value.width >= 0 && value.height >= 0;

    if (!valid(first) || !valid(second)) {
      throw new Error("VietGame: Hinh chu nhat va cham khong hop le.");
    }

    return first.x < second.x + second.width &&
      first.x + first.width > second.x &&
      first.y < second.y + second.height &&
      first.y + first.height > second.y;
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
    if (this.destroyed) {
      throw new Error("VietGame: Khong the chay game da bi huy.");
    }

    if (this.running) return;

    if (typeof update !== "function" ||
        typeof render !== "function") {
      throw new Error("VietGame: Can ham update va render.");
    }

    if (typeof this.requestFrame !== "function" ||
        typeof this.cancelFrame !== "function") {
      throw new Error("VietGame: Trinh duyet khong ho tro requestAnimationFrame.");
    }

    this.updateCallback = update;
    this.renderCallback = render;
    this.running = true;
    this.lastTime = null;

    const loop = (time) => {
      if (!this.running) return;

      const deltaTime = this.lastTime === null
        ? 0
        : Math.min(Math.max((time - this.lastTime) / 1000, 0), 0.1);

      this.lastTime = time;
      this.frameId = null;

      try {
        update(deltaTime);
        render(this.ctx);
      } catch (error) {
        this.stop();
        throw error;
      }

      if (this.running) {
        this.frameId = this.requestFrame(loop);
      }
    };

    this.frameId = this.requestFrame(loop);
  }

  resume() {
    if (this.destroyed) {
      throw new Error("VietGame: Khong the chay lai game da bi huy.");
    }

    if (this.running) return;

    if (!this.updateCallback || !this.renderCallback) {
      throw new Error("VietGame: Chua co game loop de tiep tuc.");
    }

    this.start(this.updateCallback, this.renderCallback);
  }

  destroy() {
    if (this.destroyed) return;

    this.stop();
    this.audio.destroy();
    this.detachKeyboard();
    this.detachMouse();
    this.detachTouch();
    this.updateCallback = null;
    this.renderCallback = null;
    this.destroyed = true;
  }

  stop() {
    this.running = false;

    if (this.frameId !== null) {
      this.cancelFrame?.(this.frameId);
      this.frameId = null;
    }

    this.lastTime = null;
  }
}
