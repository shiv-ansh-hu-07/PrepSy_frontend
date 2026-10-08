/* eslint-disable react-refresh/only-export-components */
import { Fragment, useState } from "react";

// Lightweight, safe message formatting for chats, DMs and discussions.
// Builds React elements only (never innerHTML), so nothing a user types can
// run as HTML. Supports:
//   ```code blocks``` (optional language after the fence), `inline code`,
//   **bold**, *italic* / _italic_, clickable http(s) links / www. links,
//   and keeps line breaks + indentation exactly as typed or pasted.
// A multi-line paste that clearly looks like code is shown as a code block
// even without fences.

const URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>"'`]+[^\s<>"'`.,;:!?)\]}])/gi;

function linkify(text, keyBase) {
  const out = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(URL_RE)) {
    const raw = m[0];
    if (m.index > last) out.push(text.slice(last, m.index));
    const href = raw.toLowerCase().startsWith("www.") ? `https://${raw}` : raw;
    out.push(
      <a
        key={`${keyBase}-l${i++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2, wordBreak: "break-all" }}
        onClick={(e) => e.stopPropagation()}
      >
        {raw}
      </a>,
    );
    last = m.index + raw.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// **bold**, *italic*, _italic_ inside a run of plain text (then links).
function emphasis(text, keyBase) {
  const out = [];
  const re = /(\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*|\b_[^_\n]+_\b)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(...linkify(text.slice(last, m.index), `${keyBase}-t${i}`));
    const tok = m[0];
    const inner = tok.startsWith("**") ? tok.slice(2, -2) : tok.slice(1, -1);
    const content = linkify(inner, `${keyBase}-e${i}`);
    out.push(
      tok.startsWith("**")
        ? <strong key={`${keyBase}-b${i}`}>{content}</strong>
        : <em key={`${keyBase}-i${i}`}>{content}</em>,
    );
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) out.push(...linkify(text.slice(last), `${keyBase}-t${i}`));
  return out;
}

// `inline code` first (its content is left untouched), then emphasis/links.
function inline(text, keyBase, codeStyle) {
  const out = [];
  const parts = text.split(/(`[^`\n]+`)/g);
  parts.forEach((p, i) => {
    if (!p) return;
    if (p.length > 2 && p.startsWith("`") && p.endsWith("`")) {
      out.push(<code key={`${keyBase}-c${i}`} style={codeStyle}>{p.slice(1, -1)}</code>);
    } else {
      out.push(<Fragment key={`${keyBase}-f${i}`}>{emphasis(p, `${keyBase}-${i}`)}</Fragment>);
    }
  });
  return out;
}

// Multi-line text that is very likely code (braces/semicolons/indentation).
export function looksLikeCode(text) {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 3) return false;
  const codey = lines.filter((l) =>
    /^\s{2,}\S/.test(l) || /^\t/.test(l) ||
    /[{};]\s*$/.test(l) || /^\s*[})\]]/.test(l) ||
    /^\s*(def|class|for|while|if|else|elif|return|import|from|public|private|static|int|void|const|let|var|function|#include|using|package)\b/.test(l),
  ).length;
  return codey / lines.length >= 0.5;
}

// Split into [{type:'code', lang, body} | {type:'text', body}] by ``` fences.
function blocks(text) {
  const out = [];
  const re = /```([\w+#.-]*)[^\S\n]*\n?([\s\S]*?)(?:```|$)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ type: "text", body: text.slice(last, m.index) });
    out.push({ type: "code", lang: m[1] || "", body: m[2].replace(/\n$/, "") });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", body: text.slice(last) });
  return out;
}

function CodeBlock({ body, lang, dark }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <div style={{ position: "relative", margin: "6px 0", borderRadius: 10, overflow: "hidden", background: dark ? "rgba(0,0,0,0.28)" : "#0f172a", maxWidth: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", fontSize: 10.5, color: "#94a3b8", background: "rgba(255,255,255,0.05)" }}>
        <span>{lang || "code"}</span>
        <button type="button" onClick={copy} style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: 10.5, fontWeight: 700, padding: 0 }}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "8px 10px", overflowX: "auto", fontSize: 12, lineHeight: 1.5, color: "#e2e8f0", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", whiteSpace: "pre", tabSize: 4 }}>
        <code>{body}</code>
      </pre>
    </div>
  );
}

// The line break right before/after a code block is implied by the block
// itself — drop it so blocks don't get a blank line around them.
function trimAroundCode(body, prev, next) {
  let t = body;
  if (prev?.type === "code") t = t.replace(/^\n/, "");
  if (next?.type === "code") t = t.replace(/\n$/, "");
  return t;
}

// `dark` = rendered on a dark/colored bubble (e.g. your own message).
export default function RichText({ text, dark = false, style }) {
  const value = String(text ?? "");
  if (!value) return null;
  const codeStyle = {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: "0.9em",
    padding: "1px 5px",
    borderRadius: 5,
    background: dark ? "rgba(255,255,255,0.18)" : "rgba(15,23,42,0.07)",
  };
  const parts = !value.includes("```") && looksLikeCode(value)
    ? [{ type: "code", lang: "", body: value }]
    : blocks(value);
  return (
    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere", minWidth: 0, ...style }}>
      {parts.map((b, i) =>
        b.type === "code"
          ? <CodeBlock key={i} body={b.body} lang={b.lang} dark={dark} />
          : <Fragment key={i}>{inline(trimAroundCode(b.body, parts[i - 1], parts[i + 1]), `b${i}`, codeStyle)}</Fragment>,
      )}
    </div>
  );
}
