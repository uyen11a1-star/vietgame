import { Token } from "./token.js";

export class LexerError extends Error {
  constructor(message, line, column) {
    super(`VG1001 at ${line}:${column}: ${message}`);
    this.name = "LexerError";
    this.line = line;
    this.column = column;
  }
}

const KEYWORDS = new Set([
  "bien", "so", "thuc", "chuoi", "logic", "kyTu", "mang",
  "doiTuong", "tuDien", "tapHop", "tuyChon", "rong",
  "that", "sai",
  "neu", "nguocLai", "va", "hoac", "khong",
  "lap", "lan", "cho", "moi", "trong", "trongKhi",
  "ham", "traVe", "lop", "thuocTinh",
  "nhap", "xuat",
  "trochoi", "manhinh", "nhanvat",
  "khi", "batDau", "moi", "khungHinh",
  "hienThi", "in"
]);

const OPERATORS = [
  ["==", "EQUAL_EQUAL"], ["!=", "BANG_EQUAL"],
  [">=", "GREATER_EQUAL"], ["<=", "LESS_EQUAL"],
  ["+=", "PLUS_EQUAL"], ["-=", "MINUS_EQUAL"],
  ["*=", "STAR_EQUAL"], ["/=", "SLASH_EQUAL"],
  ["++", "PLUS_PLUS"], ["--", "MINUS_MINUS"],
  ["->", "ARROW"],
  ["+", "PLUS"], ["-", "MINUS"], ["*", "STAR"],
  ["/", "SLASH"], ["%", "PERCENT"], ["=", "EQUAL"],
  [">", "GREATER"], ["<", "LESS"],
  ["(", "LEFT_PAREN"], [")", "RIGHT_PAREN"],
  ["[", "LEFT_BRACKET"], ["]", "RIGHT_BRACKET"],
  ["{", "LEFT_BRACE"], ["}", "RIGHT_BRACE"],
  [":", "COLON"], [",", "COMMA"], [".", "DOT"]
];

export class Lexer {
  constructor(source) {
    this.source = String(source ?? "").replace(/\r\n?/g, "\n");
    this.tokens = [];
    this.index = 0;
    this.line = 1;
    this.column = 1;
    this.lineStart = true;
    this.indents = [0];
    this.delimiterDepth = 0;
    this.atLineHasCode = false;
  }

  scanTokens() {
    while (!this.isAtEnd()) {
      if (this.lineStart && this.delimiterDepth === 0) {
        this.scanIndentation();
        if (this.isAtEnd()) break;
        if (this.peek() === "\n") {
          this.advance();
          this.lineStart = true;
          continue;
        }
        if (this.peek() === "#") {
          this.skipComment();
          continue;
        }
      }

      const c = this.peek();

      if (c === " " || c === "\t") {
        if (c === "\t" && this.lineStart) {
          this.error("Khong duoc dung tab de thut dau dong; hay dung 4 dau cach.");
        }
        this.advance();
      } else if (c === "\n") {
        const line = this.line;
        const col = this.column;
        this.advance();
        if (this.delimiterDepth === 0 && this.atLineHasCode) {
          this.add("NEWLINE", "", null, line, col);
        }
        this.lineStart = true;
        this.atLineHasCode = false;
      } else if (c === "#") {
        this.skipComment();
      } else {
        this.lineStart = false;
        this.scanToken();
        this.atLineHasCode = true;
      }
    }

    if (this.atLineHasCode) {
      this.add("NEWLINE", "", null, this.line, this.column);
    }

    while (this.indents.length > 1) {
      this.indents.pop();
      this.add("DEDENT", "", null, this.line, this.column);
    }
    this.add("EOF", "", null, this.line, this.column);
    return this.tokens;
  }

  scanIndentation() {
    const startLine = this.line;
    const startColumn = this.column;
    let width = 0;

    while (!this.isAtEnd() && (this.peek() === " " || this.peek() === "\t")) {
      if (this.peek() === "\t") {
        this.error("Khong duoc dung tab de thut dau dong; hay dung 4 dau cach.");
      }
      this.advance();
      width++;
    }

    // Blank lines and comment-only lines do not change indentation.
    if (this.isAtEnd() || this.peek() === "\n" || this.peek() === "#") {
      return;
    }

    const current = this.indents[this.indents.length - 1];
    if (width > current) {
      if (width - current !== 4) {
        this.errorAt("Moi cap thut dau dong phai tang dung 4 dau cach.", startLine, startColumn);
      }
      this.indents.push(width);
      this.add("INDENT", "", width, startLine, startColumn);
    } else if (width < current) {
      while (this.indents.length > 1 && width < this.indents[this.indents.length - 1]) {
        this.indents.pop();
        this.add("DEDENT", "", null, startLine, startColumn);
      }
      if (width !== this.indents[this.indents.length - 1]) {
        this.errorAt("Muc thut dau dong khong khop voi khoi lenh truoc do.", startLine, startColumn);
      }
    }
    this.lineStart = false;
  }

