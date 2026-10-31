import test from "node:test";
import assert from "node:assert/strict";
import { VietGameImage } from "../src/engine/image.js";

function createImageSystem() {
  const created = [];

  const manager = new VietGameImage({
    imageFactory() {
      const image = {
        src: "",
        onload: null,
        onerror: null
      };

      created.push(image);
      return image;
    }
  });

  return { manager, created };
}

test("dang ky hinh anh", () => {
  const { manager, created } = createImageSystem();

  manager.dangKyHinhAnh("player", "player.png");

  assert.equal(created.length, 1);
  assert.equal(created[0].src, "player.png");
  manager.destroy();
});

test("hinh anh chua tai xong tra ve false", () => {
  const { manager } = createImageSystem();

  manager.dangKyHinhAnh("player", "player.png");

  assert.equal(manager.hinhAnhDaTai("player"), false);
  manager.destroy();
});

test("hinh anh tai thanh cong", () => {
  const { manager, created } = createImageSystem();

  manager.dangKyHinhAnh("player", "player.png");
  created[0].onload();

  assert.equal(manager.hinhAnhDaTai("player"), true);
  manager.destroy();
});

test("hinh anh tai that bai", () => {
  const { manager, created } = createImageSystem();

  manager.dangKyHinhAnh("player", "missing.png");
  created[0].onerror();

  assert.equal(manager.hinhAnhDaTai("player"), false);
  manager.destroy();
});

test("dung chung cache khi dang ky cung duong dan", () => {
  const { manager, created } = createImageSystem();

  manager.dangKyHinhAnh("player", "same.png");
  manager.dangKyHinhAnh("enemy", "same.png");

  assert.equal(created.length, 1);
  assert.equal(manager.images.get("player"), manager.images.get("enemy"));
  manager.destroy();
});

test("ve hinh anh khi da tai", () => {
  const { manager, created } = createImageSystem();
  const calls = [];

  const ctx = {
    drawImage(...args) {
      calls.push(args);
    }
  };

  manager.dangKyHinhAnh("player", "player.png");
  created[0].onload();

  assert.equal(manager.veHinhAnh(ctx, "player", 10, 20), true);
  assert.deepEqual(calls[0], [created[0], 10, 20]);
  manager.destroy();
});

test("khong ve hinh anh khi chua tai", () => {
  const { manager } = createImageSystem();
  let count = 0;

  manager.dangKyHinhAnh("player", "player.png");

  const ctx = {
    drawImage() {
      count++;
    }
  };

  assert.equal(manager.veHinhAnh(ctx, "player", 0, 0), false);
  assert.equal(count, 0);
  manager.destroy();
});

test("ve hinh anh voi kich thuoc tuy chinh", () => {
  const { manager, created } = createImageSystem();
  const calls = [];

  const ctx = {
    drawImage(...args) {
      calls.push(args);
    }
  };

  manager.dangKyHinhAnh("player", "player.png");
  created[0].onload();

  assert.equal(
    manager.veHinhAnhCoKichThuoc(ctx, "player", 10, 20, 100, 80),
    true
  );

  assert.deepEqual(calls[0], [created[0], 10, 20, 100, 80]);
  manager.destroy();
});

test("destroy giai phong tai nguyen hinh anh", () => {
  const { manager, created } = createImageSystem();

  manager.dangKyHinhAnh("player", "player.png");
  manager.destroy();

  assert.equal(manager.images.size, 0);
  assert.equal(manager.cache.size, 0);
  assert.equal(created[0].onload, null);
  assert.equal(created[0].onerror, null);
});

test("tu choi ten va duong dan rong", () => {
  const { manager } = createImageSystem();

  assert.throws(() => manager.dangKyHinhAnh("", "player.png"));
  assert.throws(() => manager.dangKyHinhAnh("player", " "));

  manager.destroy();
});
