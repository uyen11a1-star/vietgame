import test from "node:test";
import assert from "node:assert/strict";
import { VietGame2D } from "../src/engine/game2d.js";
import { tokenize } from "../src/lexer.js";
import { parse } from "../src/parser.js";
import { analyze } from "../src/semantic.js";
import { Interpreter } from "../src/interpreter.js";

function createTarget() {
  const listeners = new Map();
  return {
    style: {},
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener(type, callback) {
      listeners.get(type)?.delete(callback);
    },
    dispatch(type, event = {}) {
      for (const callback of [...(listeners.get(type) ?? [])]) callback(event);
    },
    count(type) {
      return listeners.get(type)?.size ?? 0;
    },
    setPointerCapture() {}
  };
}

function createCanvas() {
  const context = {
    fillStyle: "", font: "", lineWidth: 1, globalAlpha: 1,
    fillRect() {}, clearRect() {}, fillText() {}, beginPath() {}, arc() {},
    fill() {}, stroke() {}, moveTo() {}, lineTo() {}, closePath() {},
    ellipse() {}, strokeRect() {}, setLineDash() {}, translate() {},
    rotate() {}, scale() {}, save() {}, restore() {}
  };
  return {
    width: 0,
    height: 0,
    style: {},
    getContext(type) { return type === "2d" ? context : null; },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 800, height: 600 };
    }
  };
}

test("su kien phim loc dung phim va gui du lieu su kien", () => {
  const keyboard = createTarget();
  const game = new VietGame2D(createCanvas(), { keyboardTarget: keyboard });
  const received = [];
  game.khiNhanPhim("Space", event => received.push(event));
  game.khiThaPhim("Space", event => received.push(event));

  keyboard.dispatch("keydown", { key: "Enter" });
  keyboard.dispatch("keydown", { key: "Space", repeat: true });
  keyboard.dispatch("keyup", { key: "Space" });

  assert.equal(received.length, 2);
  assert.deepEqual(received[0], {
    loai: "nhanPhim", phim: "Space", lapLai: true
  });
  assert.deepEqual(received[1], { loai: "thaPhim", phim: "Space" });
  assert.equal(game.isKeyDown("Space"), false);
  game.destroy();
});

test("su kien phim ho tro callback khong co tham so", () => {
  const keyboard = createTarget();
  const game = new VietGame2D(createCanvas(), { keyboardTarget: keyboard });
  let calls = 0;
  game.khiNhanPhim("a", () => calls++);
  keyboard.dispatch("keydown", { key: "a" });
  assert.equal(calls, 1);
  game.destroy();
});

test("su kien chuot nhan, tha va di chuyen kem toa do", () => {
  const mouse = createTarget();
  const game = new VietGame2D(createCanvas(), { mouseTarget: mouse });
  const received = [];
  game.khiNhanChuot("trai", event => received.push(event));
  game.khiThaChuot("trai", event => received.push(event));
  game.khiDiChuyenChuot(event => received.push(event));

  mouse.dispatch("mousedown", { button: 0, clientX: 12, clientY: 34 });
  mouse.dispatch("mousemove", { clientX: 50, clientY: 60 });
  mouse.dispatch("mouseup", { button: 0, clientX: 70, clientY: 80 });

  assert.deepEqual(received.map(event => event.loai), [
    "nhanChuot", "diChuyenChuot", "thaChuot"
  ]);
  assert.deepEqual(
    { x: received[0].x, y: received[0].y, nut: received[0].nut },
    { x: 12, y: 34, nut: 0 }
  );
  assert.deepEqual(
    { x: received[1].x, y: received[1].y },
    { x: 50, y: 60 }
  );
  assert.equal(game.isMouseDown("trai"), false);
  game.destroy();
});

test("su kien chuot ho tro loc nut giua va phai", () => {
  const mouse = createTarget();
  const game = new VietGame2D(createCanvas(), { mouseTarget: mouse });
  let middle = 0;
  let right = 0;
  game.khiNhanChuot("giua", () => middle++);
  game.khiNhanChuot("phai", () => right++);
  mouse.dispatch("mousedown", { button: 0 });
  mouse.dispatch("mousedown", { button: 1 });
  mouse.dispatch("mousedown", { button: 2 });
  assert.equal(middle, 1);
  assert.equal(right, 1);
  game.destroy();
});

