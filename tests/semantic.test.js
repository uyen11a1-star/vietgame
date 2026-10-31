import test from "node:test";
import assert from "node:assert/strict";
import { tokenize } from "../src/lexer.js";
import { parse } from "../src/parser.js";
import { analyze } from "../src/semantic.js";
const check = source => analyze(parse(tokenize(source)));

test("chap nhan bien va dieu kien hop le", () => {
  const result = check("bien tocDo = 5\nneu tocDo > 0:\n    in(\"Xin chao\")");
  assert.equal(result.ok, true);
});
test("bao loi bien chua khai bao", () => {
  const result = check("in(tocDo)");
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some(d => d.code === "VG3002"));
});
test("bao loi gan sai kieu", () => {
  const result = check('so tuoi = 15\ntuoi = "muoi lam"');
  assert.ok(result.diagnostics.some(d => d.code === "VG3004"));
});
test("kiem tra tham so ham", () => {
  const result = check("ham tong(a: so, b: so) -> so:\n    traVe a + b\nbien ketQua = tong(1)");
  assert.ok(result.diagnostics.some(d => d.code === "VG3014"));
});
test("kiem tra dieu kien phai la logic", () => {
  const result = check("neu 123:\n    in(1)");
  assert.ok(result.diagnostics.some(d => d.code === "VG3008"));
});
test("chap nhan ham khai bao truoc hoac sau loi goi", () => {
  const result = check("bien kq = tong(2, 3)\nham tong(a: so, b: so) -> so:\n    traVe a + b");
  assert.equal(result.ok, true);
});
