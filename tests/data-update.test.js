import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("VietGame doc duoc mang va doi tuong", () => {
  const result = spawnSync(
    process.execPath,
    ["src/run-cli.js", "examples/data-test.vg"],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 0, result.stderr);

  const output = result.stdout.trim().split("\n");

  assert.deepEqual(output, [
    "10",
    "20",
    "30",
    "Nyra",
    "5"
  ]);
});

test("VietGame thay doi duoc du lieu", () => {
  const result = spawnSync(
    process.execPath,
    ["src/run-cli.js", "examples/data-update.vg"],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 0, result.stderr);

  const output = result.stdout.trim().split("\n");

  assert.deepEqual(output, [
    "100",
    "25",
    "VietGame",
    "10"
  ]);
});
