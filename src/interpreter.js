export class RuntimeError extends Error {
  constructor(message) {
    super(`VG4001: ${message}`);
    this.name = "RuntimeError";
  }
}

class Environment {
  constructor(parent = null) {
    this.parent = parent;
    this.values = new Map();
  }

  define(name, value) {
    this.values.set(name, value);
  }

  get(name) {
    if (this.values.has(name)) return this.values.get(name);
    if (this.parent) return this.parent.get(name);
    throw new RuntimeError(`Khong tim thay bien '${name}'.`);
  }

  assign(name, value) {
    if (this.values.has(name)) {
      this.values.set(name, value);
      return;
    }
    if (this.parent) return this.parent.assign(name, value);
    throw new RuntimeError(`Bien '${name}' chua duoc khai bao.`);
  }
}

class ReturnSignal {
  constructor(value) {
    this.value = value;
  }
}

function display(value) {
  if (value === null || value === undefined) return "rong";
  if (value === true) return "that";
  if (value === false) return "sai";
  if (Array.isArray(value)) return `[${value.map(display).join(", ")}]`;
  return String(value);
}

export class Interpreter {
  constructor(options = {}) {
    this.output = [];
    this.onOutput = options.onOutput ?? null;
    this.maxLoopIterations = options.maxLoopIterations ?? 100000;
    this.maxCallDepth = options.maxCallDepth ?? 256;
    this.callDepth = 0;
    this.environment = new Environment();

    this.game = options.game ?? null;
    this.onGameTitle = options.onGameTitle ?? null;
    this.gameTitle = null;

    this.environment.define("in", (...args) => {
      const line = args.map(display).join(" ");
      this.output.push(line);
      this.onOutput?.(line);
      return null;
    });

    const gameMethod = (name, method) => (...args) => {
      if (!this.game || typeof this.game[method] !== "function") {
        throw new RuntimeError(
          `Ham '${name}' chi hoat dong trong moi truong Canvas.`
        );
      }
      return this.game[method](...args);
    };

    this.environment.define("xoaManHinh",
      gameMethod("xoaManHinh", "clear"));
    this.environment.define("veChuNhat",
      gameMethod("veChuNhat", "rect"));
    this.environment.define("veHinhTron",
      gameMethod("veHinhTron", "circle"));
    this.environment.define("veChu", (...args) => {
      if (!this.game) {
        throw new RuntimeError(
          "Ham 'veChu' chi hoat dong trong moi truong Canvas."
        );
      }
      const [value, x, y, size, color] = args;
      return this.game.text(value, x, y, { size, color });
    });

    this.environment.define("taoNhanVat", (...args) => {
      if (!this.game) {
        throw new RuntimeError("Ham 'taoNhanVat' chi hoat dong trong Canvas.");
      }
      if (args.length !== 5) {
        throw new RuntimeError("Ham 'taoNhanVat' can 5 doi so.");
      }
      try {
        return this.game.createCharacter(...args);
      } catch (error) {
        throw new RuntimeError(error.message);
      }
    });

    this.environment.define("diChuyen", (...args) => {
      if (!this.game) {
        throw new RuntimeError("Ham 'diChuyen' chi hoat dong trong Canvas.");
      }
      try {
        return this.game.moveCharacter(...args);
      } catch (error) {
        throw new RuntimeError(error.message);
      }
    });

    this.environment.define("veNhanVat",
      gameMethod("veNhanVat", "drawCharacter"));
    this.environment.define("phimDangNhan", key =>
      this.game?.isKeyDown(key) ?? false);
    this.environment.define("chuotDangNhan", button =>
      this.game?.isMouseDown(button) ?? false);
    this.environment.define("viTriChuotX", () =>
      this.game?.getMousePosition().x ?? 0);
    this.environment.define("viTriChuotY", () =>
      this.game?.getMousePosition().y ?? 0);
    this.environment.define("ngonTayDangCham", () =>
      this.game?.isTouching() ?? false);
    this.environment.define("viTriChamX", () =>
      this.game?.getTouchPosition().x ?? 0);
    this.environment.define("viTriChamY", () =>
      this.game?.getTouchPosition().y ?? 0);
    this.environment.define("soNgonTayDangCham", () =>
      this.game?.getTouchCount() ?? 0);
    this.environment.define("dauVaoDangNhan", input =>
      this.game?.isInputDown(input) ?? false);
    this.environment.define("viTriDauVaoX", () =>
      this.game?.getInputPosition().x ?? 0);
    this.environment.define("viTriDauVaoY", () =>
      this.game?.getInputPosition().y ?? 0);
    this.environment.define("soDauVaoDangNhan", () =>
      this.game?.getInputCount() ?? 0);
    this.environment.define("dangKyAmThanh", (name, src) =>
      gameMethod("dangKyAmThanh", "dangKyAmThanh")(name, src));
    this.environment.define("dangKyNhacNen", (name, src) =>
      gameMethod("dangKyNhacNen", "dangKyNhacNen")(name, src));
    this.environment.define("phatAmThanh", src =>
      gameMethod("phatAmThanh", "phatAmThanh")(src));
    this.environment.define("phatNhacNen", src =>
      gameMethod("phatNhacNen", "phatNhacNen")(src));
    this.environment.define("dungAmThanh", () =>
      gameMethod("dungAmThanh", "dungAmThanh")());
    this.environment.define("tamDungAmThanh", () =>
      gameMethod("tamDungAmThanh", "tamDungAmThanh")());
    this.environment.define("tiepTucAmThanh", () =>
      gameMethod("tiepTucAmThanh", "tiepTucAmThanh")());
    this.environment.define("datAmLuong", value =>
      gameMethod("datAmLuong", "datAmLuong")(value));
    this.environment.define("dangKyHinhAnh", (name, src) =>
      gameMethod("dangKyHinhAnh", "dangKyHinhAnh")(name, src));
    this.environment.define("hinhAnhDaTai", name =>
      gameMethod("hinhAnhDaTai", "hinhAnhDaTai")(name));
    this.environment.define("veHinhAnh", (name, x, y) =>
      gameMethod("veHinhAnh", "veHinhAnh")(name, x, y));
    this.environment.define("veHinhAnhCoKichThuoc", (name, x, y, width, height) =>
      gameMethod("veHinhAnhCoKichThuoc", "veHinhAnhCoKichThuoc")(
        name, x, y, width, height
      ));
    this.environment.define("vaCham",
      gameMethod("vaCham", "collides"));
    this.environment.define("dungGame",
      gameMethod("dungGame", "stop"));
    this.environment.define("chayGame",
      gameMethod("chayGame", "resume"));
    this.environment.define("huyGame",
      gameMethod("huyGame", "destroy"));
  }

