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
  PASSAGE_NAME = "name passage",
  PASSAGE_TAG_START = "passage tag start",
  PASSAGE_TAG_END = "passage tag end",
  PASSAGE_TAG = "passage tag",
  PASSAGE_META_START = "passage meta start",
  PASSAGE_META_END = "passage meta end",
  PASSAGE_META = "passage meta",
  SC_TAG_START = "SC tag start",
  SC_TAG_CLOSE = "SC tag close",
  SC_TAG = "sugar cube tag",
  SC_MARKUP = "sugar cube markup",
  SC_VARIABLE = "sugar cube variable",
  JSON_DATA = "JSON data",
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


  private incrementCursor(len: number): void {
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
        this.x += 1;
      }
    }
  }

  private trimLeft(): void {
    while (
      this.cursor < this.content_len && /\s/.test(this.content[this.cursor])
    ) {
      this.incrementCursor(1);
    }
  }

  private isSymbolStart(char: string): boolean {
    // NOTE: should this be expanded for SC macro reasons
    return /[a-zA-Z_]/.test(char);
  }

  private previousTokenKind: TokenKind | null = null;
  private isPassageLine: boolean = false;

  private nextToken(): Token | null {
    this.trimLeft();
    if (this.cursor >= this.content_len) {
      return null;
    }
    const char = this.content[this.cursor];

    // possible JSON block start
    if (char === "{") {
      this.incrementCursor(1);
      const token = {
        kind: TokenKind.OPEN_CURLY,
        text: "{",
        text_len: 1,
        position: { col: this.x, row: this.line },
      };
      this.previousTokenKind = token.kind;
      return token;
    }

    // possible JSON data block
    if (this.previousTokenKind === TokenKind.OPEN_CURLY) {
      // NOTE: this is naive
      if (char === '"') {     
        const start = this.cursor;
        while (
          this.cursor < this.content_len &&
          // is not }
          this.content[this.cursor] !== "}"
        ) {
          this.incrementCursor(1);
        }
        const jsonData = this.content.substring(start, this.cursor);
        const token = {
          kind: TokenKind.JSON_DATA,
          text: jsonData,
          text_len: jsonData.length,
          position: { col: this.x, row: this.line },
        }
        return token;
      } else {
        // console.log(`Char: "${char}" Line: ${this.line.toString().padStart(3, " ")} Column: ${this.x.toString().padStart(3, " ")}`);
        // possible JSON block end
        if (char === "}") {
          this.incrementCursor(1);
          const token = {
            kind: TokenKind.CLOSE_CURLY,
            text: "}",
            text_len: 1,
            position: { col: this.x, row: this.line },
          };
          this.previousTokenKind = token.kind;
          return token;
        }
      }
    }

    // possible JSON block end
    if (char === "}") {
      this.incrementCursor(1);
      const token = {
        kind: TokenKind.CLOSE_CURLY,
        text: "}",
        text_len: 1,
        position: { col: this.x, row: this.line },
      };
      this.previousTokenKind = token.kind;
      return token;
    }

    // probable Passage start
    if (this.startsWith("::") && this.x === 0) {     
      this.incrementCursor(2);
      const token = {
        kind: TokenKind.PASSAGE,
        text: "::",
        text_len: 2,
        position: { col: this.x, row: this.line },
      };
      this.previousTokenKind = token.kind;
      return token;
    }

    // possible Passage name
    if (this.previousTokenKind === TokenKind.PASSAGE) {
      if (this.isSymbolStart(char)) {
        const start = this.cursor;
        while (
          this.cursor < this.content_len &&
          this.isSymbolStart(this.content[this.cursor]) &&
          // is not [ or { or newline
          this.content[this.cursor] !== "[" &&
          this.content[this.cursor] !== "{" &&
          this.content[this.cursor] !== "\n"
        ) {
          this.incrementCursor(1);
        }
        const passageName = this.content.substring(start, this.cursor);
        const token = {
          kind: TokenKind.PASSAGE_NAME,
          text: passageName,
          text_len: passageName.length,
          position: { col: this.x, row: this.line },
        }
        this.previousTokenKind = token.kind;        
        return token;
      }
    }

    // possible Passage tag or Passage meta (node position)
    if (this.previousTokenKind === TokenKind.PASSAGE_NAME) {     
      if (char === "[") {
        this.incrementCursor(1);
        const token = {
          kind: TokenKind.PASSAGE_TAG_START,
          text: "[",
          text_len: 1,
          position: { col: this.x, row: this.line },
        };
        this.previousTokenKind = token.kind;
        return token;
      }
      if (char === "{") {
        this.incrementCursor(1);
        const token = {
          kind: TokenKind.PASSAGE_META_START,
          text: "{",
          text_len: 1,
          position: { col: this.x, row: this.line },
        };
        this.previousTokenKind = token.kind;
        return token;
      }
    }

    // TODO: add tag content [tag1 tag2]
    if (this.previousTokenKind === TokenKind.PASSAGE_TAG_START) {
      console.log("again?");
      // for each tag return a token, tags are space delimited
      return this.tagToken();
    }
    // if previous token is PASSAGE_TAG, make another if current is ] do not

    // possible Passage tag end
    if (this.previousTokenKind === TokenKind.PASSAGE_TAG) {
      if (char === "]") {
        this.incrementCursor(1);
        const token = {
          kind: TokenKind.PASSAGE_TAG_END,
          text: "]",
          text_len: 1,
          position: { col: this.x, row: this.line },
        } 
        this.previousTokenKind = token.kind;
        return token;
      } else {
        return this.tagToken();
      };
    }

    // comments
    if (this.startsWith("/*") || this.startsWith("/%") || this.startsWith("<!--")) {
      const length = this.startsWith("<!--") ? 4 : 2;
      this.incrementCursor(length);

      const token = {
        kind: TokenKind.COMMENT,
        text: this.content.substring(this.cursor - length, this.cursor),
        text_len: length,
        position: { col: this.x, row: this.line },
      }

      this.previousTokenKind = token.kind;
      return token;
    }

    // probable SC macro/widget start
    if (this.startsWith("<<")) {
      this.incrementCursor(2);
      const token = {
        kind: TokenKind.SC_TAG_START,
        text: "<<",
        text_len: 2,
        position: { col: this.x, row: this.line },
      };
      this.previousTokenKind = token.kind;
      return token;
    }

    // probable SC macro/widget end
    if (this.startsWith(">>")) {
      this.incrementCursor(2);
      const token = {
        kind: TokenKind.SC_TAG_CLOSE,
        text: ">>",
        text_len: 2,
        position: { col: this.x, row: this.line },
      };
      return token;
    }

    // probably a symbol, as in a tag ('link') or other named content
    if (this.isSymbolStart(char)) {
      const start = this.cursor;
      while (
        this.cursor < this.content_len &&
        this.isSymbolStart(this.content[this.cursor])
      ) {
        this.incrementCursor(1);
      }
      const text = this.content.substring(start, this.cursor);
      const token = {
        kind: TokenKind.SYMBOL,
        text,
        text_len: text.length,
        position: { col: this.x, row: this.line },
      };
      if (this.previousTokenKind == TokenKind.SC_TAG_START) {
        token.kind = TokenKind.SC_TAG;
      }
      this.previousTokenKind = token.kind;
      return token;
    }

    // NOTE: just continue for now
    this.incrementCursor(1);
    const token = {
      kind: TokenKind.INVALID,
      text: char,
      text_len: 1,
      position: { col: this.x, row: this.line },
    };
    this.previousTokenKind = token.kind;
    return token;
  }

  private tagToken() {
    const start = this.cursor;
    while (this.cursor < this.content_len &&
      this.content[this.cursor] !== "]" &&
      this.content[this.cursor] !== " ") {
      this.incrementCursor(1);
    }
    const tag = this.content.substring(start, this.cursor);
    const token = {
      kind: TokenKind.PASSAGE_TAG,
      text: tag,
      text_len: tag.length,
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
