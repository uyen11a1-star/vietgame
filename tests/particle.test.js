import test from "node:test";
import assert from "node:assert/strict";
import { VietGameParticle } from "../src/engine/particle.js";

function createManager(random = () => 0.5) {
  return new VietGameParticle({ random });
}

function createEmitter(manager, loop = false) {
  return manager.create("lua", 10, 20, 5, 100, "#ffcc00", 3, 1, 0, loop);
}

test("tao he hat va luu cau hinh", () => {
  const manager = createManager();
  assert.equal(createEmitter(manager), "lua");
  assert.equal(manager.get("lua").count, 5);
});

test("khong cho phep ten trung lap", () => {
  const manager = createManager();
  createEmitter(manager);
  assert.throws(() => createEmitter(manager), /da ton tai/);
});

test("phat he hat tao dung so luong hat", () => {
  const manager = createManager();
  createEmitter(manager);
  assert.equal(manager.play("lua"), true);
  assert.equal(manager.count("lua"), 5);
});

test("dung he hat xoa cac hat dang ton tai", () => {
  const manager = createManager();
  createEmitter(manager);
  manager.play("lua");
  manager.stop("lua");
  assert.equal(manager.count("lua"), 0);
  assert.equal(manager.isFinished("lua"), true);
});

test("he hat khong lap ket thuc sau khi het thoi gian song", () => {
  const manager = createManager();
  createEmitter(manager);
  manager.play("lua");
  manager.update(1.1);
  assert.equal(manager.isFinished("lua"), true);
  assert.equal(manager.count("lua"), 0);
});

test("he hat lap tu tao hat moi", () => {
  const manager = createManager();
  createEmitter(manager, true);
  manager.play("lua");
  manager.update(1.1);
  assert.equal(manager.count("lua"), 5);
  assert.equal(manager.isFinished("lua"), false);
});

test("cap nhat vi tri hat theo thoi gian", () => {
  const manager = createManager(() => 0.5);
  createEmitter(manager);
  manager.play("lua");
  manager.update(0.1);
  assert.ok(manager.get("lua").particles[0].x !== 10);
});

test("thay doi vi tri mau va toc do", () => {
  const manager = createManager();
  createEmitter(manager);
  manager.setPosition("lua", 30, 40);
  manager.setColor("lua", "#ffffff");
  manager.setSpeed("lua", 50);
  const emitter = manager.get("lua");
  assert.equal(emitter.x, 30);
  assert.equal(emitter.y, 40);
  assert.equal(emitter.color, "#ffffff");
  assert.equal(emitter.speed, 50);
});

test("ve hat len canvas", () => {
  const manager = createManager();
  createEmitter(manager);
  manager.play("lua");

  const calls = [];
  const ctx = {
    save() { calls.push("save"); },
    restore() { calls.push("restore"); },
    beginPath() { calls.push("beginPath"); },
    arc() { calls.push("arc"); },
    fill() { calls.push("fill"); },
    set globalAlpha(value) {},
    set fillStyle(value) {}
  };

  assert.equal(manager.draw("lua", ctx), true);
  assert.equal(calls.filter(x => x === "fill").length, 5);
});

test("xoa he hat va huy manager", () => {
  const manager = createManager();
  createEmitter(manager);
  assert.equal(manager.remove("lua"), true);
  assert.equal(manager.emitters.size, 0);
  createEmitter(manager);
  manager.destroy();
  assert.equal(manager.emitters.size, 0);
});
