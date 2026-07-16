import fs from "fs";
import { parseCsv } from "./src/utils/csv-import";

const path = "c:/Users/Admin/Downloads/products_export_1 (3).csv";
const raw = fs.readFileSync(path, "utf8");

const rawRows: string[] = [];
let current = "";
let inQuotes = false;
for (let i = 0; i < raw.length; i += 1) {
  const char = raw[i];
  const next = raw[i + 1];

  if (char === '"') {
    if (inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else {
      inQuotes = !inQuotes;
    }
    continue;
  }

  if (char === "\r") {
    continue;
  }

  if (char === "\n" && !inQuotes) {
    rawRows.push(current);
    current = "";
    continue;
  }

  current += char;
}
if (current.length > 0) rawRows.push(current);

console.log("rawRows", rawRows.length);
console.log("headerFields", rawRows[0].split(",").length);

const idx = 55;
console.log("---ROW", idx + 1);
console.log(rawRows[idx].slice(0, 400));

const parseLine = (line: string): string[] => {
  const values: string[] = [];
  let cur = "";
  let inQ = false;
  for (let j = 0; j < line.length; j += 1) {
    const ch = line[j];
    const nxt = line[j + 1];
    if (ch === '"') {
      if (inQ && nxt === '"') {
        cur += '"';
        j += 1;
      } else {
        inQ = !inQ;
      }
      continue;
    }
    if (ch === "," && !inQ) {
      values.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  values.push(cur);
  return values;
};

const fields = parseLine(rawRows[idx]);
console.log("fieldCount", fields.length);
fields.slice(0, 20).forEach((f, i) => console.log(i, f.slice(0, 120)));

const parsed = parseCsv(raw);
console.log("parsedRows", parsed.rows.length);
console.log("parsed[55].variant_sku", parsed.rows[55].variant_sku);
console.log("parsed[55].title", parsed.rows[55].title);
console.log("parsed[55].handle", parsed.rows[55].handle);
console.log("parsed[55].body_html", parsed.rows[55].body_html?.slice(0, 150));
