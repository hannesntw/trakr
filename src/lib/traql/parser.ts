// TraQL Parser — recursive descent parser producing an AST

import { Token, TokenType } from "./lexer";

// --- AST Node Types ---

export type FilterNode =
  | FieldFilter
  | LogicNode
  | NotNode
  | ShortcutNode;

export interface FieldFilter {
  kind: "field";
  field: string;          // e.g. "type", "parent.type", "children.state"
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in" | "range" | "func";
  value: string | string[];
  funcName?: string;      // for quantifiers: all, any, has
  rangeEnd?: string;      // for range: id:300..310
}

export interface LogicNode {
  kind: "logic";
  op: "AND" | "OR";
  left: FilterNode;
  right: FilterNode;
}

export interface NotNode {
  kind: "not";
  child: FilterNode;
}

export interface ShortcutNode {
  kind: "shortcut";
  name: string; // is:open, my:items, etc.
}

export interface SortClause {
  field: string;
  direction: "ASC" | "DESC";
}

export interface SelectClause {
  func: string;       // count(), sum(points), avg(points), format("...")
  groupBy?: string;   // GROUP BY field
}

export interface TraqlAST {
  type: "query" | "select";
  filter?: FilterNode;
  sort?: SortClause[];
  select?: SelectClause;
}

export class ParseError extends Error {
  constructor(message: string, public pos: number) {
    super(message);
    this.name = "ParseError";
  }
}

export function parse(tokens: Token[]): TraqlAST {
  let pos = 0;

  function peek(): Token { return tokens[pos] ?? tokens[tokens.length - 1]; }
  function advance(): Token { return tokens[pos++]; }
  function expect(type: TokenType): Token {
    const t = peek();
    if (t.type !== type) throw new ParseError(`Expected ${type}, got ${t.type} ('${t.value}')`, t.pos);
    return advance();
  }
  function match(...types: TokenType[]): boolean { return types.includes(peek().type); }

  // SELECT clause
  if (match("SELECT")) {
    advance(); // consume SELECT
    const func = expect("FUNC").value;

    let groupBy: string | undefined;
    let filter: FilterNode | undefined;

    // Check for GROUP BY or WHERE in any order
    while (match("GROUP", "WHERE")) {
      if (match("GROUP")) {
        advance(); // GROUP
        expect("BY");
        groupBy = expect("FIELD").value;
      } else if (match("WHERE")) {
        advance(); // WHERE
        filter = parseOr();
      }
    }

    // Sort
    const sort = parseOrderBy();

    return { type: "select", select: { func, groupBy }, filter, sort };
  }

  // Regular query: filter + optional ORDER BY
  const filter = parseFilterUntilKeyword();
  const sort = parseOrderBy();

  return { type: "query", filter: filter ?? undefined, sort };

  // --- Filter parsing ---

  function parseFilterUntilKeyword(): FilterNode | null {
    if (match("ORDER", "EOF")) return null;
    return parseOr();
  }

  function parseOr(): FilterNode {
    let left = parseAnd();
    while (match("OR")) {
      advance();
      const right = parseAnd();
      left = { kind: "logic", op: "OR", left, right };
    }
    return left;
  }

  function parseAnd(): FilterNode {
    let left = parseUnary();
    while (!match("OR", "RPAREN", "ORDER", "EOF", "WHERE", "GROUP")) {
      if (match("AND")) advance(); // explicit AND, consume it
      if (match("OR", "RPAREN", "ORDER", "EOF", "WHERE", "GROUP")) break;
      const right = parseUnary();
      left = { kind: "logic", op: "AND", left, right };
    }
    return left;
  }

  function parseUnary(): FilterNode {
    if (match("NOT")) {
      advance();
      return { kind: "not", child: parseUnary() };
    }
    if (match("LPAREN")) {
      advance();
      const node = parseOr();
      expect("RPAREN");
      return node;
    }
    return parsePrimary();
  }

  function parsePrimary(): FilterNode {
    const fieldToken = expect("FIELD");
    const field = fieldToken.value;

    // Check for shortcuts like is:open, my:items
    if (match("COLON")) {
      advance();

      // Negation operator
      if (match("OPERATOR") && peek().value === "!") {
        advance();
        const val = parseValue();
        return { kind: "field", field, operator: "neq", value: val };
      }

      // Contains operator ~
      if (match("OPERATOR") && peek().value === "~") {
        advance();
        const val = parseValue();
        return { kind: "field", field, operator: "contains", value: val };
      }

      // Comparison operators
      if (match("OPERATOR")) {
        const op = advance().value;
        const val = parseValue();
        const opMap: Record<string, FieldFilter["operator"]> = {
          ">": "gt", ">=": "gte", "<": "lt", "<=": "lte",
        };
        return { kind: "field", field, operator: opMap[op] ?? "eq", value: val };
      }

      // Function value: all(done), any(in_progress), last(7d), within(...)
      if (match("FUNC")) {
        const funcVal = advance().value;
        const funcMatch = funcVal.match(/^(\w+)\((.+)\)$/);
        if (funcMatch) {
          const [, funcName, funcArg] = funcMatch;
          if (["all", "any", "has", "none"].includes(funcName)) {
            return { kind: "field", field, operator: "func", value: funcArg, funcName };
          }
          // Date functions: last(7d), within(sprint:active)
          return { kind: "field", field, operator: "func", value: funcVal };
        }
        return { kind: "field", field, operator: "eq", value: funcVal };
      }

      // Regular value, possibly with pipes (OR) or range (..)
      const val = parseValue();

      // Range: 300..310
      if (match("RANGE")) {
        advance();
        const end = parseValue();
        return { kind: "field", field, operator: "range", value: val, rangeEnd: end };
      }

      // Multi-value with pipe: story|bug
      if (match("PIPE")) {
        const values = [val];
        while (match("PIPE")) {
          advance();
          values.push(parseValue());
        }
        return { kind: "field", field, operator: "in", value: values };
      }

      // Shortcuts
      if (field === "is" || field === "my") {
        return { kind: "shortcut", name: `${field}:${val}` };
      }

      return { kind: "field", field, operator: "eq", value: val };
    }

    // Bare field without colon — treat as shortcut or error
    throw new ParseError(`Expected ':' after field '${field}'`, fieldToken.pos);
  }

  function parseValue(): string {
    if (match("STRING")) return advance().value;
    if (match("VALUE")) return advance().value;
    if (match("FIELD")) return advance().value; // sometimes values look like fields
    if (match("FUNC")) return advance().value;
    throw new ParseError(`Expected value, got ${peek().type} ('${peek().value}')`, peek().pos);
  }

  function parseOrderBy(): SortClause[] | undefined {
    if (!match("ORDER")) return undefined;
    advance(); // ORDER
    expect("BY");
    const clauses: SortClause[] = [];
    do {
      const field = expect("FIELD").value;
      let direction: "ASC" | "DESC" = "ASC";
      if (match("ASC")) { advance(); direction = "ASC"; }
      else if (match("DESC")) { advance(); direction = "DESC"; }
      clauses.push({ field, direction });
      if (match("COMMA")) advance();
      else break;
    } while (true);
    return clauses;
  }
}
