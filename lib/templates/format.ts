import type { FieldFormat } from "./catalog-types";

const NUM = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const MYR = (n: number) =>
  `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function formatValue(value: unknown, format: FieldFormat): string {
  if (value == null) return "—";
  if (format === "text") return String(value);
  if (format === "thumbnail") return ""; // rendered separately
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n) || !Number.isFinite(n)) return "—";
  switch (format) {
    case "number":
      return NUM(n);
    case "currency":
      return MYR(n);
    case "percent":
      return `${n.toFixed(2)}%`;
    case "ratio":
      return `${n.toFixed(2)}×`;
    case "duration":
      return `${n.toFixed(1)}s`;
    default:
      return NUM(n);
  }
}