  scanToken() {
    this.tokenStart = this.index;
    const startLine = this.line;
    const startColumn = this.column;
    const c = this.advance();

    if (/[A-Za-z_]/.test(c)) {
      while (/[A-Za-z0-9_]/.test(this.peek())) this.advance();
      const text = this.source.slice(this.tokenStart, this.index);
      this.add(KEYWORDS.has(text) ? "KEYWORD" : "IDENTIFIER", text, text, startLine, startColumn);
      return;
    }

    if (/[0-9]/.test(c)) {
      while (/[0-9]/.test(this.peek())) this.advance();
      if (this.peek() === "." && /[0-9]/.test(this.peekNext())) {
        this.advance();
        while (/[0-9]/.test(this.peek())) this.advance();
      }
      const text = this.source.slice(this.tokenStart, this.index);
      this.add("NUMBER", text, Number(text), startLine, startColumn);
      return;
    }

    if (c === '"' || c === "'") {
      this.scanString(c, startLine, startColumn);
      return;
    }

    const rest = this.source.slice(this.index - 1);
    for (const [operator, type] of OPERATORS) {
      if (rest.startsWith(operator)) {
        for (let i = 1; i < operator.length; i++) this.advance();
        if (["LEFT_PAREN", "LEFT_BRACKET", "LEFT_BRACE"].includes(type)) this.delimiterDepth++;
        if (["RIGHT_PAREN", "RIGHT_BRACKET", "RIGHT_BRACE"].includes(type)) {
          this.delimiterDepth--;
          if (this.delimiterDepth < 0) this.errorAt("Dau dong ngoac khong co cap.", startLine, startColumn);
        }
        this.add(type, operator, operator, startLine, startColumn);
        return;
      }
    }

    this.errorAt(`Ky tu khong hop le: '${c}'.`, startLine, startColumn);
  }

  scanString(quote, startLine, startColumn) {
    let value = "";
    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === "\n") {
        this.errorAt("Chuoi khong duoc xuong dong.", startLine, startColumn);
      }
      if (this.peek() === "\\") {
        this.advance();
        if (this.isAtEnd()) break;
        const escaped = this.advance();
        const map = { n: "\n", t: "\t", r: "\r", "\\": "\\", '"': '"', "'": "'" };
        value += map[escaped] ?? escaped;
      } else {
        value += this.advance();
      }
    }
    if (this.isAtEnd()) {
      this.errorAt("Chuoi chua duoc dong.", startLine, startColumn);
    }
    this.advance(); // closing quote
    const lexeme = this.source.slice(this.tokenStart, this.index);
    this.add("STRING", lexeme, value, startLine, startColumn);
  }

  skipComment() {
    if (this.peek() === "#" && this.peekNext() === "#" && this.source[this.index + 2] === "#") {
      this.advance(); this.advance(); this.advance();
      while (!this.isAtEnd()) {
        if (this.peek() === "#" && this.peekNext() === "#" && this.source[this.index + 2] === "#") {
          this.advance(); this.advance(); this.advance();
          return;
        }
        this.advance();
      }
      this.error("Chu thich nhieu dong chua duoc dong bang ###.");
    }
    while (!this.isAtEnd() && this.peek() !== "\n") this.advance();
  }

  add(type, lexeme, literal, line = this.line, column = this.column) {
    this.tokens.push(new Token(type, lexeme, literal, line, column));
  }

  advance() {
    const c = this.source[this.index++];
    if (c === "\n") {
      this.line++;
      this.column = 1;
      this.lineStart = true;
    } else {
      this.column++;
    }
    return c;
  }

  peek() { return this.source[this.index] ?? "\0"; }
  peekNext() { return this.source[this.index + 1] ?? "\0"; }
  isAtEnd() { return this.index >= this.source.length; }

  error(message) { this.errorAt(message, this.line, this.column); }
  errorAt(message, line, column) { throw new LexerError(message, line, column); }

  // Captured immediately before scanning each token.
  get tokenStart() { return this._tokenStart ?? this.index; }
  set tokenStart(value) { this._tokenStart = value; }
}

export function tokenize(source) {
  return new Lexer(source).scanTokens();
}
