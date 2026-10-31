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


test("tao nhan vat voi toa do va kich thuoc", () => {
  const game = new VietGame2D(createCanvas());
  const character = game.createCharacter(10, 20, 30, 40, "#ff0000");

  assert.equal(character.x, 10);
  assert.equal(character.y, 20);
  assert.equal(character.width, 30);
  assert.equal(character.height, 40);
  assert.equal(character.color, "#ff0000");
});

test("di chuyen nhan vat va gioi han trong Canvas", () => {
  const game = new VietGame2D(createCanvas());
  const character = game.createCharacter(10, 20, 30, 40);

  game.moveCharacter(character, 15, 25);
  assert.equal(character.x, 25);
  assert.equal(character.y, 45);

  game.moveCharacter(character, 1000, 1000);
  assert.equal(character.x, 770);
  assert.equal(character.y, 560);

  game.moveCharacter(character, -1000, -1000);
  assert.equal(character.x, 0);
  assert.equal(character.y, 0);
});

test("ve nhan vat len Canvas", () => {
  const canvas = createCanvas();
  const game = new VietGame2D(canvas);
  const character = game.createCharacter(5, 6, 20, 30, "#00ff00");

  game.drawCharacter(character);

  assert.ok(canvas.calls.some(call =>
    call[0] === "fillRect" &&
    call[1] === 5 &&
    call[2] === 6 &&
    call[3] === 20 &&
    call[4] === 30
  ));
});

test("khong cho phep kich thuoc nhan vat khong hop le", () => {
  const game = new VietGame2D(createCanvas());
  assert.throws(
    () => game.createCharacter(0, 0, -10, 20),
    /khong hop le/
  );
});
