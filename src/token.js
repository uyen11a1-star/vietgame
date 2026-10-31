export class Token {
  constructor(type, lexeme, literal, line, column) {
    this.type = type;
    this.lexeme = lexeme;
    this.literal = literal;
    this.line = line;
    this.column = column;
  }

  toString() {
    const value = this.literal === null || this.literal === undefined
      ? ""
      : ` ${JSON.stringify(this.literal)}`;
    return `${this.type} ${JSON.stringify(this.lexeme)}${value} (${this.line}:${this.column})`;
  }
}
