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


function createKeyboardTarget() {
  const listeners = new Map();

  return {
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener(type, callback) {
      listeners.get(type)?.delete(callback);
    },
    dispatch(type, event = {}) {
      for (const callback of listeners.get(type) ?? []) {
        callback(event);
      }
    }
  };
}

test("nhan dien phim duoc nhan va tha", () => {
  const target = createKeyboardTarget();
  const game = new VietGame2D(createCanvas(), {
    keyboardTarget: target
  });

  target.dispatch("keydown", { key: "ArrowRight" });
  assert.equal(game.isKeyDown("ArrowRight"), true);

  target.dispatch("keyup", { key: "ArrowRight" });
  assert.equal(game.isKeyDown("ArrowRight"), false);
});

test("nhan nhieu phim cung luc", () => {
  const target = createKeyboardTarget();
  const game = new VietGame2D(createCanvas(), {
    keyboardTarget: target
  });

  target.dispatch("keydown", { key: "ArrowUp" });
  target.dispatch("keydown", { key: "ArrowRight" });

  assert.equal(game.isKeyDown("ArrowUp"), true);
  assert.equal(game.isKeyDown("ArrowRight"), true);
});

test("xoa trang thai phim khi cua so mat tieu diem", () => {
  const target = createKeyboardTarget();
  const game = new VietGame2D(createCanvas(), {
    keyboardTarget: target
  });

  target.dispatch("keydown", { key: "a" });
  target.dispatch("blur");

  assert.equal(game.isKeyDown("a"), false);
});

test("destroy go bo su kien ban phim", () => {
  const target = createKeyboardTarget();
  const game = new VietGame2D(createCanvas(), {
    keyboardTarget: target
  });

  target.dispatch("keydown", { key: "d" });
  game.destroy();
  target.dispatch("keydown", { key: "d" });

  assert.equal(game.isKeyDown("d"), false);
});

test("tu choi doi tuong ban phim khong hop le", () => {
  assert.throws(
    () => new VietGame2D(createCanvas(), { keyboardTarget: {} }),
    /ban phim khong hop le/
  );
});


test("phat hien hai hinh chu nhat chong lan", () => {
  const game = new VietGame2D(createCanvas());
  assert.equal(game.collides(
    { x: 10, y: 10, width: 40, height: 40 },
    { x: 30, y: 30, width: 40, height: 40 }
  ), true);
});

test("khong phat hien va cham khi hai hinh cach xa", () => {
  const game = new VietGame2D(createCanvas());
  assert.equal(game.collides(
    { x: 0, y: 0, width: 20, height: 20 },
    { x: 50, y: 50, width: 20, height: 20 }
  ), false);
});

test("hai hinh chi cham canh khong tinh la va cham", () => {
  const game = new VietGame2D(createCanvas());
  assert.equal(game.collides(
    { x: 0, y: 0, width: 20, height: 20 },
    { x: 20, y: 0, width: 20, height: 20 }
  ), false);
});

test("phat hien hinh nam ben trong hinh kia", () => {
  const game = new VietGame2D(createCanvas());
  assert.equal(game.collides(
    { x: 0, y: 0, width: 100, height: 100 },
    { x: 25, y: 25, width: 10, height: 10 }
  ), true);
});

test("phat hien va cham giua hai nhan vat", () => {
  const game = new VietGame2D(createCanvas());
  const a = game.createCharacter(10, 10, 30, 30);
  const b = game.createCharacter(20, 20, 30, 30);
  assert.equal(game.collides(a, b), true);
});

test("tu choi hinh chu nhat khong hop le", () => {
  const game = new VietGame2D(createCanvas());
  assert.throws(() => game.collides(null, {}), /khong hop le/);
  assert.throws(() => game.collides(
    { x: 0, y: 0, width: -1, height: 10 },
    { x: 0, y: 0, width: 10, height: 10 }
  ), /khong hop le/);
});


function createFrameScheduler() {
  let nextId = 1;
  const callbacks = new Map();
  const cancelled = [];

  return {
    callbacks,
    cancelled,
    requestAnimationFrame(callback) {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      cancelled.push(id);
      callbacks.delete(id);
    },
    step(time) {
      const entry = callbacks.entries().next().value;
      if (!entry) throw new Error("Khong co khung hinh dang cho.");
      const [id, callback] = entry;
      callbacks.delete(id);
      callback(time);
    }
  };
}

