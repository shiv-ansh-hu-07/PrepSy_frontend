import React, { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

const EMOJIS = [
  "😀", "😂", "😍", "😅", "😎", "🤔", "😴", "🥳", "😭", "😡",
  "👍", "🙏", "👏", "🙌", "🤝", "💪", "👀", "❤️", "🔥", "✨",
  "🎉", "💯", "✅", "⭐", "💡", "🚀", "📚", "☕", "🧠", "🤯",
];

// Reusable emoji button + popover. Calls onPick(emoji) so the parent can insert
// it into its own text field.
export default function EmojiPicker({ onPick, size = 18, above = true }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Emoji"
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 10, border: "1px solid var(--card-border)", background: open ? "var(--accent-soft)" : "transparent", color: "var(--accent)", cursor: "pointer", flexShrink: 0 }}
      >
        <Smile size={size} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute", left: 0, zIndex: 60,
            [above ? "bottom" : "top"]: "calc(100% + 8px)",
            width: 250, background: "var(--card-bg)", border: "1px solid var(--card-border)",
            borderRadius: 14, boxShadow: "0 12px 32px rgba(0,0,0,0.2)", padding: 8,
            display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 2,
          }}
        >
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => { onPick(e); setOpen(false); }}
              style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 8, lineHeight: 1 }}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
