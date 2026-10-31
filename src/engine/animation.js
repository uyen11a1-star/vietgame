export class VietGameAnimation {
  constructor(imageManager) {
    if (!imageManager ||
        typeof imageManager.hinhAnhDaTai !== "function" ||
        typeof imageManager.veHinhAnh !== "function" ||
        typeof imageManager.veHinhAnhCoKichThuoc !== "function") {
      throw new Error("VietGame: Bo quan ly hinh anh khong hop le.");
    }
    this.image = imageManager;
    this.animations = new Map();
    this.destroyed = false;
  }

  create(name, frames, fps = 8, loop = true) {
    this.ensureAlive();
    if (typeof name !== "string" || !name.trim()) {
      throw new Error("VietGame: Ten animation khong hop le.");
    }
    if (!Array.isArray(frames) || frames.length === 0 ||
        !frames.every(frame => typeof frame === "string" && frame.trim())) {
      throw new Error("VietGame: Frames phai la mang ten hinh anh.");
    }
    if (!Number.isFinite(fps) || fps <= 0 || fps > 240) {
      throw new Error("VietGame: FPS phai lon hon 0 va khong qua 240.");
    }
    if (typeof loop !== "boolean") {
      throw new Error("VietGame: Che do lap phai la logic.");
    }
    if (this.animations.has(name)) {
      throw new Error(`VietGame: Animation '${name}' da ton tai.`);
    }

    this.animations.set(name, {
      frames: [...frames],
      fps,
      frameDuration: 1 / fps,
      loop,
      index: 0,
      elapsed: 0,
      playing: false,
      paused: false,
      finished: false
    });
    return name;
  }

  get(name) {
    this.ensureAlive();
    const animation = this.animations.get(name);
    if (!animation) throw new Error(`VietGame: Khong tim thay animation '${name}'.`);
    return animation;
  }

  play(name) {
    const a = this.get(name);
    if (a.finished) {
      a.index = 0;
      a.elapsed = 0;
      a.finished = false;
    }
    a.playing = true;
    a.paused = false;
    return name;
  }

  pause(name) {
    const a = this.get(name);
    if (a.playing) {
      a.playing = false;
      a.paused = true;
    }
    return name;
  }

  resume(name) {
    const a = this.get(name);
    if (a.paused && !a.finished) {
      a.playing = true;
      a.paused = false;
    } else if (!a.finished && !a.playing) {
      a.playing = true;
    }
    return name;
  }

  stop(name) {
    const a = this.get(name);
    a.index = 0;
    a.elapsed = 0;
    a.playing = false;
    a.paused = false;
    a.finished = false;
    return name;
  }

  setFPS(name, fps) {
    if (!Number.isFinite(fps) || fps <= 0 || fps > 240) {
      throw new Error("VietGame: FPS phai lon hon 0 va khong qua 240.");
    }
    const a = this.get(name);
    a.fps = fps;
    a.frameDuration = 1 / fps;
    a.elapsed = Math.min(a.elapsed, a.frameDuration);
    return fps;
  }

  setLoop(name, loop) {
    if (typeof loop !== "boolean") {
      throw new Error("VietGame: Che do lap phai la logic.");
    }
    const a = this.get(name);
    a.loop = loop;
    return loop;
  }

  update(deltaTime) {
    this.ensureAlive();
    if (!Number.isFinite(deltaTime) || deltaTime < 0) {
      throw new Error("VietGame: deltaTime khong hop le.");
    }

    for (const a of this.animations.values()) {
      if (!a.playing || a.paused || a.finished) continue;
      a.elapsed += deltaTime;

      // Gioi han so buoc moi lan cap nhat de tranh vong lap qua lon.
      let steps = 0;
      while (a.elapsed >= a.frameDuration && steps < 1000) {
        a.elapsed -= a.frameDuration;
        a.index++;
        steps++;

        if (a.index >= a.frames.length) {
          if (a.loop) {
            a.index = 0;
          } else {
            a.index = a.frames.length - 1;
            a.elapsed = 0;
            a.playing = false;
            a.finished = true;
            break;
          }
        }
      }
    }
  }

  draw(name, ctx, x, y, width, height) {
    const a = this.get(name);
    if (!ctx || ![x, y, width, height].every(Number.isFinite) ||
        width <= 0 || height <= 0) {
      throw new Error("VietGame: Thong so ve animation khong hop le.");
    }
    const frame = a.frames[a.index];
    return this.image.veHinhAnhCoKichThuoc(ctx, frame, x, y, width, height);
  }

  isFinished(name) {
    return this.get(name).finished;
  }

  getFrame(name) {
    const a = this.get(name);
    return a.index;
  }

  remove(name) {
    this.ensureAlive();
    return this.animations.delete(name);
  }

  ensureAlive() {
    if (this.destroyed) throw new Error("VietGame: Animation da bi huy.");
  }

  destroy() {
    if (this.destroyed) return;
    this.animations.clear();
    this.destroyed = true;
  }
}
