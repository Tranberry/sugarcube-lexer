import { assertEquals } from "@std/assert";
import { Lexer, TokenKind } from "./lexer/lexer.ts";

// Test: New passage
Deno.test("New Passage", async () => {
  const input = ":: StoryData";
  const lexer = new Lexer(input);
  const tokens = lexer.tokenize();
  assertEquals(tokens[0].kind, TokenKind.PASSAGE_START, "passage start");
})

// Test inline SC attribute
Deno.test("Inline SC", async () => {
  const input = '<img @src="_imageSrc">';
  const lexer = new Lexer(input);
  const tokens = lexer.tokenize();
  assertEquals(tokens[2].kind, TokenKind.SC_ATT_EVAL, "sc tag start");
})