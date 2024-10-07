// import { assertEquals } from "@std/assert";
// import { Tokenize } from "./lexer/lexer.ts";
// import {
//   General_TokenType,
//   SC_TokenType,
//   Twee_TokenType,
// } from "./tokens/TokenTypes.ts";

// type Tokens = General_TokenType | SC_TokenType | Twee_TokenType;

// Deno.test(function tokenizeTest() {
//   const input = `:: StoryData`;
//   const tokens = Tokenize(input);
//   const END = {
//     token: { type: "EOF", value: "" },
//     start: input.length,
//     end: input.length,
//   };

//   assertEquals(
//     tokens,
//     [
//       {
//         token: {
//           type: "passage_start",
//           value: "::",
//         },
//         start: 0,
//         end: 1,
//       },
//       END,
//     ],
//   );
// });
