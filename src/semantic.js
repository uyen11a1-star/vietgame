export class SemanticError extends Error {
  constructor(diagnostics) {
    super(diagnostics.map(d => `${d.code}: ${d.message}`).join("\n"));
    this.name = "SemanticError";
    this.diagnostics = diagnostics;
  }
}

const BUILTINS = new Map([
  ["in", { params: null, returns: "rong" }],
  ["xoaManHinh", { params: ["chuoi"], returns: "rong" }],
  ["veChuNhat", { params: ["thuc", "thuc", "thuc", "thuc", "chuoi"], returns: "rong" }],
  ["veHinhTron", { params: ["thuc", "thuc", "thuc", "chuoi"], returns: "rong" }],
  ["veChu", { params: ["chuoi", "thuc", "thuc", "thuc", "chuoi"], returns: "rong" }],
  ["taoNhanVat", { params: ["thuc", "thuc", "thuc", "thuc", "chuoi"], returns: "doiTuong" }],
  ["diChuyen", { params: ["doiTuong", "thuc", "thuc"], returns: "doiTuong" }],
  ["veNhanVat", { params: ["doiTuong"], returns: "rong" }],
  ["phimDangNhan", { params: ["chuoi"], returns: "logic" }],
  ["chuotDangNhan", { params: ["chuoi"], returns: "logic" }],
  ["viTriChuotX", { params: [], returns: "thuc" }],
  ["viTriChuotY", { params: [], returns: "thuc" }],
  ["ngonTayDangCham", { params: [], returns: "logic" }],
  ["viTriChamX", { params: [], returns: "thuc" }],
  ["viTriChamY", { params: [], returns: "thuc" }],
  ["soNgonTayDangCham", { params: [], returns: "so" }],
  ["vaCham", { params: ["doiTuong", "doiTuong"], returns: "logic" }],
  ["dungGame", { params: [], returns: "rong" }],
  ["chayGame", { params: [], returns: "rong" }],
  ["huyGame", { params: [], returns: "rong" }],
]);
const KNOWN_TYPES = new Set(["so", "thuc", "chuoi", "logic", "kyTu", "mang", "doiTuong", "tuDien", "tapHop", "tuyChon", "rong"]);

class Scope {
  constructor(parent = null) { this.parent = parent; this.symbols = new Map(); }
  define(name, symbol) {
    if (this.symbols.has(name)) return false;
    this.symbols.set(name, symbol); return true;
  }
  get(name) { return this.symbols.get(name) ?? this.parent?.get(name) ?? null; }
}

export class SemanticAnalyzer {
  constructor() {
    this.diagnostics = [];
    this.scope = new Scope();
    this.functionStack = [];
  }

  analyze(program) {
    this.diagnostics = [];
    this.scope = new Scope();
    this.visitStatements(program.body ?? []);
    return { type: "SemanticResult", ok: this.diagnostics.length === 0, diagnostics: this.diagnostics };
  }

  visitStatements(statements) {
    // Dang ky truoc cac ham trong pham vi hien tai.
    for (const node of statements) {
      if (node.type !== "FunctionDeclaration") continue;

      if (!this.scope.define(node.name, {
        kind: "function",
        params: node.params,
        returnType: node.returnType ?? "khong_ro"
      })) {
        this.report("VG3001", `Ten '${node.name}' da duoc khai bao trong pham vi nay.`);
      }
    }

    for (const node of statements) this.visitStatement(node);
  }

  report(code, message) { this.diagnostics.push({ code, message }); }
  withScope(callback) {
    const previous = this.scope; this.scope = new Scope(previous);
    try { callback(); } finally { this.scope = previous; }
  }
  define(name, symbol) {
    if (!this.scope.define(name, symbol)) this.report("VG3001", `Ten '${name}' da duoc khai bao trong pham vi nay.`);
  }
  lookup(name) {
    const symbol = this.scope.get(name);
    if (!symbol) this.report("VG3002", `Khong tim thay bien hoac ham '${name}'.`);
    return symbol;
  }
  normalize(type) { return type ?? "khong_ro"; }
  compatible(expected, actual) {
    if (!expected || expected === "khong_ro" || actual === "khong_ro") return true;
    if (expected === actual) return true;
    if (expected === "thuc" && actual === "so") return true;
    if (expected === "tuyChon" && actual === "rong") return true;
    return false;
  }
  checkType(type, context) {
    if (type && !KNOWN_TYPES.has(type) && !this.scope.get(type)) {
      this.report("VG3003", `Kieu du lieu '${type}' trong ${context} chua duoc dinh nghia.`);
    }
  }

