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