test("game loop cap nhat va ve lien tuc", () => {
  const scheduler = createFrameScheduler();
  const game = new VietGame2D(createCanvas(), {
    requestAnimationFrame: scheduler.requestAnimationFrame.bind(scheduler),
    cancelAnimationFrame: scheduler.cancelAnimationFrame.bind(scheduler)
  });
  const updates = [];
  let renders = 0;

  game.start(dt => updates.push(dt), () => renders++);

  assert.equal(game.running, true);
  scheduler.step(1000);
  scheduler.step(1050);

  assert.deepEqual(updates, [0, 0.05]);
  assert.equal(renders, 2);
  assert.equal(scheduler.callbacks.size, 1);

  game.stop();
  assert.equal(game.running, false);
  assert.equal(scheduler.callbacks.size, 0);
});

test("game loop gioi han delta time toi da 0.1 giay", () => {
  const scheduler = createFrameScheduler();
  const game = new VietGame2D(createCanvas(), {
    requestAnimationFrame: scheduler.requestAnimationFrame.bind(scheduler),
    cancelAnimationFrame: scheduler.cancelAnimationFrame.bind(scheduler)
  });
  const updates = [];

  game.start(dt => updates.push(dt), () => {});
  scheduler.step(1000);
  scheduler.step(1500);

  assert.deepEqual(updates, [0, 0.1]);
  game.stop();
});

test("game loop tu dung khi callback gap loi", () => {
  const scheduler = createFrameScheduler();
  const game = new VietGame2D(createCanvas(), {
    requestAnimationFrame: scheduler.requestAnimationFrame.bind(scheduler),
    cancelAnimationFrame: scheduler.cancelAnimationFrame.bind(scheduler)
  });

  game.start(() => {
    throw new Error("Loi cap nhat");
  }, () => {});

  assert.throws(() => scheduler.step(1000), /Loi cap nhat/);
  assert.equal(game.running, false);
  assert.equal(scheduler.callbacks.size, 0);
});

test("game loop tu choi neu thieu ham callback", () => {
  const game = new VietGame2D(createCanvas());
  assert.throws(() => game.start(() => {}, null), /ham update va render/);
});

test("game loop tu choi khi khong co bo len lich", () => {
  const game = new VietGame2D(createCanvas(), {
    requestAnimationFrame: null,
    cancelAnimationFrame: null
  });
  assert.throws(() => game.start(() => {}, () => {}), /requestAnimationFrame/);
});


test("tam dung game giu lai callback de chay tiep", () => {
  const scheduler = createFrameScheduler();
  const game = new VietGame2D(createCanvas(), {
    requestAnimationFrame: scheduler.requestAnimationFrame.bind(scheduler),
    cancelAnimationFrame: scheduler.cancelAnimationFrame.bind(scheduler)
  });
  let updates = 0;

  game.start(() => updates++, () => {});
  scheduler.step(1000);
  game.stop();

  assert.equal(game.running, false);
  assert.equal(scheduler.callbacks.size, 0);

  game.resume();
  assert.equal(game.running, true);
  scheduler.step(2000);

  assert.equal(updates, 2);
  assert.equal(scheduler.callbacks.size, 1);
  game.destroy();
});

test("khong the chay tiep khi chua co game loop", () => {
  const game = new VietGame2D(createCanvas());
  assert.throws(() => game.resume(), /Chua co game loop/);
});

test("huy game chi mot lan va giai phong callback", () => {
  const scheduler = createFrameScheduler();
  const game = new VietGame2D(createCanvas(), {
    requestAnimationFrame: scheduler.requestAnimationFrame.bind(scheduler),
    cancelAnimationFrame: scheduler.cancelAnimationFrame.bind(scheduler)
  });

  game.start(() => {}, () => {});
  game.destroy();
  game.destroy();

  assert.equal(game.running, false);
  assert.equal(game.destroyed, true);
  assert.equal(scheduler.callbacks.size, 0);
  assert.equal(game.updateCallback, null);
  assert.equal(game.renderCallback, null);
});

test("khong the khoi dong hoac chay lai game da huy", () => {
  const game = new VietGame2D(createCanvas(), {
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {}
  });

  game.destroy();

  assert.throws(
    () => game.start(() => {}, () => {}),
    /game da bi huy/
  );
  assert.throws(() => game.resume(), /game da bi huy/);
});

test("khong the gan ban phim cho game da huy", () => {
  const game = new VietGame2D(createCanvas());
  game.destroy();

  assert.throws(
    () => game.attachKeyboard(createKeyboardTarget()),
    /Game da bi huy/
  );
});


function createMouseTarget() {
  const listeners = new Map();

  return {
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener(type, callback) {
      listeners.get(type)?.delete(callback);
    },
    dispatch(type, event = {}) {
      for (const callback of listeners.get(type) ?? []) {
        callback(event);
      }
    },
    count(type) {
      return listeners.get(type)?.size ?? 0;
    }
  };
}

