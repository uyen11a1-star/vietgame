import test from "node:test";
import assert from "node:assert/strict";
import { VietGameAnimation } from "../src/engine/animation.js";

function makeAnimation() {
  const drawn = [];
  const image = {
    hinhAnhDaTai: () => true,
    veHinhAnh: () => true,
    veHinhAnhCoKichThuoc: (ctx, frame, x, y, w, h) => {
      drawn.push({ frame, x, y, w, h });
      return true;
    }
  };
  return { manager: new VietGameAnimation(image), drawn };
}

test("tao animation va phat frame dau tien", () => {
  const { manager, drawn } = makeAnimation();
  manager.create("chay", ["f1", "f2", "f3"], 10, true);
  manager.play("chay");
  assert.equal(manager.getFrame("chay"), 0);
  assert.equal(manager.draw("chay", {}, 1, 2, 30, 40), true);
  assert.equal(drawn[0].frame, "f1");
});

test("animation tu chuyen frame theo deltaTime", () => {
  const { manager } = makeAnimation();
  manager.create("test", ["a", "b", "c"], 10, true);
  manager.play("test");
  manager.update(0.11);
  assert.equal(manager.getFrame("test"), 1);
  manager.update(0.1);
  assert.equal(manager.getFrame("test"), 2);
});

test("animation lap lai khi den frame cuoi", () => {
  const { manager } = makeAnimation();
  manager.create("lap", ["a", "b"], 10, true);
  manager.play("lap");
  manager.update(0.21);
  assert.equal(manager.getFrame("lap"), 0);
  assert.equal(manager.isFinished("lap"), false);
});

test("animation khong lap se ket thuc", () => {
  const { manager } = makeAnimation();
  manager.create("mot-lan", ["a", "b"], 10, false);
  manager.play("mot-lan");
  manager.update(0.21);
  assert.equal(manager.getFrame("mot-lan"), 1);
  assert.equal(manager.isFinished("mot-lan"), true);
});

test("tam dung va tiep tuc animation", () => {
  const { manager } = makeAnimation();
  manager.create("pause", ["a", "b", "c"], 10, true);
  manager.play("pause");
  manager.update(0.05);
  manager.pause("pause");
  manager.update(0.2);
  assert.equal(manager.getFrame("pause"), 0);
  manager.resume("pause");
  manager.update(0.06);
  assert.equal(manager.getFrame("pause"), 1);
});

test("dung animation dua frame ve dau", () => {
  const { manager } = makeAnimation();
  manager.create("stop", ["a", "b"], 10, true);
  manager.play("stop");
  manager.update(0.11);
  manager.stop("stop");
  assert.equal(manager.getFrame("stop"), 0);
  assert.equal(manager.isFinished("stop"), false);
});

test("thay doi FPS va che do lap", () => {
  const { manager } = makeAnimation();
  manager.create("settings", ["a", "b"], 5, true);
  manager.setFPS("settings", 20);
  manager.setLoop("settings", false);
  assert.equal(manager.get("settings").fps, 20);
  assert.equal(manager.get("settings").loop, false);
});

test("kiem tra du lieu dau vao khong hop le", () => {
  const { manager } = makeAnimation();
  assert.throws(() => manager.create("", ["a"], 10, true));
  assert.throws(() => manager.create("bad", [], 10, true));
  assert.throws(() => manager.create("bad2", ["a"], 0, true));
  assert.throws(() => manager.create("bad3", ["a"], 10, "true"));
  assert.throws(() => manager.update(-1));
  assert.throws(() => manager.setFPS("missing", 20));
});

test("xoa animation va huy manager", () => {
  const { manager } = makeAnimation();
  manager.create("remove", ["a"], 10, true);
  assert.equal(manager.remove("remove"), true);
  assert.equal(manager.remove("remove"), false);
  manager.destroy();
  assert.throws(() => manager.create("after", ["a"], 10, true));
});
