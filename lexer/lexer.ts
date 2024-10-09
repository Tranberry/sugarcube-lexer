interface Position {
  col: number;
  line: number;
}

interface Token {
  kind: TokenKind;
  value: string;
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

export enum TokenKind {
  EOF = "end of content",
  INVALID = "invalid token",
  NOT_DONE = "INFO: Check if this should be tokenized",
  PASSAGE_START = "New passage",
  PASSAGE_NAME = "Name of passage",
  PASSAGE_TAG_START = "passage tag start",
  PASSAGE_TAG_END = "passage tag end",
  PASSAGE_TAG = "passage tag name",
  PASSAGE_META_START = "passage meta start",
  PASSAGE_META_END = "passage meta end",
  PASSAGE_META = "passage meta data",
  SC_TAG_START = "SC tag start",
  SC_TAG_CLOSE = "SC tag close",
  SC_TAG = "sugar cube tag",
  SC_MARKUP = "sugar cube markup",
  SC_VARIABLE = "sugar cube variable",
  SC_ATT_EVAL = "sugar cube attribute directive",
  JSON_DATA = "JSON data",
  OPEN_CURLY = "open curly",
  CLOSE_CURLY = "close curly",
  COMMENT = "comment",
  HTML_TAG_START = "HTML tag start",
  HTML_TAG_CLOSE = "HTML tag close",
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
    return /[a-zA-Z0-9_]/.test(char);
  }

  private previousTokenKind: TokenKind | null = null;
  private insideTag: boolean = false;
  private isPassageLine: boolean = false;

  private nextToken(): Token | null {
    this.trimLeft();
    if (this.cursor >= this.content_len) {
      return null;
    }
    const char = this.content[this.cursor];

    // possible JSON block start
    if (char === "{") {
      this.insideTag = true;
      this.incrementCursor(1);
      const token = {
        kind: TokenKind.OPEN_CURLY,
        value: "{",
        text_len: 1,
        position: { col: this.x, line: this.line },
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
          value: jsonData,
          text_len: jsonData.length,
          position: { col: this.x, line: this.line },
        };
        return token;
      } else {
        // console.log(`Char: "${char}" Line: ${this.line.toString().padStart(3, " ")} Column: ${this.x.toString().padStart(3, " ")}`);
        // possible JSON block end
        if (char === "}") {
          this.insideTag = false;
          this.incrementCursor(1);
          const token = {
            kind: TokenKind.CLOSE_CURLY,
            value: "}",
            text_len: 1,
            position: { col: this.x, line: this.line },
          };
          this.previousTokenKind = token.kind;
          return token;
        }
      }
    }

    // possible JSON block end
    if (char === "}") {
      this.insideTag = false;
      this.incrementCursor(1);
      const token = {
        kind: TokenKind.CLOSE_CURLY,
        value: "}",
        text_len: 1,
        position: { col: this.x, line: this.line },
      };
      this.previousTokenKind = token.kind;
      return token;
    }

    // probable Passage start
    if (this.startsWith("::") && this.x === 0) {
      this.incrementCursor(2);
      const token = {
        kind: TokenKind.PASSAGE_START,
        value: "::",
        text_len: 2,
        position: { col: this.x, line: this.line },
      };
      this.previousTokenKind = token.kind;
      return token;
    }