  visitStatement(node) {
    switch (node.type) {
      case "GameDeclaration": return;
      case "VariableDeclaration": {
        this.checkType(node.declaredType, `bien '${node.name}'`);
        const actual = node.initializer ? this.visitExpression(node.initializer) : "khong_ro";
        if (node.declaredType && !this.compatible(node.declaredType, actual)) {
          this.report("VG3004", `Bien '${node.name}' co kieu '${node.declaredType}' nhung gia tri khoi tao co kieu '${actual}'.`);
        }
        this.define(node.name, { kind: "variable", type: node.declaredType ?? actual, mutable: true });
        return;
      }
      case "FunctionDeclaration": {
        const symbol = this.scope.get(node.name);
        const previousScope = this.scope;
        this.scope = new Scope(previousScope);
        for (const param of node.params) {
          this.checkType(param.declaredType, `tham so '${param.name}'`);
          this.define(param.name, { kind: "variable", type: param.declaredType ?? "khong_ro", mutable: true });
        }
        this.functionStack.push({ name: node.name, returnType: node.returnType ?? "khong_ro" });
        this.visitStatements(node.body);
        this.functionStack.pop();
        this.scope = previousScope;
        if (symbol) symbol.returnType = node.returnType ?? "khong_ro";
        return;
      }
      case "ClassDeclaration":
        this.define(node.name, { kind: "class", type: node.name });
        this.withScope(() => this.visitStatements(node.body));
        return;
      case "IfStatement":
        this.requireBoolean(this.visitExpression(node.condition), "dieu kien neu");
        this.withScope(() => this.visitStatements(node.thenBranch));
        if (node.elseBranch) this.withScope(() => this.visitStatements(node.elseBranch));
        return;
      case "WhileStatement":
        this.requireBoolean(this.visitExpression(node.condition), "dieu kien trongKhi");
        this.withScope(() => this.visitStatements(node.body));
        return;
      case "RepeatStatement": {
        const t = this.visitExpression(node.count);
        if (t !== "so" && t !== "thuc" && t !== "khong_ro") this.report("VG3005", `So lan lap phai la so, khong phai '${t}'.`);
        this.withScope(() => this.visitStatements(node.body));
        return;
      }
      case "ForEachStatement":
        this.visitExpression(node.iterable);
        this.withScope(() => {
          this.define(node.variable, { kind: "variable", type: "khong_ro", mutable: false });
          this.visitStatements(node.body);
        });
        return;
      case "ReturnStatement": {
        if (!this.functionStack.length) {
          this.report("VG3006", "Lenh 'traVe' chi duoc dung ben trong ham.");
          if (node.value) this.visitExpression(node.value);
          return;
        }
        const actual = node.value ? this.visitExpression(node.value) : "rong";
        const expected = this.functionStack[this.functionStack.length - 1].returnType;
        if (!this.compatible(expected, actual)) this.report("VG3007", `Ham '${this.functionStack[this.functionStack.length - 1].name}' yeu cau tra ve '${expected}' nhung nhan '${actual}'.`);
        return;
      }
      case "PrintStatement": node.arguments.forEach(a => this.visitExpression(a)); return;
      case "ExpressionStatement": this.visitExpression(node.expression); return;
      case "BlockStatement": this.withScope(() => node.body.forEach(s => this.visitStatement(s))); return;
      default: this.report("VG3099", `Chua ho tro kiem tra node '${node.type}'.`);
    }
  }

  requireBoolean(type, context) {
    if (type !== "logic" && type !== "khong_ro") this.report("VG3008", `${context} can gia tri logic, nhung nhan '${type}'.`);
  }