  hasFunction(name) {
    return typeof this.environment.values.get(name) === "function";
  }

  callFunction(name, args = []) {
    if (!this.hasFunction(name)) {
      throw new RuntimeError(`Khong tim thay ham '${name}'.`);
    }

    return this.environment.values.get(name)(...args);
  }

  interpret(program) {
    this.output = [];
    this.callDepth = 0;
    this.gameTitle = null;

    try {
      for (const statement of program.body ?? []) {
        this.execute(statement);
      }
    } catch (error) {
      if (error instanceof ReturnSignal) {
        throw new RuntimeError("Lenh 'traVe' khong the dung ben ngoai ham.");
      }
      throw error;
    }

    return { output: [...this.output] };
  }

  executeBlock(statements, environment) {
    const previous = this.environment;
    this.environment = environment;

    try {
      for (const statement of statements) {
        this.execute(statement);
      }
    } finally {
      this.environment = previous;
    }
  }

  execute(node) {
    switch (node.type) {
      case "GameDeclaration":
        this.gameTitle = node.name;
        this.onGameTitle?.(node.name);
        return;

      case "VariableDeclaration": {
        const value = node.initializer
          ? this.evaluate(node.initializer)
          : null;
        this.environment.define(node.name, value);
        return;
      }

      case "FunctionDeclaration": {
        const closure = this.environment;
        const declaration = node;

        this.environment.define(node.name, (...args) => {
          if (args.length !== declaration.params.length) {
            throw new RuntimeError(
              `Ham '${node.name}' nhan sai so doi so.`
            );
          }

          if (this.callDepth >= this.maxCallDepth) {
            throw new RuntimeError(
              `Ham '${node.name}' vuot qua gioi han do sau goi ham (${this.maxCallDepth}).`
            );
          }

          this.callDepth++;

          try {
            const local = new Environment(closure);

            declaration.params.forEach((param, index) => {
              local.define(param.name, args[index]);
            });

            try {
              this.executeBlock(declaration.body, local);
            } catch (error) {
              if (error instanceof ReturnSignal) {
                return error.value;
              }
              throw error;
            }

            return null;
          } finally {
            this.callDepth--;
          }
        });

        return;
      }

      case "IfStatement":
        if (this.truthy(this.evaluate(node.condition))) {
          this.executeBlock(
            node.thenBranch,
            new Environment(this.environment)
          );
        } else if (node.elseBranch) {
          this.executeBlock(
            node.elseBranch,
            new Environment(this.environment)
          );
        }
        return;

      case "WhileStatement": {
        let count = 0;

        while (this.truthy(this.evaluate(node.condition))) {
          if (++count > this.maxLoopIterations) {
            throw new RuntimeError("Vong lap vuot gioi han.");
          }

          this.executeBlock(
            node.body,
            new Environment(this.environment)
          );
        }
        return;
      }

      case "RepeatStatement": {
        const count = this.evaluate(node.count);

        if (typeof count !== "number" || count < 0) {
          throw new RuntimeError("So lan lap khong hop le.");
        }

        if (count > this.maxLoopIterations) {
          throw new RuntimeError("So lan lap vuot gioi han.");
        }

        for (let i = 0; i < Math.floor(count); i++) {
          this.executeBlock(
            node.body,
            new Environment(this.environment)
          );
        }
        return;
      }

      case "ForEachStatement": {
        const iterable = this.evaluate(node.iterable);

        if (!Array.isArray(iterable) && typeof iterable !== "string") {
          throw new RuntimeError("Doi tuong lap phai la mang hoac chuoi.");
        }

        let count = 0;

        for (const value of iterable) {
          if (++count > this.maxLoopIterations) {
            throw new RuntimeError("Vong lap vuot gioi han.");
          }

          const local = new Environment(this.environment);
          local.define(node.variable, value);
          this.executeBlock(node.body, local);
        }
        return;
      }

      case "ReturnStatement":
        throw new ReturnSignal(
          node.value ? this.evaluate(node.value) : null
        );

      case "PrintStatement":
        this.evaluate({
          type: "CallExpression",
          callee: { type: "Identifier", name: "in" },
          arguments: node.arguments
        });
        return;

      case "ExpressionStatement":
        this.evaluate(node.expression);
        return;

      case "BlockStatement":
        this.executeBlock(
          node.body,
          new Environment(this.environment)
        );
        return;

      default:
        throw new RuntimeError(
          `Chua ho tro cau lenh '${node.type}'.`
        );
    }
  }

