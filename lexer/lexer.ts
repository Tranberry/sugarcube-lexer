import {
  General_TokenType,
  SC_TokenType,
  Twee_TokenType,
} from "../tokens/TokenTypes.ts";

type TokenType = General_TokenType | Twee_TokenType | SC_TokenType;

interface Token {
  type: TokenType;
  value: string;
}

interface TokenNode {
  token: Token;
  start: number;
  end: number;
}

export function Tokenize(input: string): TokenNode[] {
  const tokens: TokenNode[] = [];
  let position = 0;
  let nestingLevel = 0;
  let closingTag = false;

  function isAtEnd(): boolean {
    return position >= input.length;
  }

  function current(): string {
    return input[position];
  }

  function isNewPassage(position: number): boolean {
    const RegEx = /^::/;
    return RegEx.test(current());
  }

  function isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  function isMacroName(char: string): boolean {
    // Name, or array of names, of the macro(s) to add. NOTE: Names must consist of characters from the basic Latin alphabet and start with a letter, which may be optionally followed by any number of letters, numbers, the underscore, or the hyphen.
    return /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(char);
  }

  function isInsideMacro(): boolean {
    // if not odd
    return nestingLevel % 2 === 1;
  }

  function lookBack(char: string): boolean {
    // if previous character
    return position > 0 && input[position - 1] === char;
  }

  function match(char: string): boolean {
    if (isAtEnd()) return false;
    if (input.substring(position, position + char.length) === char) {
      position += char.length - 1;
      return true;
    }
    return false;
  }

  function calcRegExSelection(RegEx: RegExp): number {
    let selection = 0;
    const initalPosition = position;
    while (!isAtEnd() && RegEx.test(input[position])) {
      position++;
      selection++;
    }
    position = initalPosition;
    return selection;
  }
  function patternMatch(RegEx: RegExp): boolean {
    if (isAtEnd()) return false;
    const match = RegEx.exec(input.substring(position));
    if (match) {
      console.log(`Position before calc: ${position}`);
      // position += match[0].length;
      return true;
    }
    return false;
  }

  function createTokenNode(type: TokenType, value: string): TokenNode {
    const start = position;
    // TODO: if EOF, set end to start
    // const end = start + value.length - 1;
    const end = isAtEnd() ? start : position + value.length - 1;
    return {
      token: {
        type,
        value,
      },
      start,
      end,
    };
  }

  while (!isAtEnd()) {
    if (isWhitespace(input[position])) {
      position++;
      continue;
    }

    // if (isNewPassage(position)) {
    //   const token = createTokenNode("passage_start", "::", position);
    //   tokens.push(token);
    //   position++
    //   continue;
    // }

    if (patternMatch(/^::\s*/)) {
      const token = createTokenNode("passage_start", "::");
      tokens.push(token);
      position++;
      continue;
    }

    if (match("<<")) {
      nestingLevel++;
      const token = createTokenNode("sc_tag_start", "<<");
      tokens.push(token);
      position++;
      continue;
    }

    // if inside a sc_tag
    if (isInsideMacro() && isMacroName(current())) {
      let value = "";
      while (!isAtEnd() && isMacroName(current())) {
        value += input[position];
        position++;
      }
      const token = createTokenNode("sc_tag_name", value);
      tokens.push(token);
      continue;
    }

    if (match(">>")) {
      nestingLevel--;
      const token = createTokenNode("sc_tag_end", ">>");
      tokens.push(token);
      position++;
      continue;
    }

    position++;
  }

  tokens.push(createTokenNode("EOF", ""));
  return tokens;
}
