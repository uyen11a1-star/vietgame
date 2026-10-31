import test from "node:test";
import assert from "node:assert/strict";
import { runVietGame } from "../src/browser.js";

function createCanvas() {
  const calls = [];
  const ctx = {
    fillStyle: "",
    font: "",
    fillRect(...args) { calls.push(["fillRect", ...args]); },
    beginPath() { calls.push(["beginPath"]); },
    arc(...args) { calls.push(["arc", ...args]); },
    fill() { calls.push(["fill"]); },
    fillText(...args) { calls.push(["fillText", ...args]); }
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

test("chay VietGame va ve len Canvas", () => {
  const canvas = createCanvas();
  const source = `
trochoi "Demo VietGame"
xoaManHinh("#101020")
veChuNhat(50, 50, 120, 80, "#ffcc00")
veHinhTron(250, 100, 40, "#00ccff")
veChu("Xin chao VietGame!", 50, 200, 28, "#ffffff")
`;

  const result = runVietGame(source, canvas);

  assert.equal(result.title, "Demo VietGame");
  assert.equal(canvas.width, 800);
  assert.equal(canvas.height, 600);
  assert.ok(canvas.calls.some(x => x[0] === "fillRect" && x[1] === 50));
  assert.ok(canvas.calls.some(x => x[0] === "arc"));
  assert.ok(canvas.calls.some(x => x[0] === "fillText"));
});

test("bao loi neu ham ve sai so doi so", () => {
  assert.throws(
    () => runVietGame("veChuNhat(10, 20, 30)", createCanvas()),
    /VG3014/
  );
});
