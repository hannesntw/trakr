// TraQL Lexer — tokenizes a TraQL query string

export type TokenType =
  | "FIELD"        // type, state, assignee, parent.type, children.state, etc.
  | "COLON"        // :
  | "VALUE"        // story, done, Hannes, etc.
  | "STRING"       // "quoted string"
  | "OPERATOR"     // >=, <=, >, <, !, ~
  | "PIPE"         // |
  | "RANGE"        // ..
  | "AND"
  | "OR"
  | "NOT"
  | "LPAREN"
  | "RPAREN"
  | "SELECT"
  | "WHERE"
  | "GROUP"
  | "BY"
  | "ORDER"
  | "ASC"
  | "DESC"
  | "COMMA"
  | "FUNC"         // count(), sum(), avg(), last(), format(), etc.
  | "WAS"
  | "CHANGED"
  | "FROM"
  | "TO"
  | "BEFORE"
  | "AFTER"
  | "DURING"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const KEYWORDS: Record<string, TokenType> = {
  AND: "AND",
  OR: "OR",
  NOT: "NOT",
  SELECT: "SELECT",
  WHERE: "WHERE",
  GROUP: "GROUP",
  BY: "BY",
  ORDER: "ORDER",
  ASC: "ASC",
  DESC: "DESC",
  WAS: "WAS",
  CHANGED: "CHANGED",
  FROM: "FROM",
  TO: "TO",
  BEFORE: "BEFORE",
  AFTER: "AFTER",
  DURING: "DURING",
};

export class LexerError extends Error {
  constructor(message: string, public pos: number) {
    super(message);
    this.name = "LexerError";
  }
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    // Skip whitespace
    if (/\s/.test(input[i])) { i++; continue; }

    const pos = i;

    // String literal
    if (input[i] === '"') {
      i++;
      let str = "";
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < input.length) { str += input[++i]; }
        else { str += input[i]; }
        i++;
      }
      if (i >= input.length) throw new LexerError("Unterminated string", pos);
      i++; // closing quote
      tokens.push({ type: "STRING", value: str, pos });
      continue;
    }

    // Operators
    if (input[i] === '(' ) { tokens.push({ type: "LPAREN", value: "(", pos }); i++; continue; }
    if (input[i] === ')' ) { tokens.push({ type: "RPAREN", value: ")", pos }); i++; continue; }
    if (input[i] === ',' ) { tokens.push({ type: "COMMA", value: ",", pos }); i++; continue; }
    if (input[i] === '|' ) { tokens.push({ type: "PIPE", value: "|", pos }); i++; continue; }
    if (input[i] === ':' ) { tokens.push({ type: "COLON", value: ":", pos }); i++; continue; }

    // Range operator ..
    if (input[i] === '.' && i + 1 < input.length && input[i + 1] === '.') {
      tokens.push({ type: "RANGE", value: "..", pos });
      i += 2;
      continue;
    }

    // Comparison operators
    if (input[i] === '>' && input[i + 1] === '=') { tokens.push({ type: "OPERATOR", value: ">=", pos }); i += 2; continue; }
    if (input[i] === '<' && input[i + 1] === '=') { tokens.push({ type: "OPERATOR", value: "<=", pos }); i += 2; continue; }
    if (input[i] === '>' ) { tokens.push({ type: "OPERATOR", value: ">", pos }); i++; continue; }
    if (input[i] === '<' ) { tokens.push({ type: "OPERATOR", value: "<", pos }); i++; continue; }
    if (input[i] === '!' ) { tokens.push({ type: "OPERATOR", value: "!", pos }); i++; continue; }
    if (input[i] === '~' ) { tokens.push({ type: "OPERATOR", value: "~", pos }); i++; continue; }

    // Words (identifiers, keywords, values)
    if (/[a-zA-Z0-9_\-@.]/.test(input[i])) {
      let word = "";
      while (i < input.length && /[a-zA-Z0-9_\-@.]/.test(input[i]) && input[i] !== '.' || (input[i] === '.' && i + 1 < input.length && input[i + 1] !== '.')) {
        // Handle dotted paths like parent.type, children.state
        if (input[i] === '.' && i + 1 < input.length && input[i + 1] === '.') break; // range operator
        word += input[i];
        i++;
      }

      // Check if it's a function call (word followed by '(')
      if (i < input.length && input[i] === '(' && /^[a-zA-Z_]+$/.test(word)) {
        // Collect the full function including parens and args
        let funcStr = word + "(";
        i++; // skip (
        let depth = 1;
        while (i < input.length && depth > 0) {
          if (input[i] === '(') depth++;
          if (input[i] === ')') depth--;
          if (depth > 0) funcStr += input[i];
          i++;
        }
        funcStr += ")";
        tokens.push({ type: "FUNC", value: funcStr, pos });
        continue;
      }

      // Check for keywords
      const upper = word.toUpperCase();
      if (KEYWORDS[upper]) {
        tokens.push({ type: KEYWORDS[upper], value: upper, pos });
      } else {
        // Determine if this is a field name or a value based on context
        // If the previous token is a COLON or OPERATOR, it's a VALUE
        const prev = tokens[tokens.length - 1];
        if (prev && (prev.type === "COLON" || prev.type === "OPERATOR" || prev.type === "PIPE" || prev.type === "RANGE")) {
          tokens.push({ type: "VALUE", value: word, pos });
        } else {
          tokens.push({ type: "FIELD", value: word, pos });
        }
      }
      continue;
    }

    throw new LexerError(`Unexpected character: ${input[i]}`, i);
  }

  tokens.push({ type: "EOF", value: "", pos: i });
  return tokens;
}