test("nhan dien chuot va toa do Canvas", () => {
  const canvas = createCanvas();
  canvas.getBoundingClientRect = () => ({
    left: 10, top: 20, width: 800, height: 600
  });

  const target = createMouseTarget();
  const game = new VietGame2D(canvas, { mouseTarget: target });

  target.dispatch("mousemove", { clientX: 110, clientY: 220 });

  assert.deepEqual(game.getMousePosition(), { x: 100, y: 200 });
});

test("quy doi toa do khi Canvas bi co gian", () => {
  const canvas = createCanvas();
  canvas.getBoundingClientRect = () => ({
    left: 100, top: 50, width: 400, height: 300
  });

  const target = createMouseTarget();
  const game = new VietGame2D(canvas, { mouseTarget: target });

  target.dispatch("mousemove", { clientX: 200, clientY: 100 });

  assert.deepEqual(game.getMousePosition(), { x: 200, y: 100 });
});

test("gioi han toa do chuot trong Canvas", () => {
  const canvas = createCanvas();
  canvas.getBoundingClientRect = () => ({
    left: 10, top: 20, width: 800, height: 600
  });

  const target = createMouseTarget();
  const game = new VietGame2D(canvas, { mouseTarget: target });

  target.dispatch("mousemove", { clientX: 900, clientY: 700 });

  assert.deepEqual(game.getMousePosition(), { x: 800, y: 600 });
});

test("nhan dien nhan va tha cac nut chuot", () => {
  const target = createMouseTarget();
  const game = new VietGame2D(createCanvas(), { mouseTarget: target });

  target.dispatch("mousedown", { button: 0 });
  assert.equal(game.isMouseDown("trai"), true);

  target.dispatch("mouseup", { button: 0 });
  assert.equal(game.isMouseDown("trai"), false);

  target.dispatch("mousedown", { button: 1 });
  assert.equal(game.isMouseDown("giua"), true);

  target.dispatch("mousedown", { button: 2 });
  assert.equal(game.isMouseDown("phai"), true);
});

test("nhan nhieu nut chuot cung luc", () => {
  const target = createMouseTarget();
  const game = new VietGame2D(createCanvas(), { mouseTarget: target });

  target.dispatch("mousedown", { button: 0 });
  target.dispatch("mousedown", { button: 2 });

  assert.equal(game.isMouseDown(0), true);
  assert.equal(game.isMouseDown(2), true);
  assert.equal(game.isMouseDown(1), false);
});

test("mouse leave xoa trang thai cac nut chuot", () => {
  const target = createMouseTarget();
  const game = new VietGame2D(createCanvas(), { mouseTarget: target });

  target.dispatch("mousedown", { button: 0 });
  target.dispatch("mouseleave");

  assert.equal(game.isMouseDown("trai"), false);
});

test("destroy go bo tat ca su kien chuot", () => {
  const target = createMouseTarget();
  const game = new VietGame2D(createCanvas(), { mouseTarget: target });

  assert.equal(target.count("mousemove"), 1);
  assert.equal(target.count("mousedown"), 1);

  game.destroy();

  assert.equal(target.count("mousemove"), 0);
  assert.equal(target.count("mousedown"), 0);
  assert.equal(target.count("mouseup"), 0);
  assert.equal(target.count("mouseleave"), 0);
  assert.equal(game.isMouseDown("trai"), false);
});


function createPointerTarget() {
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
      for (const callback of listeners.get(type) ?? []) callback(event);
    },
    count(type) {
      return listeners.get(type)?.size ?? 0;
    },
    setPointerCapture() {}
  };
}

test("nhan dien cham va toa do cam ung", () => {
  const canvas = createCanvas();
  canvas.getBoundingClientRect = () => ({
    left: 10, top: 20, width: 800, height: 600
  });
  const target = createPointerTarget();
  const game = new VietGame2D(canvas, { touchTarget: target });

  target.dispatch("pointerdown", {
    pointerId: 1, pointerType: "touch",
    clientX: 110, clientY: 220, preventDefault() {}
  });

  assert.equal(game.isTouching(), true);
  assert.equal(game.getTouchCount(), 1);
  assert.deepEqual(game.getTouchPosition(), { x: 100, y: 200 });
});

