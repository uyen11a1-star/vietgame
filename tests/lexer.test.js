import test from "node:test";
import assert from "node:assert/strict";
import { tokenize, LexerError } from "../src/lexer.js";

test("nhan dien bien, ten, toan tu va so", () => {
  const tokens = tokenize("bien tocDo = 12");
  assert.deepEqual(tokens.slice(0, 4).map(t => t.type),
    ["KEYWORD", "IDENTIFIER", "EQUAL", "NUMBER"]);
  assert.equal(tokens[3].literal, 12);
});

test("nhan dien chuoi va ky tu escape", () => {
  const tokens = tokenize('in("Xin\\nchao")');
  const stringToken = tokens.find(t => t.type === "STRING");
  assert.equal(stringToken.literal, "Xin\nchao");
});

test("tao INDENT va DEDENT", () => {
  const tokens = tokenize("neu that:\n    in(1)\nin(2)");
  assert.ok(tokens.some(t => t.type === "INDENT"));
  assert.ok(tokens.some(t => t.type === "DEDENT"));
});

test("bo qua chu thich mot dong", () => {
  const tokens = tokenize("bien x = 1 # ghi chu");
  assert.ok(tokens.some(t => t.type === "IDENTIFIER" && t.lexeme === "x"));
  assert.equal(tokens.some(t => t.lexeme === "ghi"), false);
});

test("bao loi tab o dau dong", () => {
  assert.throws(() => tokenize("neu that:\n\tin(1)"), LexerError);
});

test("bao loi ky tu khong hop le", () => {
  assert.throws(() => tokenize("bien x = @"), LexerError);
});
