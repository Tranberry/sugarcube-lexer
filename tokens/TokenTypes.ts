export type SC_TokenType =
  | "passage_start"
  | "passage_name"
  | "passage_tag_start"
  | "passage_tag_end"
  | "passage_tag_name"
  | "passage_meta_start"
  | "passage_meta_end"
  | "passage_meta_data"
  | "sc_tag_start"
  | "sc_tag_end"
  | "sc_markup_start"
  | "sc_markup_end"
  | "sc_markup_selector"
  | "sc_markup_content"
  | "sc_tag_name"
  | "sc_tag_closing_name"
  | "sc_variable"
  | "sc_tag_arg";

export type Twee_TokenType =
  | "twee_link_start"
  | "twee_link_end"
  | "twee_link_forward"
  | "twee_link_backward"
  | "twee_link_passage"
  | "twee_link_text";

export type General_TokenType =
  | "whitespace"
  | "text_content"
  | "json_data"
  | "html_element"
  | "comment_block"
  | "EOF";
