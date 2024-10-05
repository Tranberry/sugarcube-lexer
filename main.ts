import { readAll } from "https://deno.land/std@0.224.0/io/read_all.ts";
import { Tokenize } from "./lexer/lexer.ts";

const file = await Deno.open("samplefiles/twee.tw");
const input = new TextDecoder().decode(await readAll(file));
const tokens = Tokenize(input);

console.log(tokens);
