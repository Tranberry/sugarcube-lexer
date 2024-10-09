import { Lexer } from "./lexer/lexer.ts";

const input = await Deno.readTextFile("samplefiles/twee.tw");
const lexer = new Lexer(input);
const tokens = lexer.tokenize();

Deno.writeTextFile(
  "terminal-log/output-deno.log",
  JSON.stringify(tokens, null, 2),
);

