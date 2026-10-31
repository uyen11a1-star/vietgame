import fs from "node:fs";
import { tokenize } from "./lexer.js";
import { parse } from "./parser.js";

const file = process.argv[2];
if (!file) {
  console.log("VietGame Parser 0.1");
  console.log("Su dung: node src/parse-cli.js examples/hello.vg");
  process.exit(0);
}

try {
  const source = fs.readFileSync(file, "utf8");
  const tokens = tokenize(source);
  const ast = parse(tokens);
  console.log(JSON.stringify(ast, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