  visitExpression(node) {
    if (!node) return "rong";
    switch (node.type) {
      case "Literal":
        if (node.value === null) return "rong";
        if (typeof node.value === "boolean") return "logic";
        if (typeof node.value === "number") return Number.isInteger(node.value) ? "so" : "thuc";
        if (typeof node.value === "string") return "chuoi";
        return "khong_ro";
      case "Identifier": {
        const symbol = this.lookup(node.name);
        if (symbol?.kind === "function") return "ham";
        if (symbol?.kind === "class") return symbol.type;
        return symbol?.type ?? "khong_ro";
      }
      case "GroupingExpression": return this.visitExpression(node.expression);
      case "ArrayExpression": {
        node.elements.forEach(e => this.visitExpression(e)); return "mang";
      }
      case "ObjectExpression": {
        node.properties.forEach(p => this.visitExpression(p.value)); return "doiTuong";
      }
      case "UnaryExpression": {
        const t = this.visitExpression(node.argument);
        if (node.operator === "khong") { this.requireBoolean(t, "Toan tu khong"); return "logic"; }
        if (t !== "so" && t !== "thuc" && t !== "khong_ro") this.report("VG3009", `Toan tu '${node.operator}' can gia tri so.`);
        return t;
      }
      case "LogicalExpression": {
        this.requireBoolean(this.visitExpression(node.left), `Ve trai cua '${node.operator}'`);
        this.requireBoolean(this.visitExpression(node.right), `Ve phai cua '${node.operator}'`);
        return "logic";
      }
      case "BinaryExpression": {
        const left = this.visitExpression(node.left), right = this.visitExpression(node.right);
        if (["==", "!="].includes(node.operator)) return "logic";
        if ([">", ">=", "<", "<="].includes(node.operator)) {
          const numeric = ["so", "thuc", "khong_ro"].includes(left) && ["so", "thuc", "khong_ro"].includes(right);
          if (!numeric && !(left === "chuoi" && right === "chuoi")) this.report("VG3010", `Khong the so sanh '${left}' va '${right}' bang '${node.operator}'.`);
          return "logic";
        }
        if (node.operator === "+" && left === "chuoi" && right === "chuoi") return "chuoi";
        if (!["so", "thuc", "khong_ro"].includes(left) || !["so", "thuc", "khong_ro"].includes(right)) {
          this.report("VG3011", `Toan tu '${node.operator}' can hai gia tri so hoac hai chuoi voi phep '+'.`);
          return "khong_ro";
        }
        return left === "thuc" || right === "thuc" ? "thuc" : "so";
      }
      case "AssignmentExpression": {
        const valueType = this.visitExpression(node.value);
        if (node.target.type === "Identifier") {
          const symbol = this.lookup(node.target.name);
          if (symbol?.kind === "function" || symbol?.kind === "class") this.report("VG3012", `Khong the gan gia tri cho '${node.target.name}'.`);
          else if (symbol && !this.compatible(symbol.type, valueType)) this.report("VG3004", `Khong the gan '${valueType}' cho bien '${node.target.name}' co kieu '${symbol.type}'.`);
        } else this.visitExpression(node.target);
        return valueType;
      }
      case "CallExpression": {
        let symbol = null;
        if (node.callee.type === "Identifier") {
          symbol = this.scope.get(node.callee.name);
          if (!symbol && BUILTINS.has(node.callee.name)) symbol = { ...BUILTINS.get(node.callee.name), kind: "builtin" };
          if (!symbol) this.report("VG3002", `Khong tim thay ham '${node.callee.name}'.`);
          else if (symbol.kind !== "function" && symbol.kind !== "builtin") this.report("VG3013", `'${node.callee.name}' khong phai la ham.`);
        } else this.visitExpression(node.callee);
        const argTypes = node.arguments.map(a => this.visitExpression(a));
        if (symbol?.kind === "function") {
          if (argTypes.length !== symbol.params.length) this.report("VG3014", `Ham '${node.callee.name}' can ${symbol.params.length} doi so nhung nhan ${argTypes.length}.`);
          symbol.params.forEach((param, i) => {
            if (argTypes[i] && param.declaredType && !this.compatible(param.declaredType, argTypes[i])) this.report("VG3015", `Doi so ${i+1} cua ham '${node.callee.name}' can '${param.declaredType}' nhung nhan '${argTypes[i]}'.`);
          });
          return symbol.returnType ?? "khong_ro";
        }
        if (symbol?.kind === "builtin" && symbol.params) {
          if (argTypes.length !== symbol.params.length) {
            this.report("VG3014", `Ham '${node.callee.name}' can ${symbol.params.length} doi so nhung nhan ${argTypes.length}.`);
          }

          symbol.params.forEach((expected, i) => {
            if (argTypes[i] && !this.compatible(expected, argTypes[i])) {
              this.report("VG3015", `Doi so ${i + 1} cua ham '${node.callee.name}' can '${expected}' nhung nhan '${argTypes[i]}'.`);
            }
          });
        }
        return symbol?.returns ?? "khong_ro";
      }
      case "MemberExpression": this.visitExpression(node.object); return "khong_ro";
      case "IndexExpression":
        this.visitExpression(node.object);
        const indexType = this.visitExpression(node.index);
        if (indexType !== "so" && indexType !== "khong_ro") this.report("VG3016", "Chi so mang phai la so.");
        return "khong_ro";
      default: this.report("VG3099", `Chua ho tro bieu thuc '${node.type}'.`); return "khong_ro";
    }
  }
}

export function analyze(program) { return new SemanticAnalyzer().analyze(program); }
