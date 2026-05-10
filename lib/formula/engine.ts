/**
 * Hand-rolled formula engine for the Fighter template Custom-tab.
 *
 * Supports: + - * / % ( ) > < >= <= == != ?: , and a fixed set of
 * functions (min, max, abs, round, ceil, floor, coalesce, safeDiv).
 *
 * Why hand-rolled: `expr-eval` has unpatched RCE (CVE-2025-12735, CVSS
 * 9.8). `mathjs` is 170 KB and has had sandbox escapes. Our grammar is
 * tiny — ~200 LOC of Pratt parsing + tree-walk eval is safer and
 * cheaper.
 *
 * Security:
 * - No `eval`, no `new Function` — works under strict-dynamic CSP and
 *   Vercel Edge runtime.
 * - Reserved-identifier set blocks `__proto__`, `constructor`,
 *   `prototype`, `globalThis`, `process` at lex time.
 * - `MAX_DEPTH = 32`, `MAX_LEN = 2000` — DoS caps.
 * - Identifiers are validated against an `allowedRefs` set at parse
 *   time; unknown names throw immediately.
 * - Function names are type-narrowed via `keyof typeof FNS` — no
 *   string-keyed dynamic dispatch.
 * - All arithmetic is null-aware: `null + 1 → null`, `0 / 0 → null`
 *   (never `NaN` or `Infinity`).
 */

// --------------------------------------------------- function whitelist

export const FNS = {
  min: (...a: number[]) => Math.min(...a),
  max: (...a: number[]) => Math.max(...a),
  abs: (x: number) => Math.abs(x),
  round: (x: number, d = 0) => {
    const m = 10 ** d;
    return Math.round(x * m) / m;
  },
  ceil: (x: number) => Math.ceil(x),
  floor: (x: number) => Math.floor(x),
  /** Returns first non-null arg; only function that intentionally sees nulls. */
  coalesce: (...a: (number | null)[]): number | null => a.find((v) => v != null) ?? null,
  /** Explicit null-on-zero division — recommended over `/` for ROAS, CTR, CPC. */
  safeDiv: (a: number, b: number): number | null => (b === 0 ? null : a / b),
} as const;

const FN_NAMES = new Set(Object.keys(FNS));
/** coalesce is the only function that accepts nulls in its arguments. */
const FNS_NULL_TOLERANT = new Set(["coalesce"]);

// --------------------------------------------------- AST

export type Ast =
  | { t: "num"; v: number }
  | { t: "ref"; name: string }
  | { t: "bin"; op: "+" | "-" | "*" | "/" | "%"; l: Ast; r: Ast }
  | { t: "neg"; x: Ast }
  | { t: "if"; c: Ast; a: Ast; b: Ast }
  | { t: "cmp"; op: ">" | "<" | ">=" | "<=" | "==" | "!="; l: Ast; r: Ast }
  | { t: "call"; fn: keyof typeof FNS; args: Ast[] };

const MAX_DEPTH = 32;
const MAX_LEN = 2000;
const RESERVED = new Set(["__proto__", "constructor", "prototype", "globalThis", "process", "window", "self"]);

// --------------------------------------------------- lexer

type Tok = { k: string; v?: string | number };

function lex(src: string): Tok[] {
  if (src.length > MAX_LEN) throw new Error(`Formula too long (${src.length} > ${MAX_LEN} chars)`);
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const num = Number(src.slice(i, j));
      if (Number.isNaN(num)) throw new Error(`Invalid number near "${src.slice(i, j)}"`);
      out.push({ k: "num", v: num });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_.]/.test(src[j])) j++;
      const name = src.slice(i, j);
      if (RESERVED.has(name)) throw new Error(`Reserved identifier: "${name}"`);
      out.push({ k: "id", v: name });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (["==", "!=", ">=", "<="].includes(two)) {
      out.push({ k: two });
      i += 2;
      continue;
    }
    if ("+-*/%(),?:<>".includes(c)) {
      out.push({ k: c });
      i++;
      continue;
    }
    throw new Error(`Unexpected character: "${c}"`);
  }
  out.push({ k: "eof" });
  return out;
}

// --------------------------------------------------- parser (Pratt)

const PREC: Record<string, number> = {
  "?": 1,
  "==": 2,
  "!=": 2,
  "<": 3,
  "<=": 3,
  ">": 3,
  ">=": 3,
  "+": 4,
  "-": 4,
  "*": 5,
  "/": 5,
  "%": 5,
};

