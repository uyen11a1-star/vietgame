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
    this.soundAssets = new Map();
    this.musicAssets = new Map();
    this.musicInstances = new Map();
    this.paused = false;
    this.destroyed = false;
  }

  validateAsset(name, src) {
    if (typeof name !== "string" || name.trim() === "") {
      throw new Error("VietGame: Ten tai nguyen am thanh khong hop le.");
    }
    if (typeof src !== "string" || src.trim() === "") {
      throw new Error("VietGame: Duong dan am thanh khong hop le.");
    }
  }

  registerSound(name, src) {
    this.validateAsset(name, src);
    if (this.destroyed) throw new Error("VietGame: Audio da bi huy.");
    if (this.soundAssets.has(name)) {
      throw new Error(`VietGame: Am thanh '${name}' da duoc dang ky.`);
    }
    this.soundAssets.set(name, src);
    return name;
  }

  registerMusic(name, src) {
    this.validateAsset(name, src);
    if (this.destroyed) throw new Error("VietGame: Audio da bi huy.");
    if (this.musicAssets.has(name)) {
      throw new Error(`VietGame: Nhac nen '${name}' da duoc dang ky.`);
    }
    this.musicAssets.set(name, src);
    return name;
  }

  resolveAsset(value, assets, label) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("VietGame: Duong dan am thanh khong hop le.");
    }

    if (assets.has(value)) return { name: value, src: assets.get(value) };

    // Tuong thich voi cach phat bang duong dan o cac phien ban cu.
    if (/[./\\]/.test(value) || /^https?:/i.test(value)) {
      return { name: null, src: value };
    }

    throw new Error(`VietGame: ${label} '${value}' chua duoc dang ky.`);
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

  playSound(value) {
    const asset = this.resolveAsset(value, this.soundAssets, "Am thanh");
    const audio = this.createAudio(asset.src, false);
    this.sounds.add(audio);

    audio.onended = () => this.sounds.delete(audio);
    return this.playSafely(audio);
  }

  playMusic(value) {
    const asset = this.resolveAsset(value, this.musicAssets, "Nhac nen");
    this.stopMusic();

    // Tai su dung cung mot Audio instance cho cung mot tai nguyen nhac nen.
    let audio = this.musicInstances.get(asset.src);
    if (!audio) {
      audio = this.createAudio(asset.src, true);
      this.musicInstances.set(asset.src, audio);
    }

    audio.loop = true;
    audio.volume = this.volume;
    try {
      audio.currentTime = 0;
    } catch {}

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

    for (const sound of this.sounds) sound.pause();
  }

  resume() {
    if (this.destroyed) {
      throw new Error("VietGame: Audio da bi huy.");
    }

    this.paused = false;
    if (this.music) this.playSafely(this.music);

    for (const sound of this.sounds) this.playSafely(sound);
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

    for (const music of this.musicInstances.values()) {
      music.volume = value;
    }

    return this.volume;
  }

  destroy() {
    if (this.destroyed) return;
    this.stop();

    for (const music of this.musicInstances.values()) {
      music.pause();
      try {
        music.currentTime = 0;
      } catch {}
    }

    this.musicInstances.clear();
    this.soundAssets.clear();
    this.musicAssets.clear();
    this.destroyed = true;
  }
}
