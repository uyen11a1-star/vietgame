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


test("tao, di chuyen va ve nhan vat", () => {
  const canvas = createCanvas();
  const source = `
trochoi "Nhan vat dau tien"
bien nguoiChoi = taoNhanVat(10, 20, 30, 40, "#ffcc00")
diChuyen(nguoiChoi, 15, 25)
veNhanVat(nguoiChoi)
`;

  runVietGame(source, canvas);

  assert.ok(canvas.calls.some(call =>
    call[0] === "fillRect" &&
    call[1] === 25 &&
    call[2] === 45 &&
    call[3] === 30 &&
    call[4] === 40
  ));
});

test("kiem tra so doi so cua ham taoNhanVat", () => {
  assert.throws(
    () => runVietGame(
      "bien nv = taoNhanVat(10, 20, 30)",
      createCanvas()
    ),
    /VG3014/
  );
});


test("phimDangNhan hoat dong trong chuong trinh VietGame", () => {
  const canvas = createCanvas();
  const output = [];

  const result = runVietGame(
    'in(phimDangNhan("ArrowRight"))',
    canvas,
    { onOutput: line => output.push(line) }
  );

  assert.deepEqual(output, ["sai"]);
  assert.equal(result.game.isKeyDown("ArrowRight"), false);
});

test("phimDangNhan duoc kiem tra kieu logic", () => {
  const canvas = createCanvas();

  assert.throws(
    () => runVietGame(
      'neu phimDangNhan(123):\n    in("dang nhan")',
      canvas
    ),
    /VG3015/
  );
});


test("vaCham tra ve that khi hai nhan vat chong lan", () => {
  const output = [];
  runVietGame(`
bien a = taoNhanVat(10, 10, 40, 40, "#ff0000")
bien b = taoNhanVat(30, 30, 40, 40, "#00ff00")
in(vaCham(a, b))
`, createCanvas(), { onOutput: line => output.push(line) });
  assert.deepEqual(output, ["that"]);
});

test("vaCham tra ve sai khi hai nhan vat khong cham nhau", () => {
  const output = [];
  runVietGame(`
bien a = taoNhanVat(10, 10, 20, 20, "#ff0000")
bien b = taoNhanVat(100, 100, 20, 20, "#00ff00")
in(vaCham(a, b))
`, createCanvas(), { onOutput: line => output.push(line) });
  assert.deepEqual(output, ["sai"]);
});

test("vaCham kiem tra kieu doi tuong", () => {
  assert.throws(
    () => runVietGame("in(vaCham(123, 456))", createCanvas()),
    /VG3015/
  );
});