  evaluate(node) {
    switch (node.type) {
      case "Literal":
        return node.value;

      case "Identifier":
        return this.environment.get(node.name);

      case "GroupingExpression":
        return this.evaluate(node.expression);

      case "ArrayExpression":
        return node.elements.map(x => this.evaluate(x));
      case "ObjectExpression": {
        const object = Object.create(null);

        for (const property of node.properties) {
          object[property.key] = this.evaluate(property.value);
        }

        return object;
      }

      case "MemberExpression": {
        const object = this.evaluate(node.object);

        if (object === null || object === undefined) {
          throw new RuntimeError("Khong the truy cap thuoc tinh.");
        }

        return object[node.property];
      }

      case "IndexExpression": {
        const object = this.evaluate(node.object);
        const index = this.evaluate(node.index);

        if (object === null || object === undefined) {
          throw new RuntimeError("Khong the truy cap phan tu.");
        }

        return object[index];
      }

      case "UnaryExpression": {
        const value = this.evaluate(node.argument);

        if (node.operator === "-") {
          this.requireNumber(value);
          return -value;
        }

        if (node.operator === "khong") {
          return !this.truthy(value);
        }

        throw new RuntimeError("Toan tu khong hop le.");
      }

      case "BinaryExpression":
        return this.binary(node);

      case "LogicalExpression": {
        const left = this.evaluate(node.left);

        if (node.operator === "va") {
          return this.truthy(left) &&
            this.truthy(this.evaluate(node.right));
        }

        if (node.operator === "hoac") {
          return this.truthy(left) ||
            this.truthy(this.evaluate(node.right));
        }

        throw new RuntimeError("Toan tu logic khong hop le.");
      }

      case "AssignmentExpression": {
        const current = this.evaluate(node.target);
        const right = this.evaluate(node.value);
        let result;

        if (node.operator === "=") {
          result = right;
        } else {
          const operator = node.operator[0];

          if (operator === "+" &&
              (typeof current === "string" ||
               typeof right === "string")) {
            result = display(current) + display(right);
          } else {
            this.requireNumber(current);
            this.requireNumber(right);

            if (operator === "+") result = current + right;
            else if (operator === "-") result = current - right;
            else if (operator === "*") result = current * right;
            else if (operator === "/") {
              if (right === 0) throw new RuntimeError("Khong the chia cho 0.");
              result = current / right;
            } else {
              throw new RuntimeError("Toan tu gan khong hop le.");
            }
          }
        }

        this.writeTarget(node.target, result);
        return result;
      }

      case "CallExpression": {
        const callable = node.callee.type === "Identifier"
          ? this.environment.get(node.callee.name)
          : this.evaluate(node.callee);

        if (typeof callable !== "function") {
          throw new RuntimeError("Doi tuong khong phai ham.");
        }

        const args = node.arguments.map(x => this.evaluate(x));
        return callable(...args);
      }

      default:
        throw new RuntimeError(
          `Chua ho tro bieu thuc '${node.type}'.`
        );
    }
  }

