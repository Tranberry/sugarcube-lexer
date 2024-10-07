import { readAll } from "https://deno.land/std@0.224.0/io/read_all.ts";
import { Lexer } from "./lexer/lexer.ts";

const file = await Deno.open("samplefiles/twee.tw");
const input = new TextDecoder().decode(await readAll(file));
// const tokens = Tokenize(input);

const lexer = new Lexer(input);
const tokens = lexer.tokenize();

// Deno, write `tokens` to ./terminal-log/output-deno.log
Deno.writeFile(
  "terminal-log/output-deno.log",
  new TextEncoder().encode(JSON.stringify(tokens, null, 2)),
);
