export class ParserError extends Error {
  constructor(message, token) {
    super(`VG2001 at ${token?.line ?? 1}:${token?.column ?? 1}: ${message}`);
    this.name = "ParserError";
    this.line = token?.line ?? 1;
    this.column = token?.column ?? 1;
  }
}

const TYPE_WORDS = new Set(["so", "thuc", "chuoi", "logic", "kyTu", "mang", "doiTuong", "tuDien", "tapHop", "tuyChon"]);

export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.current = 0;
  }

  parse() {
    const statements = [];
    this.skipSeparators();
    while (!this.isAtEnd()) {
      statements.push(this.declarationOrStatement());
      this.skipSeparators();
    }
    return { type: "Program", body: statements };
  }

  declarationOrStatement() {
    if (this.matchKeyword("bien")) return this.variableDeclaration(null);
    if (this.check("KEYWORD") && TYPE_WORDS.has(this.peek().lexeme)) {
      const typeToken = this.advance();
      return this.variableDeclaration(typeToken.lexeme);
    }
    if (this.matchKeyword("ham")) return this.functionDeclaration();
    if (this.matchKeyword("lop")) return this.classDeclaration();
    return this.statement();
  }

  variableDeclaration(declaredType) {
    const name = this.consume("IDENTIFIER", "Can ten bien sau tu khoa khai bao.");
    let typeName = declaredType;
    if (this.match("COLON")) {
      typeName = this.consumeTypeName();
    }
    let initializer = null;
    if (this.match("EQUAL")) initializer = this.expression();
    if (!initializer && !typeName) {
      throw new ParserError("Bien can co gia tri khoi tao hoac kieu du lieu.", this.peek());
    }
    this.consumeLineEnd();
    return { type: "VariableDeclaration", name: name.lexeme, declaredType: typeName, initializer };
  }

  functionDeclaration() {
    const name = this.consume("IDENTIFIER", "Can ten ham.");
    this.consume("LEFT_PAREN", "Can '(' sau ten ham.");
    const params = [];
    if (!this.check("RIGHT_PAREN")) {
      do {
        const param = this.consume("IDENTIFIER", "Can ten tham so.");
        let paramType = null;
        if (this.match("COLON")) paramType = this.consumeTypeName();
        params.push({ name: param.lexeme, declaredType: paramType });
      } while (this.match("COMMA"));
    }
    this.consume("RIGHT_PAREN", "Can ')' sau danh sach tham so.");
    let returnType = null;
    if (this.match("ARROW")) returnType = this.consumeTypeName();
    this.consume("COLON", "Can ':' truoc than ham.");
    const body = this.block();
    return { type: "FunctionDeclaration", name: name.lexeme, params, returnType, body };
  }

  classDeclaration() {
    const name = this.consume("IDENTIFIER", "Can ten lop.");
    this.consume("COLON", "Can ':' truoc than lop.");
    const body = this.block();
    return { type: "ClassDeclaration", name: name.lexeme, body };
  }

  statement() {
    if (this.matchKeyword("neu")) return this.ifStatement();
    if (this.matchKeyword("trongKhi")) return this.whileStatement();
    if (this.matchKeyword("lap")) return this.repeatStatement();
    if (this.matchKeyword("cho")) return this.forEachStatement();
    if (this.matchKeyword("traVe")) return this.returnStatement();
    if (this.matchKeyword("in")) return this.printStatement();
    if (this.matchKeyword("trochoi")) return this.gameDeclaration();
    if (this.match("LEFT_BRACE")) return this.objectOrBlockFromBrace();
    return this.expressionStatement();
  }

  ifStatement() {
    const condition = this.expression();
    this.consume("COLON", "Can ':' sau dieu kien neu.");
    const thenBranch = this.block();
    let elseBranch = null;
    this.skipSeparators();
    if (this.matchKeyword("nguocLai")) {
      this.consume("COLON", "Can ':' sau nguocLai.");
      elseBranch = this.block();
    }
    return { type: "IfStatement", condition, thenBranch, elseBranch };
  }

  whileStatement() {
    const condition = this.expression();
    this.consume("COLON", "Can ':' sau dieu kien trongKhi.");
    return { type: "WhileStatement", condition, body: this.block() };
  }

  repeatStatement() {
    const count = this.expression();
    this.consumeKeyword("lan", "Can tu khoa 'lan' sau so lan lap.");
    this.consume("COLON", "Can ':' sau khai bao vong lap.");
    return { type: "RepeatStatement", count, body: this.block() };
  }

  forEachStatement() {
    this.consumeKeyword("moi", "Can tu khoa 'moi' sau 'cho'.");
    const variable = this.consume("IDENTIFIER", "Can ten bien lap.");
    this.consumeKeyword("trong", "Can tu khoa 'trong' trong vong lap.");
    const iterable = this.expression();
    this.consume("COLON", "Can ':' truoc than vong lap.");
    return { type: "ForEachStatement", variable: variable.lexeme, iterable, body: this.block() };
  }

  returnStatement() {
    let value = null;
    if (!this.check("NEWLINE") && !this.check("DEDENT") && !this.check("EOF")) value = this.expression();
    this.consumeLineEnd();
    return { type: "ReturnStatement", value };
  }

  gameDeclaration() {
    const title = this.consume("STRING", "Can ten tro choi dang chuoi sau trochoi.");
    this.consumeLineEnd();
    return { type: "GameDeclaration", name: title.literal };
  }

  printStatement() {
    this.consume("LEFT_PAREN", "Can '(' sau in.");
    const args = this.argumentList("RIGHT_PAREN");
    this.consume("RIGHT_PAREN", "Can ')' sau doi so in.");
    this.consumeLineEnd();
    return { type: "PrintStatement", arguments: args };
  }

  expressionStatement() {
    const expr = this.expression();
    this.consumeLineEnd();
    return { type: "ExpressionStatement", expression: expr };
  }

  block() {
    this.skipNewlines();
    this.consume("INDENT", "Can khoi lenh thut vao 4 dau cach.");
    const body = [];
    this.skipSeparators();
    while (!this.check("DEDENT") && !this.isAtEnd()) {
      body.push(this.declarationOrStatement());
      this.skipSeparators();
    }
    this.consume("DEDENT", "Khoi lenh chua duoc dong dung.");
    return body;
  }

  objectOrBlockFromBrace() {
    // Braced blocks are reserved for later syntax; parse as a simple block for now.
    const body = [];
    while (!this.check("RIGHT_BRACE") && !this.isAtEnd()) {
      this.skipSeparators();
      if (this.check("RIGHT_BRACE")) break;
      body.push(this.declarationOrStatement());
    }
    this.consume("RIGHT_BRACE", "Can '}' de dong khoi.");
    return { type: "BlockStatement", body };
  }

  expression() { return this.assignment(); }

  assignment() {
    const expr = this.logicalOr();
    if (this.match("EQUAL", "PLUS_EQUAL", "MINUS_EQUAL", "STAR_EQUAL", "SLASH_EQUAL")) {
      const operator = this.previous().lexeme;
      const value = this.assignment();
      if (expr.type !== "Identifier" && expr.type !== "MemberExpression" && expr.type !== "IndexExpression") {
        throw new ParserError("Ve trai phep gan phai la mot bien hoac vi tri co the gan.", this.previous());
      }
      return { type: "AssignmentExpression", target: expr, operator, value };
    }
    return expr;
  }

  logicalOr() {
    let expr = this.logicalAnd();
    while (this.matchKeyword("hoac")) {
      const operator = this.previous().lexeme;
      expr = { type: "LogicalExpression", operator, left: expr, right: this.logicalAnd() };
    }
    return expr;
  }

  logicalAnd() {
    let expr = this.equality();
    while (this.matchKeyword("va")) {
      const operator = this.previous().lexeme;
      expr = { type: "LogicalExpression", operator, left: expr, right: this.equality() };
    }
    return expr;
  }

  equality() {
    let expr = this.comparison();
    while (this.match("EQUAL_EQUAL", "BANG_EQUAL")) {
      const operator = this.previous().lexeme;
      expr = { type: "BinaryExpression", operator, left: expr, right: this.comparison() };
    }
    return expr;
  }

  comparison() {
    let expr = this.term();
    while (this.match("GREATER", "GREATER_EQUAL", "LESS", "LESS_EQUAL")) {
      const operator = this.previous().lexeme;
      expr = { type: "BinaryExpression", operator, left: expr, right: this.term() };
    }
    return expr;
  }

  term() {
    let expr = this.factor();
    while (this.match("PLUS", "MINUS")) {
      const operator = this.previous().lexeme;
      expr = { type: "BinaryExpression", operator, left: expr, right: this.factor() };
    }
    return expr;
  }

  factor() {
    let expr = this.unary();
    while (this.match("STAR", "SLASH", "PERCENT")) {
      const operator = this.previous().lexeme;
      expr = { type: "BinaryExpression", operator, left: expr, right: this.unary() };
    }
    return expr;
  }

  unary() {
    if (this.match("MINUS") || this.matchKeyword("khong")) {
      const operator = this.previous().lexeme;
      return { type: "UnaryExpression", operator, argument: this.unary() };
    }
    return this.call();
  }

  call() {
    let expr = this.primary();
    while (true) {
      if (this.match("LEFT_PAREN")) {
        const args = this.argumentList("RIGHT_PAREN");
        this.consume("RIGHT_PAREN", "Can ')' sau doi so.");
        expr = { type: "CallExpression", callee: expr, arguments: args };
      } else if (this.match("DOT")) {
        const property = this.consume("IDENTIFIER", "Can ten thuoc tinh sau dau cham.");
        expr = { type: "MemberExpression", object: expr, property: property.lexeme };
      } else if (this.match("LEFT_BRACKET")) {
        const index = this.expression();
        this.consume("RIGHT_BRACKET", "Can ']' sau chi so.");
        expr = { type: "IndexExpression", object: expr, index };
      } else break;
    }
    return expr;
  }

  primary() {
    if (this.match("NUMBER", "STRING")) {
      const token = this.previous();
      return { type: "Literal", value: token.literal, raw: token.lexeme };
    }
    if (this.matchKeyword("that")) return { type: "Literal", value: true, raw: "that" };
    if (this.matchKeyword("sai")) return { type: "Literal", value: false, raw: "sai" };
    if (this.matchKeyword("rong")) return { type: "Literal", value: null, raw: "rong" };
    if (this.match("IDENTIFIER")) return { type: "Identifier", name: this.previous().lexeme };
    if (this.match("LEFT_PAREN")) {
      const expr = this.expression();
      this.consume("RIGHT_PAREN", "Can ')' de dong bieu thuc.");
      return { type: "GroupingExpression", expression: expr };
    }
    if (this.match("LEFT_BRACKET")) {
      const elements = [];
      if (!this.check("RIGHT_BRACKET")) {
        do { elements.push(this.expression()); } while (this.match("COMMA"));
      }
      this.consume("RIGHT_BRACKET", "Can ']' de dong mang.");
      return { type: "ArrayExpression", elements };
    }
    if (this.match("LEFT_BRACE")) {
      const properties = [];
      if (!this.check("RIGHT_BRACE")) {
        do {
          const key = this.consume("IDENTIFIER", "Can ten khoa trong doi tuong.");
          this.consume("COLON", "Can ':' sau khoa doi tuong.");
          properties.push({ key: key.lexeme, value: this.expression() });
        } while (this.match("COMMA"));
      }
      this.consume("RIGHT_BRACE", "Can '}' de dong doi tuong.");
      return { type: "ObjectExpression", properties };
    }
    throw new ParserError("Khong tim thay bieu thuc hop le.", this.peek());
  }

  argumentList(endType) {
    const args = [];
    if (!this.check(endType)) {
      do { args.push(this.expression()); } while (this.match("COMMA"));
    }
    return args;
  }

  consumeTypeName() {
    if (this.check("IDENTIFIER") || (this.check("KEYWORD") && TYPE_WORDS.has(this.peek().lexeme))) {
      return this.advance().lexeme;
    }
    throw new ParserError("Can ten kieu du lieu.", this.peek());
  }

  consumeLineEnd() {
    if (this.match("NEWLINE")) return;
    if (this.check("DEDENT") || this.check("EOF")) return;
    throw new ParserError("Can xuong dong sau cau lenh.", this.peek());
  }

  skipSeparators() {
    while (this.match("NEWLINE")) {}
  }
  skipNewlines() { while (this.match("NEWLINE")) {} }

  matchKeyword(word) {
    if (this.check("KEYWORD") && this.peek().lexeme === word) { this.advance(); return true; }
    return false;
  }
  consumeKeyword(word, message) {
    if (this.matchKeyword(word)) return this.previous();
    throw new ParserError(message, this.peek());
  }
  match(...types) {
    for (const type of types) if (this.check(type)) { this.advance(); return true; }
    return false;
  }
  consume(type, message) {
    if (this.check(type)) return this.advance();
    throw new ParserError(message, this.peek());
  }
  check(type) { return !this.isAtEnd() && this.peek().type === type; }
  advance() { if (!this.isAtEnd()) this.current++; return this.previous(); }
  isAtEnd() { return this.peek().type === "EOF"; }
  peek() { return this.tokens[this.current] ?? this.tokens[this.tokens.length - 1]; }
  previous() { return this.tokens[this.current - 1]; }
}

export function parse(tokens) {
  return new Parser(tokens).parse();
}
