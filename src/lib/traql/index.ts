// TraQL — public API

export { tokenize, LexerError } from "./lexer";
export { parse, ParseError } from "./parser";
export { executeTraql, ExecutionError } from "./executor";
export type { TraqlResult } from "./executor";
export type { TraqlAST } from "./parser";

import { tokenize, LexerError } from "./lexer";
import { parse, ParseError } from "./parser";
import { executeTraql, ExecutionError } from "./executor";
import type { TraqlResult } from "./executor";

export async function runTraql(
  query: string,
  contextProjectId?: number,
  currentUserId?: string,
): Promise<TraqlResult> {
  try {
    const tokens = tokenize(query);
    const ast = parse(tokens);
    return await executeTraql(ast, contextProjectId, currentUserId);
  } catch (e) {
    if (e instanceof LexerError) {
      throw new ExecutionError(`Syntax error at position ${e.pos}: ${e.message}`);
    }
    if (e instanceof ParseError) {
      throw new ExecutionError(`Parse error at position ${e.pos}: ${e.message}`);
    }
    throw e;
  }
}
