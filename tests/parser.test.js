
import test from "node:test";
import assert from "node:assert/strict";
import { tokenize } from "../src/lexer.js";
import { parse, ParserError } from "../src/parser.js";

const run = (source) => parse(tokenize(source));

test("phan tich khai bao bien", () => {
  const ast = run("bien x = 12");
  assert.equal(ast.body[0].type, "VariableDeclaration");
  assert.equal(ast.body[0].name, "x");
  assert.equal(ast.body[0].initializer.value, 12);
});

test("phan tich bieu thuc co thu tu uu tien", () => {
  const ast = run("bien x = 2 + 3 * 4");
  const expr = ast.body[0].initializer;
  assert.equal(expr.operator, "+");
  assert.equal(expr.right.operator, "*");
});

test("phan tich if va else", () => {
  const ast = run("neu that:\n    in(1)\nnguocLai:\n    in(2)");
  assert.equal(ast.body[0].type, "IfStatement");
  assert.equal(ast.body[0].thenBranch.length, 1);
  assert.equal(ast.body[0].elseBranch.length, 1);
});

test("phan tich ham va tham so", () => {
  const ast = run("ham tong(a: so, b: so) -> so:\n    traVe a + b");
  assert.equal(ast.body[0].type, "FunctionDeclaration");
  assert.equal(ast.body[0].params.length, 2);
  assert.equal(ast.body[0].returnType, "so");
});

test("phan tich vong lap lap lan", () => {
  const ast = run("lap 3 lan:\n    in(1)");
  assert.equal(ast.body[0].type, "RepeatStatement");
});

test("bao loi khi thieu dau hai cham", () => {
  assert.throws(() => run("neu that\n    in(1)"), ParserError);
});

test("phan tich khai bao tro choi", () => {
  const ast = run('trochoi "Demo"');
  assert.equal(ast.body[0].type, "GameDeclaration");
  assert.equal(ast.body[0].name, "Demo");
});
