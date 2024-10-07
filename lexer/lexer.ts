interface Position {
  col: number;
  row: number;
}

interface Token {
  kind: TokenKind;
  text: string;
  text_len: number;
  position: Position;
}

// export type SC_TokenType =
//   | "passage_start"
//   | "passage_name"
//   | "passage_tag_start"
//   | "passage_tag_end"
//   | "passage_tag_name"
//   | "passage_meta_start"
//   | "passage_meta_end"
//   | "passage_meta_data"
//   | "sc_tag_start"
//   | "sc_tag_end"
//   | "sc_markup_start"
//   | "sc_markup_end"
//   | "sc_markup_selector"
//   | "sc_markup_content"
//   | "sc_tag_name"
//   | "sc_tag_closing_name"
//   | "sc_variable"
//   | "sc_tag_arg";

enum TokenKind {
  EOF = "end of content",
  INVALID = "invalid token",
  SYMBOL = "symbol",
  PASSAGE = "passage",
  PASSAGE_NAME = "passage name",
  PASSAGE_TAG = "passage tag",
  PASSAGE_META = "passage meta",
  SC_TAG_START = "SC tag start",
  SC_TAG_CLOSE = "SC tag close",
  SC_TAG = "sugar cube tag",
  SC_MARKUP = "sugar cube markup",
  SC_VARIABLE = "sugar cube variable",
  OPEN_CURLY = "open curly",
  CLOSE_CURLY = "close curly",
  COMMENT = "comment",
}

export class Lexer {
  public atlas?: unknown;
  public content: string;
  public content_len: number;
  public cursor: number = 0;
  public line: number = 1;
  public bol: number = 0;
  public x: number = 0;

  constructor(content: string) {
    this.content = content;
    this.content_len = content.length;
  }

  /**
   * Checks if the current cursor position matches the given prefix string.
   * @param prefix the string to check against
   * @returns true if the prefix matches, false if it doesn't
   */
  private startsWith(prefix: string): boolean {
    if (prefix.length === 0) {
      return true;
    }
    if (this.cursor + prefix.length - 1 >= this.content_len) {
      return false;
    }
    for (let i = 0; i < prefix.length; i++) {
      if (prefix[i] !== this.content[this.cursor + i]) {
        return false;
      }
    }
    return true;
  }

  private chopChar(len: number): void {
    for (let i = 0; i < len; i++) {
      if (this.cursor >= this.content_len) {
        throw new Error("Unexpected end of content");
      }
      const char = this.content[this.cursor];
      this.cursor++;
      if (char === "\n") {
        this.line++;
        this.bol = this.cursor;
        this.x = 0;
      } else {
        // NOTE: this needs rethinking
        this.x += 1;
      }
    }
  }

  private trimLeft(): void {
    while (
      this.cursor < this.content_len && /\s/.test(this.content[this.cursor])
    ) {
      this.chopChar(1);
    }
  }

  private isSymbolStart(char: string): boolean {
    return /[a-zA-Z_]/.test(char);
  }

  private previousTokenKind: TokenKind | null = null;

  private nextToken(): Token | null {
    this.trimLeft();
    if (this.cursor >= this.content_len) {
      return null;
    }
    const char = this.content[this.cursor];
    if (char === "{") {
      this.chopChar(1);
      const token = {
        kind: TokenKind.OPEN_CURLY,
        text: "{",
        text_len: 1,
        position: { col: this.x, row: this.line },
      };
      this.previousTokenKind = token.kind;
      return token;
    }

    if (char === "}") {
      this.chopChar(1);
      const token = {
        kind: TokenKind.CLOSE_CURLY,
        text: "}",
        text_len: 1,
        position: { col: this.x, row: this.line },
      };
      this.previousTokenKind = token.kind;
      return token;
    }
    if (this.startsWith("::")) {
      this.chopChar(2);
      const token = {
        kind: TokenKind.PASSAGE,
        text: "::",
        text_len: 2,
        position: { col: this.x, row: this.line },
      };
      this.previousTokenKind = token.kind;
      return token;
    }

    if (this.startsWith("<<")) {
      this.chopChar(2);
      const token = {
        kind: TokenKind.SC_TAG_START,
        text: "<<",
        text_len: 2,
        position: { col: this.x, row: this.line },
      };
      this.previousTokenKind = token.kind;
      return token;
    }

    if (this.startsWith(">>")) {
      this.chopChar(2);
      const token = {
        kind: TokenKind.SC_TAG_CLOSE,
        text: ">>",
        text_len: 2,
        position: { col: this.x, row: this.line },
      };
      return token;
    }

    if (this.isSymbolStart(char)) {
      const start = this.cursor;
      while (
        this.cursor < this.content_len &&
        this.isSymbolStart(this.content[this.cursor])
      ) {
        this.chopChar(1);
      }
      const text = this.content.substring(start, this.cursor);
      const token = {
        kind: TokenKind.SYMBOL,
        text,
        text_len: text.length,
        position: { col: this.x, row: this.line },
      };
      // NOTE: maybe make a switch for other 'start' tokens?
      if (this.previousTokenKind == TokenKind.SC_TAG_START) {
        token.kind = TokenKind.SC_TAG;
      }
      this.previousTokenKind = token.kind;
      return token;
    }
    this.chopChar(1);
    const token = {
      kind: TokenKind.INVALID,
      text: char,
      text_len: 1,
      position: { col: this.x, row: this.line },
    };
    this.previousTokenKind = token.kind;
    return token;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];
    while (true) {
      const token = this.nextToken();
      if (!token) {
        break;
      }
      tokens.push(token);
    }
    return tokens;
  }
}
