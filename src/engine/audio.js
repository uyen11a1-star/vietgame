export class VietGameAudio {
  constructor(options = {}) {
    this.audioFactory = options.audioFactory ?? (src => {
      if (typeof globalThis.Audio !== "function") {
        throw new Error("VietGame: Trinh duyet khong ho tro Audio.");
      }
      return new globalThis.Audio(src);
    });

    this.volume = 1;
    this.music = null;
    this.sounds = new Set();
    this.paused = false;
    this.destroyed = false;
  }

  createAudio(src, loop = false) {
    if (this.destroyed) {
      throw new Error("VietGame: Audio da bi huy.");
    }
    if (typeof src !== "string" || src.trim() === "") {
      throw new Error("VietGame: Duong dan am thanh khong hop le.");
    }

    const audio = this.audioFactory(src);
    if (!audio || typeof audio.play !== "function" ||
        typeof audio.pause !== "function") {
      throw new Error("VietGame: Audio factory tra ve doi tuong khong hop le.");
    }

    audio.loop = loop;
    audio.volume = this.volume;
    return audio;
  }

  playSafely(audio) {
    try {
      const result = audio.play();
      if (result && typeof result.catch === "function") {
        result.catch(() => {});
      }
    } catch {}
    return audio;
  }

  playSound(src) {
    const audio = this.createAudio(src, false);
    this.sounds.add(audio);

    audio.onended = () => this.sounds.delete(audio);
    return this.playSafely(audio);
  }

  playMusic(src) {
    this.stopMusic();

    const audio = this.createAudio(src, true);
    this.music = audio;

    if (this.paused) audio.pause();
    else this.playSafely(audio);

    return audio;
  }

  stopMusic() {
    if (!this.music) return;

    this.music.pause();
    try {
      this.music.currentTime = 0;
    } catch {}
    this.music = null;
  }

  pause() {
    this.paused = true;
    this.music?.pause();

    for (const sound of this.sounds) {
      sound.pause();
    }
  }

  resume() {
    if (this.destroyed) {
      throw new Error("VietGame: Audio da bi huy.");
    }

    this.paused = false;

    if (this.music) this.playSafely(this.music);

    for (const sound of this.sounds) {
      this.playSafely(sound);
    }
  }

  stop() {
    this.stopMusic();

    for (const sound of this.sounds) {
      sound.pause();
      try {
        sound.currentTime = 0;
      } catch {}
    }

    this.sounds.clear();
    this.paused = false;
  }

  setVolume(value) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error("VietGame: Am luong phai nam trong khoang tu 0 den 1.");
    }

    this.volume = value;

    if (this.music) this.music.volume = value;
    for (const sound of this.sounds) sound.volume = value;

    return this.volume;
  }

  destroy() {
    if (this.destroyed) return;
    this.stop();
    this.destroyed = true;
  }
}