test("su kien cam ung nhan, keo va ket thuc", () => {
  const touch = createTarget();
  const game = new VietGame2D(createCanvas(), { touchTarget: touch });
  const received = [];
  game.khiBatDauCham(event => received.push(event));
  game.khiDiChuyenCham(event => received.push(event));
  game.khiKetThucCham(event => received.push(event));

  touch.dispatch("pointerdown", {
    pointerId: 7, pointerType: "touch", clientX: 10, clientY: 20
  });
  touch.dispatch("pointermove", {
    pointerId: 7, pointerType: "touch", clientX: 30, clientY: 40
  });
  touch.dispatch("pointerup", {
    pointerId: 7, pointerType: "touch", clientX: 50, clientY: 60
  });

  assert.deepEqual(received.map(event => event.loai), [
    "batDauCham", "diChuyenCham", "ketThucCham"
  ]);
  assert.deepEqual(
    { x: received[1].x, y: received[1].y, id: received[1].id },
    { x: 30, y: 40, id: 7 }
  );
  assert.equal(received[0].soNgonTay, 1);
  assert.equal(received[2].soNgonTay, 0);
  assert.equal(game.getTouchCount(), 0);
  game.destroy();
});

test("huySuKien ngan callback va chi huy dung ma dang ky", () => {
  const keyboard = createTarget();
  const game = new VietGame2D(createCanvas(), { keyboardTarget: keyboard });
  let calls = 0;
  const id = game.khiNhanPhim("x", () => calls++);
  assert.equal(game.huySuKien(id + 100), false);
  assert.equal(game.huySuKien(id), true);
  assert.equal(game.huySuKien(id), false);
  keyboard.dispatch("keydown", { key: "x" });
  assert.equal(calls, 0);
  game.destroy();
});

test("callback co the tu huy chinh su kien dang chay", () => {
  const keyboard = createTarget();
  const game = new VietGame2D(createCanvas(), { keyboardTarget: keyboard });
  let calls = 0;
  let id;
  id = game.khiNhanPhim("x", () => {
    calls++;
    game.huySuKien(id);
  });
  keyboard.dispatch("keydown", { key: "x" });
  keyboard.dispatch("keyup", { key: "x" });
  keyboard.dispatch("keydown", { key: "x" });
  assert.equal(calls, 1);
  game.destroy();
});

test("tu choi callback, phim va nut chuot khong hop le", () => {
  const game = new VietGame2D(createCanvas());
  assert.throws(() => game.khiNhanPhim("", () => {}), /Ten phim/);
  assert.throws(() => game.khiNhanPhim("a", null), /Callback/);
  assert.throws(() => game.khiNhanChuot("tren", () => {}), /Nut chuot/);
  assert.throws(() => game.khiNhanPhim("a", (a, b) => {}), /toi da 1 doi so/);
  game.destroy();
  assert.throws(() => game.khiDiChuyenChuot(() => {}), /Game da bi huy/);
});

test("huy game xoa toan bo callback su kien", () => {
  const keyboard = createTarget();
  const game = new VietGame2D(createCanvas(), { keyboardTarget: keyboard });
  let calls = 0;
  game.khiNhanPhim("x", () => calls++);
  assert.equal(game.eventHandlers.size, 1);
  game.destroy();
  keyboard.dispatch("keydown", { key: "x" });
  assert.equal(game.eventHandlers.size, 0);
  assert.equal(calls, 0);
});

test("semantic va interpreter ho tro callback VietGame voi doi tuong su kien", () => {
  const source = [
    "ham xuLyPhim(suKien):",
    "    in(suKien.phim)",
    "khiNhanPhim(\"Space\", xuLyPhim)"
  ].join("\\n").replaceAll("\\n", "\n");
  const program = parse(tokenize(source));
  const result = analyze(program);
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));

  const keyboard = createTarget();
  const game = new VietGame2D(createCanvas(), { keyboardTarget: keyboard });
  const interpreter = new Interpreter({ game });
  interpreter.interpret(program);
  keyboard.dispatch("keydown", { key: "Space" });
  assert.deepEqual(interpreter.output, ["Space"]);
  game.destroy();
});

test("semantic va interpreter ho tro callback khong tham so va huySuKien", () => {
  const source = [
    "ham xuLy():",
    "    in(\"Da nhan phim\")",
    "bien ma = khiNhanPhim(\"a\", xuLy)",
    "huySuKien(ma)"
  ].join("\n");
  const program = parse(tokenize(source));
  const result = analyze(program);
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));

  const keyboard = createTarget();
  const game = new VietGame2D(createCanvas(), { keyboardTarget: keyboard });
  const interpreter = new Interpreter({ game });
  interpreter.interpret(program);
  keyboard.dispatch("keydown", { key: "a" });
  assert.deepEqual(interpreter.output, []);
  game.destroy();
});

test("semantic tu choi gia tri khong phai ham lam callback", () => {
  const source = [
    "bien callback = \"khong phai ham\"",
    "khiNhanPhim(\"a\", callback)"
  ].join("\n");
  const result = analyze(parse(tokenize(source)));
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some(item => item.code === "VG3015"));
});
