import { tokenize } from "./lexer.js";
import { parse } from "./parser.js";
import { analyze, SemanticError } from "./semantic.js";
import { Interpreter } from "./interpreter.js";
import { VietGame2D } from "./engine/game2d.js";

/**
 * Chay chuong trinh VietGame tren Canvas cua trinh duyet.
 *
 * @param {string} source Ma nguon .vg
 * @param {HTMLCanvasElement} canvas Canvas dich
 * @param {object} options Tuy chinh kich thuoc va mau nen
 */
export function runVietGame(source, canvas, options = {}) {
  const tokens = tokenize(source);
  const program = parse(tokens);

  const semantic = analyze(program);

  if (!semantic.ok) {
    throw new SemanticError(semantic.diagnostics);
  }

  const keyboardTarget = options.keyboardTarget ??
    (typeof window !== "undefined" ? window : null);

  const game = new VietGame2D(canvas, {
    ...options,
    keyboardTarget
  });

  const interpreter = new Interpreter({
    game,
    onOutput: options.onOutput,
    onGameTitle: options.onGameTitle
  });

  const result = interpreter.interpret(program);

  return {
    title: interpreter.gameTitle,
    output: result.output,
    game,
    program
  };
}