export function parse(src: string, allowedRefs: Set<string>): Ast {
  const toks = lex(src);
  let p = 0;
  let depth = 0;

  const peek = () => toks[p];
  const eat = (k?: string): Tok => {
    const t = toks[p++];
    if (k !== undefined && t.k !== k) throw new Error(`Expected ${k}, got ${t.k}`);
    return t;
  };

  const parseExpr = (rbp: number): Ast => {
    if (++depth > MAX_DEPTH) throw new Error("Expression too deeply nested");
    let left = nud();
    while (PREC[peek().k] !== undefined && PREC[peek().k] > rbp) left = led(left);
    depth--;
    return left;
  };

  const nud = (): Ast => {
    const t = eat();
    if (t.k === "num") return { t: "num", v: t.v as number };
    if (t.k === "-") return { t: "neg", x: parseExpr(6) };
    if (t.k === "(") {
      const e = parseExpr(0);
      eat(")");
      return e;
    }
    if (t.k === "id") {
      const name = t.v as string;
      // function call?
      if (peek().k === "(") {
        eat("(");
        const args: Ast[] = [];
        if (peek().k !== ")") {
          args.push(parseExpr(0));
          while (peek().k === ",") {
            eat(",");
            args.push(parseExpr(0));
          }
        }
        eat(")");
        if (!FN_NAMES.has(name)) throw new Error(`Unknown function: "${name}"`);
        return { t: "call", fn: name as keyof typeof FNS, args };
      }
      // bare identifier — must be in the allowed ref set
      if (!allowedRefs.has(name)) throw new Error(`Unknown reference: "${name}"`);
      return { t: "ref", name };
    }
    throw new Error(`Unexpected token: ${t.k}`);
  };

  const led = (l: Ast): Ast => {
    const t = eat();
    if (t.k === "?") {
      const a = parseExpr(0);
      eat(":");
      const b = parseExpr(0);
      return { t: "if", c: l, a, b };
    }
    if (["==", "!=", "<", "<=", ">", ">="].includes(t.k)) {
      return { t: "cmp", op: t.k as Ast extends { t: "cmp" } ? Ast["op"] : never, l, r: parseExpr(PREC[t.k]) };
    }
    return { t: "bin", op: t.k as "+" | "-" | "*" | "/" | "%", l, r: parseExpr(PREC[t.k]) };
  };

  const ast = parseExpr(0);
  eat("eof");
  return ast;
}

// --------------------------------------------------- ref collection

export function collectRefs(ast: Ast, out: Set<string> = new Set()): Set<string> {
  switch (ast.t) {
    case "ref":
      out.add(ast.name);
      return out;
    case "neg":
      return collectRefs(ast.x, out);
    case "bin":
    case "cmp":
      collectRefs(ast.l, out);
      return collectRefs(ast.r, out);
    case "if":
      collectRefs(ast.c, out);
      collectRefs(ast.a, out);
      return collectRefs(ast.b, out);
    case "call":
      for (const a of ast.args) collectRefs(a, out);
      return out;
    default:
      return out;
  }
}

// --------------------------------------------------- interpreter

export function evalAst(ast: Ast, row: Record<string, number | null>): number | null {
  switch (ast.t) {
    case "num":
      return ast.v;
    case "ref": {
      const v = row[ast.name];
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    }
    case "neg": {
      const x = evalAst(ast.x, row);
      return x == null ? null : -x;
    }
    case "bin": {
      const l = evalAst(ast.l, row);
      const r = evalAst(ast.r, row);
      if (l == null || r == null) return null;
      switch (ast.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return r === 0 ? null : l / r; // div-by-zero → null, NEVER Infinity
        case "%":
          return r === 0 ? null : l % r;
      }
      return null;
    }
    case "cmp": {
      const l = evalAst(ast.l, row);
      const r = evalAst(ast.r, row);
      if (l == null || r == null) return null;
      const ok =
        ast.op === "=="
          ? l === r
          : ast.op === "!="
          ? l !== r
          : ast.op === ">"
          ? l > r
          : ast.op === "<"
          ? l < r
          : ast.op === ">="
          ? l >= r
          : l <= r;
      return ok ? 1 : 0;
    }
    case "if": {
      const c = evalAst(ast.c, row);
      return c == null ? null : c ? evalAst(ast.a, row) : evalAst(ast.b, row);
    }
    case "call": {
      const args = ast.args.map((a) => evalAst(a, row));
      if (!FNS_NULL_TOLERANT.has(ast.fn) && args.some((a) => a == null)) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (FNS[ast.fn] as any)(...args);
    }
  }
}

// --------------------------------------------------- formula collection
// helpers for the template builder + render-time eval

export interface FormulaSpec {
  id: string;
  name: string;
  expression: string;
  format: "number" | "currency" | "percent" | "ratio";
}

/** Topo-sort formulas so dependencies are evaluated before dependents. */
export function topoSortFormulas(
  formulas: FormulaSpec[],
  fieldRefs: Set<string>
): { order: { spec: FormulaSpec; ast: Ast; deps: Set<string> }[]; error?: string } {
  // Parse each + collect deps
  const refsAvail = new Set([...fieldRefs, ...formulas.map((f) => f.id)]);
  const compiled = formulas.map((spec) => {
    try {
      const ast = parse(spec.expression, refsAvail);
      const deps = collectRefs(ast);
      return { spec, ast, deps };
    } catch (e) {
      throw new Error(`Formula "${spec.name}": ${(e as Error).message}`);
    }
  });
  const byId = new Map(compiled.map((c) => [c.spec.id, c]));
  // Kahn's algorithm
  const order: typeof compiled = [];
  const indeg = new Map<string, number>();
  for (const c of compiled) {
    let d = 0;
    for (const r of c.deps) if (byId.has(r)) d++;
    indeg.set(c.spec.id, d);
  }
  const queue: string[] = [...indeg.entries()].filter(([, d]) => d === 0).map(([id]) => id);
  while (queue.length) {
    const id = queue.shift()!;
    const c = byId.get(id)!;
    order.push(c);
    for (const other of compiled) {
      if (other.deps.has(id)) {
        const newIndeg = (indeg.get(other.spec.id) ?? 0) - 1;
        indeg.set(other.spec.id, newIndeg);
        if (newIndeg === 0) queue.push(other.spec.id);
      }
    }
  }
  if (order.length !== compiled.length) {
    return { order: [], error: "Formula cycle detected" };
  }
  return { order };
}

/** Evaluate all formulas against a row, in topo order. */
export function evalFormulas(
  ordered: { spec: FormulaSpec; ast: Ast }[],
  row: Record<string, number | null>
): Record<string, number | null> {
  const result = { ...row };
  for (const f of ordered) {
    result[f.spec.id] = evalAst(f.ast, result);
  }
  return result;
}
