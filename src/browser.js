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
  const mouseTarget = options.mouseTarget ??
    (
      typeof canvas?.addEventListener === "function" &&
      typeof canvas?.removeEventListener === "function"
        ? canvas
        : null
    );

  const touchTarget = options.touchTarget ??
    (
      typeof canvas?.addEventListener === "function" &&
      typeof canvas?.removeEventListener === "function"
        ? canvas
        : null
    );

  const game = new VietGame2D(canvas, {
    ...options,
    keyboardTarget,
    mouseTarget,
    touchTarget
  });

  const interpreter = new Interpreter({
    game,
    onOutput: options.onOutput,
    onGameTitle: options.onGameTitle
  });

  const result = interpreter.interpret(program);

  const hasUpdate = interpreter.hasFunction("capNhat");
  const hasRender = interpreter.hasFunction("ve");

  if (hasUpdate !== hasRender) {
    game.destroy();
    throw new Error(
      "VietGame: Can khai bao ca ham capNhat(dt) va ham ve()."
    );
  }

  if (hasUpdate && hasRender) {
    game.start(
      deltaTime => interpreter.callFunction("capNhat", [deltaTime]),
      () => interpreter.callFunction("ve")
    );
  }

  return {
    title: interpreter.gameTitle,
    output: result.output,
    game,
    program
  };
}