function createBrowserFrameScheduler() {
  let nextId = 1;
  const callbacks = new Map();

  return {
    callbacks,
    requestAnimationFrame(callback) {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
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

test("browser tu dong chay capNhat va ve trong game loop", () => {
  const canvas = createCanvas();
  const scheduler = createBrowserFrameScheduler();

  const result = runVietGame(`
bien nguoiChoi = taoNhanVat(10, 10, 20, 20, "#ff0000")

ham capNhat(dt):
    diChuyen(nguoiChoi, 200 * dt, 0)

ham ve():
    xoaManHinh("#111111")
    veNhanVat(nguoiChoi)
`, canvas, {
    requestAnimationFrame: scheduler.requestAnimationFrame.bind(scheduler),
    cancelAnimationFrame: scheduler.cancelAnimationFrame.bind(scheduler)
  });

  assert.equal(result.game.running, true);

  scheduler.step(1000);
  scheduler.step(1050);

  assert.ok(canvas.calls.some(call =>
    call[0] === "fillRect" &&
    call[1] === 20 &&
    call[2] === 10
  ));

  result.game.destroy();
  assert.equal(result.game.running, false);
});

test("browser bao loi neu chi khai bao mot callback game loop", () => {
  const scheduler = createBrowserFrameScheduler();

  assert.throws(() => runVietGame(`
ham capNhat(dt):
    in("dang cap nhat")
`, createCanvas(), {
    requestAnimationFrame: scheduler.requestAnimationFrame.bind(scheduler),
    cancelAnimationFrame: scheduler.cancelAnimationFrame.bind(scheduler)
  }), /ca ham capNhat/);

  assert.equal(scheduler.callbacks.size, 0);
});


test("cac lenh quan ly game duoc semantic analyzer chap nhan", () => {
  const source = `
ham quanLy():
    dungGame()
    chayGame()
    huyGame()
`;
  const result = runVietGame(source, createCanvas());
  assert.equal(result.game.destroyed, false);
});

test("lenh dungGame tam dung game loop", () => {
  const scheduler = createBrowserFrameScheduler();
  const result = runVietGame(`
ham capNhat(dt):
    dungGame()

ham ve():
    in("dang ve")
`, createCanvas(), {
    requestAnimationFrame: scheduler.requestAnimationFrame.bind(scheduler),
    cancelAnimationFrame: scheduler.cancelAnimationFrame.bind(scheduler)
  });

  assert.equal(result.game.running, true);
  scheduler.step(1000);

  assert.equal(result.game.running, false);
  assert.equal(scheduler.callbacks.size, 0);
});

test("lenh huyGame huy game loop", () => {
  const scheduler = createBrowserFrameScheduler();
  const result = runVietGame(`
ham capNhat(dt):
    huyGame()

ham ve():
    in("dang ve")
`, createCanvas(), {
    requestAnimationFrame: scheduler.requestAnimationFrame.bind(scheduler),
    cancelAnimationFrame: scheduler.cancelAnimationFrame.bind(scheduler)
  });

  scheduler.step(1000);

  assert.equal(result.game.destroyed, true);
  assert.equal(result.game.running, false);
  assert.equal(scheduler.callbacks.size, 0);
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
    }
  };
}

test("browser nhan dien chuot trong game loop", () => {
  const canvas = createCanvas();
  const target = createMouseTarget();
  const scheduler = createBrowserFrameScheduler();
  const output = [];

  const result = runVietGame(`
ham capNhat(dt):
    in(chuotDangNhan("trai"))
    in(viTriChuotX())
    in(viTriChuotY())

ham ve():
    in("ve")
`, canvas, {
    mouseTarget: target,
    requestAnimationFrame: scheduler.requestAnimationFrame.bind(scheduler),
    cancelAnimationFrame: scheduler.cancelAnimationFrame.bind(scheduler),
    onOutput: line => output.push(line)
  });

  target.dispatch("mousemove", { clientX: 120, clientY: 140 });
  target.dispatch("mousedown", { button: 0 });
  scheduler.step(1000);

  assert.deepEqual(output, ["that", "120", "140", "ve"]);

  result.game.destroy();
});

test("browser nhan dien chuot phai va chuot giua", () => {
  const target = createMouseTarget();
  const result = runVietGame("", createCanvas(), {
    mouseTarget: target
  });

  target.dispatch("mousedown", { button: 1 });
  assert.equal(result.game.isMouseDown("giua"), true);

  target.dispatch("mousedown", { button: 2 });
  assert.equal(result.game.isMouseDown("phai"), true);

  result.game.destroy();
});

test("chuotDangNhan kiem tra kieu du lieu", () => {
  assert.throws(
    () => runVietGame("in(chuotDangNhan(123))", createCanvas()),
    /VG3015/
  );
});


function createBrowserPointerTarget() {
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
    setPointerCapture() {}
  };
}

test("browser tich hop cac ham cam ung", () => {
  const target = createBrowserPointerTarget();
  const output = [];

  const result = runVietGame(`
ham capNhat(dt):
    in(ngonTayDangCham())
    in(viTriChamX())
    in(viTriChamY())
    in(soNgonTayDangCham())

ham ve():
    in("ve")
`, createCanvas(), {
    touchTarget: target,
    requestAnimationFrame: callback => {
      globalThis.__unusedTouchFrame = callback;
      return 1;
    },
    cancelAnimationFrame: () => {},
    onOutput: line => output.push(line)
  });

  target.dispatch("pointerdown", {
    pointerId: 1, pointerType: "touch",
    clientX: 30, clientY: 40, preventDefault() {}
  });

  result.game.updateCallback(0.016);

  assert.deepEqual(output, ["that", "30", "40", "1"]);
  result.game.destroy();
});

test("cac ham cam ung duoc kiem tra kieu du lieu", () => {
  const result = runVietGame(`
in(ngonTayDangCham())
in(viTriChamX())
in(viTriChamY())
in(soNgonTayDangCham())
`, createCanvas());

  assert.equal(result.game.isTouching(), false);
  result.game.destroy();
});


test("browser tich hop unified input system", () => {
  const keyboard = createMouseTarget();
  const mouse = createMouseTarget();
  const touch = createBrowserPointerTarget();
  const output = [];

  const result = runVietGame(`
ham capNhat(dt):
    in(dauVaoDangNhan("key:Space"))
    in(dauVaoDangNhan("mouse:trai"))
    in(dauVaoDangNhan("touch"))
    in(viTriDauVaoX())
    in(viTriDauVaoY())
    in(soDauVaoDangNhan())

ham ve():
    in("ve")
`, createCanvas(), {
    keyboardTarget: keyboard,
    mouseTarget: mouse,
    touchTarget: touch,
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    onOutput: line => output.push(line)
  });

  keyboard.dispatch("keydown", { key: "Space" });
  mouse.dispatch("mousedown", { button: 0 });
  touch.dispatch("pointerdown", {
    pointerId: 1, pointerType: "touch",
    clientX: 30, clientY: 40
  });

  result.game.updateCallback(0.016);

  assert.deepEqual(output, [
    "that", "that", "that", "30", "40", "3"
  ]);

  result.game.destroy();
});

test("unified input duoc semantic analyzer kiem tra kieu", () => {
  assert.throws(
    () => runVietGame(
      "in(dauVaoDangNhan(123))",
      createCanvas()
    ),
    /VG3015/
  );
});

test("unified input hoat dong khi khong co thiet bi dau vao", () => {
  const output = [];
  const result = runVietGame(`
in(dauVaoDangNhan("key:Space"))
in(dauVaoDangNhan("mouse:trai"))
in(dauVaoDangNhan("touch"))
in(viTriDauVaoX())
in(viTriDauVaoY())
in(soDauVaoDangNhan())
`, createCanvas(), {
    onOutput: line => output.push(line)
  });

  assert.deepEqual(output, ["sai", "sai", "sai", "0", "0", "0"]);
  result.game.destroy();
});


test("browser tich hop Audio System", () => {
  const created = [];
  const output = [];

  const result = runVietGame(`
bien amThanh = phatAmThanh("click.wav")
bien nhac = phatNhacNen("theme.mp3")
datAmLuong(0.5)
in("audio-ready")
dungAmThanh()
`, createCanvas(), {
    audioFactory(src) {
      const item = {
        src,
        loop: false,
        volume: 1,
        currentTime: 0,
        paused: false,
        play() {
          this.paused = false;
          return Promise.resolve();
        },
        pause() {
          this.paused = true;
        }
      };
      created.push(item);
      return item;
    },
    onOutput: line => output.push(line)
  });

  assert.deepEqual(output, ["audio-ready"]);
  assert.equal(created.length, 2);
  assert.equal(created[0].loop, false);
  assert.equal(created[1].loop, true);
  assert.equal(created[0].volume, 0.5);
  assert.equal(created[1].volume, 0.5);
  assert.equal(created[0].paused, true);
  assert.equal(created[1].paused, true);

  result.game.destroy();
});

test("Audio System duoc semantic analyzer kiem tra kieu", () => {
  assert.throws(
    () => runVietGame('datAmLuong("lon")', createCanvas()),
    /VG3015/
  );
});


// v0.6.1 - Audio Controls
test("browser dieu khien tam dung va tiep tuc am thanh", () => {
  const created = [];

  const result = runVietGame(`
bien nhac = phatNhacNen("theme.mp3")
tamDungAmThanh()
tiepTucAmThanh()
`, createCanvas(), {
    audioFactory(src) {
      const item = {
        src,
        loop: false,
        volume: 1,
        currentTime: 0,
        paused: false,
        playCount: 0,
        play() {
          this.paused = false;
          this.playCount++;
          return Promise.resolve();
        },
        pause() {
          this.paused = true;
        }
      };
      created.push(item);
      return item;
    }
  });

  assert.equal(created.length, 1);
  assert.equal(created[0].loop, true);
  assert.equal(created[0].paused, false);
  assert.equal(created[0].playCount, 2);

  result.game.destroy();
});

test("tamDungAmThanh khong nhan doi so", () => {
  assert.throws(
    () => runVietGame(
      'tamDungAmThanh("sai")',
      createCanvas()
    ),
    /VG3014/
  );
});
