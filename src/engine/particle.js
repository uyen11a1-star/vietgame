export class VietGameParticle {
  constructor(options = {}) {
    this.emitters = new Map();
    this.random = options.random ?? Math.random;
  }

  create(name, x, y, count, speed, color, size, lifetime, gravity, loop) {
    if (typeof name !== "string" || !name) {
      throw new Error("Ten he hat khong hop le.");
    }
    if (this.emitters.has(name)) {
      throw new Error(`He hat '${name}' da ton tai.`);
    }

    const numbers = [x, y, count, speed, size, lifetime, gravity];
    if (!numbers.every(Number.isFinite)) {
      throw new Error("Thong so he hat phai la so hop le.");
    }
    if (count < 1 || count > 10000 || !Number.isInteger(count)) {
      throw new Error("So luong hat phai tu 1 den 10000.");
    }
    if (speed < 0 || size <= 0 || lifetime <= 0) {
      throw new Error("Toc do, kich thuoc hoac thoi gian song khong hop le.");
    }
    if (typeof color !== "string" || typeof loop !== "boolean") {
      throw new Error("Mau sac hoac che do lap khong hop le.");
    }

    this.emitters.set(name, {
      name, x, y, count, speed, color, size, lifetime, gravity, loop,
      particles: [],
      playing: false,
      finished: false
    });
    return name;
  }

  spawn(emitter) {
    const angle = this.random() * Math.PI * 2;
    const velocity = this.random() * emitter.speed;
    emitter.particles.push({
      x: emitter.x,
      y: emitter.y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      age: 0
    });
  }

  play(name) {
    const emitter = this.get(name);
    emitter.particles = [];
    emitter.playing = true;
    emitter.finished = false;

    for (let i = 0; i < emitter.count; i++) {
      this.spawn(emitter);
    }
    return true;
  }

  stop(name) {
    const emitter = this.get(name);
    emitter.playing = false;
    emitter.finished = true;
    emitter.particles = [];
    return true;
  }

  update(deltaTime) {
    if (!Number.isFinite(deltaTime) || deltaTime < 0) return;

    for (const emitter of this.emitters.values()) {
      if (!emitter.playing) continue;

      const alive = [];
      let expiredCount = 0;

      for (const particle of emitter.particles) {
        particle.age += deltaTime;

        if (particle.age >= emitter.lifetime) {
          if (emitter.loop) expiredCount++;
          continue;
        }

        particle.vy += emitter.gravity * deltaTime;
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        alive.push(particle);
      }

      emitter.particles = alive;

      // Tao hat moi sau khi ket thuc vong lap, tranh lap vo han.
      if (emitter.loop) {
        for (let i = 0; i < expiredCount; i++) {
          this.spawn(emitter);
        }
      }

      if (!emitter.loop && alive.length === 0) {
        emitter.playing = false;
        emitter.finished = true;
      }
    }
  }

  draw(name, ctx) {
    const emitter = this.get(name);
    if (!ctx) return false;

    for (const particle of emitter.particles) {
      const alpha = Math.max(
        0,
        1 - particle.age / emitter.lifetime
      );

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = emitter.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, emitter.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    return true;
  }

  setPosition(name, x, y) {
    const emitter = this.get(name);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error("Vi tri he hat khong hop le.");
    }
    emitter.x = x;
    emitter.y = y;
    return true;
  }

  setColor(name, color) {
    const emitter = this.get(name);
    if (typeof color !== "string") {
      throw new Error("Mau sac khong hop le.");
    }
    emitter.color = color;
    return true;
  }

  setSpeed(name, speed) {
    const emitter = this.get(name);
    if (!Number.isFinite(speed) || speed < 0) {
      throw new Error("Toc do khong hop le.");
    }
    emitter.speed = speed;
    return true;
  }

  isFinished(name) {
    return this.get(name).finished;
  }

  count(name) {
    return this.get(name).particles.length;
  }

  get(name) {
    const emitter = this.emitters.get(name);
    if (!emitter) throw new Error(`Khong tim thay he hat '${name}'.`);
    return emitter;
  }

  remove(name) {
    return this.emitters.delete(name);
  }

  destroy() {
    this.emitters.clear();
  }
}
