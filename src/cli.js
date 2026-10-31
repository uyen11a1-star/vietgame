import fs from "node:fs";
import { tokenize } from "./lexer.js";

const file = process.argv[2];
if (!file) {
  console.log("VietGame Lexer 0.1");
  console.log("Su dung: npm run tokens -- duong-dan/toi-tep.vg");
  process.exit(0);
}

try {
  const source = fs.readFileSync(file, "utf8");
  const tokens = tokenize(source);
  for (const token of tokens) console.log(token.toString());
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
