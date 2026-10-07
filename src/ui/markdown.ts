import { esc } from "./format";

function inline(text: string): string {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function tableRow(line: string, cell: "th" | "td"): string {
  const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
  return `<tr>${cells.map((c) => `<${cell}>${inline(c.trim())}</${cell}>`).join("")}</tr>`;
}

/** Just enough markdown for the how-to-play guide: headings, lists, tables, bold, code, rules. */
export function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    if (trimmed === "") {
      i++;
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = Math.min(6, (heading[1]?.length ?? 1) + 1);
      out.push(`<h${level}>${inline(heading[2] ?? "")}</h${level}>`);
      i++;
      continue;
    }
    if (/^---+$/.test(trimmed)) {
      out.push("<hr>");
      i++;
      continue;
    }
    if (trimmed.startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && (lines[i] ?? "").trim().startsWith("|")) {
        rows.push((lines[i] ?? "").trim());
        i++;
      }
      const [head, , ...body] = rows;
      out.push(`<table>${head ? `<thead>${tableRow(head, "th")}</thead>` : ""}<tbody>${body.map((r) => tableRow(r, "td")).join("")}</tbody></table>`);
      continue;
    }
    if (/^([-*]|\d+\.)\s+/.test(trimmed)) {
      const ordered = /^\d+\./.test(trimmed);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i] ?? "")) {
        items.push(`<li>${inline((lines[i] ?? "").trim().replace(/^([-*]|\d+\.)\s+/, ""))}</li>`);
        i++;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }
    if (trimmed.startsWith(">")) {
      out.push(`<p class="note">${inline(trimmed.replace(/^>\s*/, ""))}</p>`);
      i++;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && (lines[i] ?? "").trim() !== "" && !/^(#|\||---|[-*]\s|\d+\.\s|>)/.test((lines[i] ?? "").trim())) {
      para.push((lines[i] ?? "").trim());
      i++;
    }
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
}