test("theo doi keo ngon tay", () => {
  const target = createPointerTarget();
  const game = new VietGame2D(createCanvas(), { touchTarget: target });

  target.dispatch("pointerdown", {
    pointerId: 1, pointerType: "touch",
    clientX: 10, clientY: 20
  });
  target.dispatch("pointermove", {
    pointerId: 1, pointerType: "touch",
    clientX: 80, clientY: 90
  });

  assert.deepEqual(game.getTouchPosition(), { x: 80, y: 90 });
  assert.equal(game.isTouching(), true);
});

test("ho tro nhieu ngon tay cung luc", () => {
  const target = createPointerTarget();
  const game = new VietGame2D(createCanvas(), { touchTarget: target });

  for (const pointerId of [1, 2]) {
    target.dispatch("pointerdown", {
      pointerId, pointerType: "touch",
      clientX: pointerId * 10, clientY: pointerId * 20
    });
  }

  assert.equal(game.getTouchCount(), 2);
  assert.equal(game.isTouching(), true);

  target.dispatch("pointerup", {
    pointerId: 1, pointerType: "touch",
    clientX: 10, clientY: 20
  });

  assert.equal(game.getTouchCount(), 1);
  assert.equal(game.isTouching(), true);
});

test("pointer cancel giai phong trang thai cham", () => {
  const target = createPointerTarget();
  const game = new VietGame2D(createCanvas(), { touchTarget: target });

  target.dispatch("pointerdown", {
    pointerId: 1, pointerType: "touch", clientX: 10, clientY: 20
  });
  target.dispatch("pointercancel", {
    pointerId: 1, pointerType: "touch", clientX: 10, clientY: 20
  });

  assert.equal(game.isTouching(), false);
  assert.equal(game.getTouchCount(), 0);
});

test("bo qua pointer khong phai cam ung", () => {
  const target = createPointerTarget();
  const game = new VietGame2D(createCanvas(), { touchTarget: target });

  target.dispatch("pointerdown", {
    pointerId: 1, pointerType: "mouse", clientX: 10, clientY: 20
  });

  assert.equal(game.isTouching(), false);
});

test("destroy go bo su kien cam ung va khoi phuc touch action", () => {
  const target = createPointerTarget();
  target.style.touchAction = "pan-y";
  const game = new VietGame2D(createCanvas(), { touchTarget: target });

  assert.equal(target.count("pointerdown"), 1);
  assert.equal(target.style.touchAction, "none");

  game.destroy();

  assert.equal(target.count("pointerdown"), 0);
  assert.equal(target.count("pointermove"), 0);
  assert.equal(target.count("pointerup"), 0);
  assert.equal(target.count("pointercancel"), 0);
  assert.equal(target.style.touchAction, "pan-y");
  assert.equal(game.getTouchCount(), 0);
});

test("tu choi doi tuong cam ung khong hop le", () => {
  assert.throws(
    () => new VietGame2D(createCanvas(), { touchTarget: {} }),
    /cam ung khong hop le/
  );
});


test("unified input system kiem tra cac loai dau vao", () => {
  const keyboard = createMouseTarget();
  const mouse = createMouseTarget();
  const touch = createPointerTarget();
  const game = new VietGame2D(createCanvas(), {
    keyboardTarget: keyboard,
    mouseTarget: mouse,
    touchTarget: touch
  });

  keyboard.dispatch("keydown", { key: "Space" });
  mouse.dispatch("mousedown", { button: 0 });
  touch.dispatch("pointerdown", {
    pointerId: 1, pointerType: "touch",
    clientX: 30, clientY: 40
  });

  assert.equal(game.isInputDown("key:Space"), true);
  assert.equal(game.isInputDown("mouse:trai"), true);
  assert.equal(game.isInputDown("touch"), true);
  assert.equal(game.isInputDown("key:Enter"), false);
  assert.equal(game.isInputDown("unknown"), false);
  assert.equal(game.getInputCount(), 3);

  game.destroy();
});

test("unified input uu tien toa do cam ung va fallback sang chuot", () => {
  const mouse = createMouseTarget();
  const touch = createPointerTarget();
  const canvas = createCanvas();
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, width: 800, height: 600
  });

  const game = new VietGame2D(canvas, {
    mouseTarget: mouse,
    touchTarget: touch
  });

  mouse.dispatch("mousemove", { clientX: 100, clientY: 120 });
  assert.deepEqual(game.getInputPosition(), { x: 100, y: 120 });

  touch.dispatch("pointerdown", {
    pointerId: 1, pointerType: "touch",
    clientX: 30, clientY: 40
  });
  assert.deepEqual(game.getInputPosition(), { x: 30, y: 40 });

  touch.dispatch("pointerup", {
    pointerId: 1, pointerType: "touch",
    clientX: 30, clientY: 40
  });
  assert.deepEqual(game.getInputPosition(), { x: 100, y: 120 });

  game.destroy();
});

