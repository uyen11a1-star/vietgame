import test from "node:test";
import assert from "node:assert/strict";
import { VietGame2D } from "../src/engine/game2d.js";

function createCanvas() {
  const calls = [];

  const ctx = {
    fillStyle: "",
    font: "",
    fillRect(...args) {
      calls.push(["fillRect", ...args, this.fillStyle]);
    },
    beginPath() {
      calls.push(["beginPath"]);
    },
    arc(...args) {
      calls.push(["arc", ...args]);
    },
    fill() {
      calls.push(["fill", this.fillStyle]);
    },
    fillText(...args) {
      calls.push(["fillText", ...args, this.fillStyle, this.font]);
    }
  };

  return {
    width: 0,
    height: 0,
    calls,
    getContext(type) {
      return type === "2d" ? ctx : null;
    }
  };
}

test("tao Canvas voi kich thuoc tuy chinh", () => {
  const canvas = createCanvas();
  new VietGame2D(canvas, { width: 1280, height: 720 });

  assert.equal(canvas.width, 1280);
  assert.equal(canvas.height, 720);
});

test("ve hinh chu nhat", () => {
  const canvas = createCanvas();
  const game = new VietGame2D(canvas);

  game.rect(10, 20, 100, 50, "#ff0000");

  assert.ok(canvas.calls.some(call =>
    call[0] === "fillRect" &&
    call[1] === 10 &&
    call[2] === 20
  ));
});

test("ve hinh tron", () => {
  const canvas = createCanvas();
  const game = new VietGame2D(canvas);

  game.circle(50, 60, 20);

  assert.ok(canvas.calls.some(call => call[0] === "arc"));
});

test("hien thi van ban", () => {
  const canvas = createCanvas();
  const game = new VietGame2D(canvas);

  game.text("VietGame", 10, 30);

  assert.ok(canvas.calls.some(call =>
    call[0] === "fillText" && call[1] === "VietGame"
  ));
});

test("xoa man hinh", () => {
  const canvas = createCanvas();
  const game = new VietGame2D(canvas);

  game.clear("#000000");

  assert.ok(canvas.calls.some(call =>
    call[0] === "fillRect" &&
    call[1] === 0 &&
    call[2] === 0
  ));
});

test("tu choi Canvas khong hop le", () => {
  assert.throws(
    () => new VietGame2D(null),
    /Canvas khong hop le/
  );
});