  writeTarget(target, value) {
    if (target.type === "Identifier") {
      this.environment.assign(target.name, value);
      return;
    }

    if (target.type === "MemberExpression") {
      const object = this.evaluate(target.object);

      if (object === null || typeof object !== "object") {
        throw new RuntimeError("Khong the thay doi thuoc tinh.");
      }

      object[target.property] = value;
      return;
    }

    if (target.type === "IndexExpression") {
      const object = this.evaluate(target.object);
      const index = this.evaluate(target.index);

      if (object === null || typeof object !== "object") {
        throw new RuntimeError("Khong the thay doi phan tu.");
      }

      object[index] = value;
      return;
    }

    throw new RuntimeError("Vi tri gan gia tri khong hop le.");
  }

  binary(node) {
    const left = this.evaluate(node.left);
    const right = this.evaluate(node.right);

    switch (node.operator) {
      case "+":
        if (typeof left === "string" || typeof right === "string") {
          return display(left) + display(right);
        }
        this.requireNumber(left);
        this.requireNumber(right);
        return left + right;

      case "-":
      case "*":
      case "/":
      case "%":
        this.requireNumber(left);
        this.requireNumber(right);

        if ((node.operator === "/" || node.operator === "%") &&
            right === 0) {
          throw new RuntimeError("Khong the chia cho 0.");
        }

        if (node.operator === "-") return left - right;
        if (node.operator === "*") return left * right;
        if (node.operator === "/") return left / right;
        return left % right;

      case "==": return left === right;
      case "!=": return left !== right;
      case ">": return left > right;
      case ">=": return left >= right;
      case "<": return left < right;
      case "<=": return left <= right;

      default:
        throw new RuntimeError("Toan tu khong duoc ho tro.");
    }
  }

  requireNumber(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new RuntimeError("Phep tinh yeu cau gia tri so.");
    }
  }

  truthy(value) {
    return value !== false &&
      value !== null &&
      value !== undefined &&
      value !== 0 &&
      value !== "";
  }
}

export function interpret(program, options = {}) {
  return new Interpreter(options).interpret(program);
}
