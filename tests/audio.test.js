import test from "node:test";
import assert from "node:assert/strict";
import { VietGameAudio } from "../src/engine/audio.js";

function createFakeAudio(src) {
  return {
    src,
    loop: false,
    volume: 1,
    currentTime: 0,
    paused: false,
    playCount: 0,
    pauseCount: 0,
    play() {
      this.paused = false;
      this.playCount++;
      return Promise.resolve();
    },
    pause() {
      this.paused = true;
      this.pauseCount++;
    }
  };
}

function createAudioSystem() {
  const created = [];
  const audio = new VietGameAudio({
    audioFactory(src) {
      const item = createFakeAudio(src);
      created.push(item);
      return item;
    }
  });
  return { audio, created };
}

test("phat hieu ung am thanh", () => {
  const { audio, created } = createAudioSystem();
  const sound = audio.playSound("jump.wav");

  assert.equal(created.length, 1);
  assert.equal(sound.src, "jump.wav");
  assert.equal(sound.loop, false);
  assert.equal(sound.playCount, 1);
  audio.destroy();
});

test("phat nhac nen lap lai", () => {
  const { audio, created } = createAudioSystem();
  const music = audio.playMusic("theme.mp3");

  assert.equal(created.length, 1);
  assert.equal(music.loop, true);
  assert.equal(music.playCount, 1);
  audio.destroy();
});

test("phat nhac moi se dung nhac cu", () => {
  const { audio, created } = createAudioSystem();
  const first = audio.playMusic("first.mp3");
  const second = audio.playMusic("second.mp3");

  assert.equal(first.paused, true);
  assert.equal(second.loop, true);
  assert.equal(audio.music, second);
  audio.destroy();
});

test("tam dung va tiep tuc am thanh", () => {
  const { audio } = createAudioSystem();
  const music = audio.playMusic("theme.mp3");
  const sound = audio.playSound("click.wav");

  audio.pause();
  assert.equal(music.paused, true);
  assert.equal(sound.paused, true);

  audio.resume();
  assert.equal(music.paused, false);
  assert.equal(sound.paused, false);
  audio.destroy();
});

test("dung am thanh va dua thoi gian ve 0", () => {
  const { audio } = createAudioSystem();
  const music = audio.playMusic("theme.mp3");
  const sound = audio.playSound("click.wav");
  music.currentTime = 12;
  sound.currentTime = 3;

  audio.stop();

  assert.equal(music.paused, true);
  assert.equal(music.currentTime, 0);
  assert.equal(sound.paused, true);
  assert.equal(sound.currentTime, 0);
  assert.equal(audio.music, null);
  assert.equal(audio.sounds.size, 0);
  audio.destroy();
});

test("cap nhat am luong cho am thanh dang phat", () => {
  const { audio } = createAudioSystem();
  const music = audio.playMusic("theme.mp3");
  const sound = audio.playSound("click.wav");

  audio.setVolume(0.4);

  assert.equal(music.volume, 0.4);
  assert.equal(sound.volume, 0.4);
  assert.equal(audio.volume, 0.4);
  audio.destroy();
});

test("tu choi am luong ngoai khoang hop le", () => {
  const { audio } = createAudioSystem();

  assert.throws(() => audio.setVolume(-0.1), /Am luong/);
  assert.throws(() => audio.setVolume(1.1), /Am luong/);
  assert.throws(() => audio.setVolume(NaN), /Am luong/);
  audio.destroy();
});

test("tu choi duong dan am thanh rong", () => {
  const { audio } = createAudioSystem();
  assert.throws(() => audio.playSound(" "), /Duong dan/);
  audio.destroy();
});

test("destroy giai phong am thanh va chan phat moi", () => {
  const { audio } = createAudioSystem();
  audio.playMusic("theme.mp3");
  audio.destroy();

  assert.equal(audio.destroyed, true);
  assert.throws(() => audio.playSound("later.wav"), /da bi huy/);
});


test("dang ky va phat hieu ung am thanh theo ten", () => {
  const { audio, created } = createAudioSystem();
  audio.registerSound("click", "assets/click.mp3");

  const sound = audio.playSound("click");
  assert.equal(sound.src, "assets/click.mp3");
  assert.equal(created.length, 1);
  audio.destroy();
});

test("dang ky va phat nhac nen theo ten", () => {
  const { audio, created } = createAudioSystem();
  audio.registerMusic("menu", "assets/menu.mp3");

  const first = audio.playMusic("menu");
  const second = audio.playMusic("menu");

  assert.equal(first, second);
  assert.equal(created.length, 1);
  assert.equal(second.loop, true);
  assert.equal(second.playCount, 2);
  audio.destroy();
});

test("tu choi ten tai nguyen bi dang ky trung", () => {
  const { audio } = createAudioSystem();
  audio.registerSound("click", "assets/click.mp3");

  assert.throws(
    () => audio.registerSound("click", "assets/other.mp3"),
    /da duoc dang ky/
  );
  audio.destroy();
});

test("bao loi khi phat tai nguyen chua dang ky", () => {
  const { audio } = createAudioSystem();

  assert.throws(() => audio.playSound("click"), /chua duoc dang ky/);
  assert.throws(() => audio.playMusic("menu"), /chua duoc dang ky/);
  audio.destroy();
});

test("van ho tro phat am thanh bang duong dan cu", () => {
  const { audio, created } = createAudioSystem();

  const sound = audio.playSound("assets/old-click.mp3");
  const music = audio.playMusic("assets/old-menu.mp3");

  assert.equal(sound.src, "assets/old-click.mp3");
  assert.equal(music.src, "assets/old-menu.mp3");
  assert.equal(created.length, 2);
  audio.destroy();
});