test("unified input dem chinh xac nhieu nut va nhieu ngon tay", () => {
  const keyboard = createMouseTarget();
  const mouse = createMouseTarget();
  const touch = createPointerTarget();
  const game = new VietGame2D(createCanvas(), {
    keyboardTarget: keyboard,
    mouseTarget: mouse,
    touchTarget: touch
  });

  keyboard.dispatch("keydown", { key: "a" });
  keyboard.dispatch("keydown", { key: "b" });
  mouse.dispatch("mousedown", { button: 0 });
  touch.dispatch("pointerdown", {
    pointerId: 1, pointerType: "touch", clientX: 1, clientY: 1
  });
  touch.dispatch("pointerdown", {
    pointerId: 2, pointerType: "touch", clientX: 2, clientY: 2
  });

  assert.equal(game.getInputCount(), 5);

  keyboard.dispatch("keyup", { key: "a" });
  touch.dispatch("pointerup", {
    pointerId: 1, pointerType: "touch", clientX: 1, clientY: 1
  });

  assert.equal(game.getInputCount(), 3);
  game.destroy();
});

function createImageIntegrationCanvas() {
  const calls = [];

  const ctx = {
    fillStyle: "",
    font: "",
    fillRect() {},
    beginPath() {},
    arc() {},
    fill() {},
    fillText() {},
    drawImage(...args) {
      calls.push(args);
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

function createImageIntegrationFactory() {
  const created = [];

  return {
    created,
    imageFactory() {
      const image = {
        src: "",
        onload: null,
        onerror: null
      };

      created.push(image);
      return image;
    }
  };
}

test("VietGame2D dang ky hinh anh", () => {
  const canvas = createImageIntegrationCanvas();
  const factory = createImageIntegrationFactory();
  const game = new VietGame2D(canvas, {
    imageFactory: factory.imageFactory
  });

  game.dangKyHinhAnh("player", "player.png");

  assert.equal(factory.created.length, 1);
  assert.equal(factory.created[0].src, "player.png");

  game.destroy();
});

test("VietGame2D kiem tra trang thai tai hinh anh", () => {
  const factory = createImageIntegrationFactory();
  const game = new VietGame2D(createImageIntegrationCanvas(), {
    imageFactory: factory.imageFactory
  });

  game.dangKyHinhAnh("player", "player.png");

  assert.equal(game.hinhAnhDaTai("player"), false);

  factory.created[0].onload();

  assert.equal(game.hinhAnhDaTai("player"), true);

  game.destroy();
});

test("VietGame2D ve hinh anh len Canvas", () => {
  const canvas = createImageIntegrationCanvas();
  const factory = createImageIntegrationFactory();
  const game = new VietGame2D(canvas, {
    imageFactory: factory.imageFactory
  });

  game.dangKyHinhAnh("player", "player.png");
  factory.created[0].onload();

  assert.equal(game.veHinhAnh("player", 10, 20), true);
  assert.deepEqual(canvas.calls[0], [
    factory.created[0], 10, 20
  ]);

  game.destroy();
});

test("VietGame2D ve hinh anh voi kich thuoc tuy chinh", () => {
  const canvas = createImageIntegrationCanvas();
  const factory = createImageIntegrationFactory();
  const game = new VietGame2D(canvas, {
    imageFactory: factory.imageFactory
  });

  game.dangKyHinhAnh("player", "player.png");
  factory.created[0].onload();

  assert.equal(
    game.veHinhAnhCoKichThuoc("player", 10, 20, 100, 80),
    true
  );

  assert.deepEqual(canvas.calls[0], [
    factory.created[0], 10, 20, 100, 80
  ]);

  game.destroy();
});

test("VietGame2D khong ve hinh anh chua tai", () => {
  const canvas = createImageIntegrationCanvas();
  const factory = createImageIntegrationFactory();
  const game = new VietGame2D(canvas, {
    imageFactory: factory.imageFactory
  });

  game.dangKyHinhAnh("player", "player.png");

  assert.equal(game.veHinhAnh("player", 10, 20), false);
  assert.equal(canvas.calls.length, 0);

  game.destroy();
});

test("destroy VietGame2D giai phong Image Engine", () => {
  const factory = createImageIntegrationFactory();
  const game = new VietGame2D(createImageIntegrationCanvas(), {
    imageFactory: factory.imageFactory
  });

  game.dangKyHinhAnh("player", "player.png");

  const image = factory.created[0];

  game.destroy();

  assert.equal(image.onload, null);
  assert.equal(image.onerror, null);
  assert.equal(image.src, "");
});

