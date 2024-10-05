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

  function isAtEnd(): boolean {
    return position >= input.length;
  }

  function current(): string {
    return input[position];
  }

  function isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  function isMacroName(char: string): boolean {
    // NOTE: Names must consist of characters from the basic Latin alphabet and
    // start with a letter, which may be optionally followed by any number of
    // letters, numbers, the underscore, or the hyphen.
    return /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(char);
  }

  function isInsideMacro(): boolean {
    // TODO: make this more robust
    return nestingLevel % 2 === 1;
  }

  function match(char: string): boolean {
    if (isAtEnd()) return false;
    if (input.substring(position, position + char.length) === char) {
      position += char.length - 1;
      return true;
    }
    return false;
  }

  function patternMatch(RegEx: RegExp): boolean {
    if (isAtEnd()) return false;
    const match = RegEx.exec(input.substring(position));
    if (match) {
      console.log(`Position before calc: ${position}`);
      return true;
    }
    return false;
  }

  function lookBehind(char: string): boolean {
    if (position <= 0) return false;
    if (input[position - 1] === char) {
      return true;
    }
    return false;
  }

  function regExAfterCurrent(regEx: RegExp, maxDistance: number = 50): boolean {
    if (isAtEnd()) return false;
    // Get the substring of the input string starting at the current position
    // and ending at the current position plus the maximum distance to look
    // ahead.
    const content = input.substring(position, position + maxDistance);
    if (content.match(regEx)) {
      return true;
    }
    return false;
  }

  function createTokenNode(type: TokenType, value: string): TokenNode {
    const start = position;
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

    // TODO: rework logic
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

    // if json block
    if (match("{") && !match("{{") && !lookBehind("{") && regExAfterCurrent(/\{"[^"]*"\:[\s\S]*\}/, 200)) {
    // TODO: clean this up, if we find a JSON validator might be worth a try 
    // if (match("{")) {
      let value = "";
      while (!isAtEnd() && current() !== "}") {
        value += current().trim();
        position++;
      }

      if (match("}")) {
        value += "}";
        const token = createTokenNode("json_data", value);
        tokens.push(token);
        position++;
        continue;
      }
      console.log("TODO: json block");
      position++;
      continue;
    }

    position++;
  }

  tokens.push(createTokenNode("EOF", ""));
  return tokens;
}