    // possible Passage name
    if (this.previousTokenKind === TokenKind.PASSAGE_START) {
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
          value: passageName,
          text_len: passageName.length,
          position: { col: this.x, line: this.line },
        };
        this.previousTokenKind = token.kind;
        return token;
      }
    }

    // possible Passage tag or Passage meta (node position)
    if (this.previousTokenKind === TokenKind.PASSAGE_NAME) {
      if (char === "[") {
        this.insideTag = true;
        this.incrementCursor(1);
        const token = {
          kind: TokenKind.PASSAGE_TAG_START,
          value: "[",
          text_len: 1,
          position: { col: this.x, line: this.line },
        };
        this.previousTokenKind = token.kind;
        return token;
      }
      if (char === "{") {
        this.insideTag = true;
        this.incrementCursor(1);
        const token = {
          kind: TokenKind.PASSAGE_META_START,
          value: "{",
          text_len: 1,
          position: { col: this.x, line: this.line },
        };
        this.previousTokenKind = token.kind;
        return token;
      }
    }

    // add tag content [tag1 tag2]
    if (this.previousTokenKind === TokenKind.PASSAGE_TAG_START) {
      // for each tag return a token, tags are space delimited
      return this.tagToken();
    }
    // if previous token is PASSAGE_TAG, make another if current is ] do not

    // possible Passage tag end
    if (this.previousTokenKind === TokenKind.PASSAGE_TAG) {
      if (char === "]") {
        this.insideTag = false;
        this.incrementCursor(1);
        const token = {
          kind: TokenKind.PASSAGE_TAG_END,
          value: "]",
          text_len: 1,
          position: { col: this.x, line: this.line },
        };
        this.previousTokenKind = token.kind;
        return token;
      } else {
        return this.tagToken();
      }
    }

    // comments
    if (
      this.startsWith("/*") || this.startsWith("/%") || this.startsWith("<!--")
    ) {
      // NOTE: insideTag?
      let commentType: string | undefined;
      let endLen = 0;

      if (this.startsWith("/*")) {
        commentType = "*/";
        endLen = 2;
      } else if (this.startsWith("/%")) {
        commentType = "%/";
        endLen = 2;
      } else if (this.startsWith("<!--")) {
        commentType = "-->";
        endLen = 3;
      }

      if (commentType === undefined) {
        throw new Error("How did we end up here, should be impossible");
      }

      const start = this.cursor;
      while (!this.startsWith(commentType)) {
        this.incrementCursor(1);
      }

      this.incrementCursor(endLen);

      const token = {
        kind: TokenKind.COMMENT,
        value: this.content.substring(start, this.cursor),
        text_len: this.cursor - start,
        position: { col: this.x, line: this.line },
      };

      this.previousTokenKind = token.kind;
      return token;
    }

    // probable SC macro/widget start
    if (this.startsWith("<<")) {
      this.insideTag = true;
      this.incrementCursor(2);
      const token = {
        kind: TokenKind.SC_TAG_START,
        value: "<<",
        text_len: 2,
        position: { col: this.x, line: this.line },
      };
      this.previousTokenKind = token.kind;
      return token;
    }

    // probable SC macro/widget end
    if (this.startsWith(">>")) {
      this.insideTag = false;
      this.incrementCursor(2);
      const token = {
        kind: TokenKind.SC_TAG_CLOSE,
        value: ">>",
        text_len: 2,
        position: { col: this.x, line: this.line },
      };
      return token;
    }

    if (this.startsWith("<")) {
      this.insideTag = true;
      this.incrementCursor(1);
      const token = {
        kind: TokenKind.HTML_TAG_START,
        value: "<",
        text_len: 1,
        position: { col: this.x, line: this.line },
      };
      this.previousTokenKind = token.kind;
      return token;
    }

    if (this.startsWith(">")) {
      this.insideTag = false;
      this.incrementCursor(1);
      const token = {
        kind: TokenKind.HTML_TAG_CLOSE,
        value: ">",
        text_len: 1,
        position: { col: this.x, line: this.line },
      };
      return token;
    }

    // **********************************************
    // **********************************************
    // <img @src="_var + 'gghghg'">
    if (this.insideTag) {
      // this.DEBUG_LOG(char);

      if (char === "@") {
        this.incrementCursor(1);
        const token = {
          kind: TokenKind.SC_ATT_EVAL,
          value: "@",
          text_len: 1,
          position: { col: this.x, line: this.line },
        };
        this.previousTokenKind = token.kind;
        return token;
      }
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
      const content = this.content.substring(start, this.cursor);
      const token = {
        kind: TokenKind.NOT_DONE,
        value: content,
        text_len: content.length,
        position: { col: this.x, line: this.line },
      };

      // possible SC tag
      if (this.previousTokenKind == TokenKind.SC_TAG_START) {
        token.kind = TokenKind.SC_TAG;
      }
      this.previousTokenKind = token.kind;
      return token;
    }

    // ///////////////////////////////////////////////
    // NOTE: just continue for now
    this.incrementCursor(1);
    // const token = {
    //   kind: TokenKind.INVALID,
    //   value: char,
    //   text_len: 1,
    //   position: { col: this.x, line: this.line },
    // };
    // this.previousTokenKind = token.kind;
    // if end of content
    if (this.cursor === this.content_len) {
      const eof_token: Token = {
        kind: TokenKind.EOF,
        value: "",
        text_len: 0,
        position: { col: this.x, line: this.line },
      };
      return eof_token;
    }
    // unexpected end of content
    const invalid: Token = {
      kind: TokenKind.INVALID,
      value: this.cursor === this.content_len ? "" : this.content[this.cursor],
      text_len: 0,
      position: { col: this.x, line: this.line },
    };
    return invalid;
  }

  private DEBUG_LOG(identification: string) {
    console.log(
      "ID:",
      identification,
      "Previous-Token:",
      `"${this.previousTokenKind}"`,
      "Character:",
      this.content[this.cursor],
      "Line:",
      this.line,
    );
  }

  private tagToken() {
    const start = this.cursor;
    while (
      this.cursor < this.content_len &&
      this.content[this.cursor] !== "]" &&
      this.content[this.cursor] !== " "
    ) {
      this.incrementCursor(1);
    }
    const tag = this.content.substring(start, this.cursor);
    const token = {
      kind: TokenKind.PASSAGE_TAG,
      value: tag,
      text_len: tag.length,
      position: { col: this.x, line: this.line },
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
