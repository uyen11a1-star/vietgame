import fs from "node:fs";
import { tokenize } from "./lexer.js";
import { parse } from "./parser.js";
import { analyze } from "./semantic.js";

const file = process.argv[2];
if (!file) {
  console.log("VietGame Semantic Analyzer 0.1");
  console.log("Su dung: node src/check-cli.js examples/hello.vg");
  process.exit(0);
}
try {
  const source = fs.readFileSync(file, "utf8");
  const result = analyze(parse(tokenize(source)));
  if (result.ok) {
    console.log("Kiem tra thanh cong! Khong phat hien loi ngu nghia.");
    process.exit(0);
  }
  console.error(`Phat hien ${result.diagnostics.length} loi ngu nghia:`);
  for (const d of result.diagnostics) console.error(`- [${d.code}] ${d.message}`);
  process.exit(1);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
