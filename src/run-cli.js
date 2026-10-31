import fs from "node:fs";
import { tokenize } from "./lexer.js";
import { parse } from "./parser.js";
import { analyze } from "./semantic.js";
import { Interpreter } from "./interpreter.js";

const file = process.argv[2];

if (!file) {
  console.log("VietGame Interpreter v0.1");
  console.log("Su dung: node src/run-cli.js <file.vg>");
  process.exit(0);
}

try {
  const source = fs.readFileSync(file, "utf8");
  const ast = parse(tokenize(source));

  const result = analyze(ast);

  if (!result.ok) {
    console.error("Phat hien loi ngu nghia:");

    for (const error of result.diagnostics) {
      console.error(error.message);
    }

    process.exit(1);
  }

  const interpreter = new Interpreter();
  const execution = interpreter.interpret(ast);

  for (const line of execution.output) {
    console.log(line);
  }

} catch (error) {
  console.error(error.message);
  process.exit(1);
}
