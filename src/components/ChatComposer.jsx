import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Code2 } from "lucide-react";

// Multi-line chat input. A plain <input> silently strips the newlines out of
// pasted text, which flattened code and lists into one line. This grows with
// the content (up to maxRows, then scrolls).
//   Enter        → send
//   Shift+Enter  → new line
//   Enter inside an unclosed ``` block → new line (so you can type code)
// The </> button wraps the selection (or the whole draft) in a code block.

const ChatComposer = forwardRef(function ChatComposer(
  { value, onChange, onSubmit, placeholder = "Type a message…", maxRows = 8, style, className, disabled = false },
  ref,
) {
  const taRef = useRef(null);
  useImperativeHandle(ref, () => ({
    focus: () => taRef.current?.focus(),
    el: taRef.current,
  }));

  // Auto-grow to fit the content.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const line = parseFloat(getComputedStyle(ta).lineHeight) || 20;
    const max = line * maxRows + 16;
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`;
    ta.style.overflowY = ta.scrollHeight > max ? "auto" : "hidden";
  }, [value, maxRows]);

  const insideOpenFence = (text, pos) => ((text.slice(0, pos).match(/```/g) || []).length % 2) === 1;

  const onKeyDown = (e) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    if (insideOpenFence(value, e.target.selectionStart)) return; // typing code
    e.preventDefault();
    if (value.trim()) onSubmit?.();
  };

  const wrapCode = () => {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: a, selectionEnd: b } = ta;
    const hasSel = b > a;
    const sel = hasSel ? value.slice(a, b) : value;
    const wrapped = "```\n" + (sel || "") + "\n```";
    const next = hasSel ? value.slice(0, a) + wrapped + value.slice(b) : wrapped;
    onChange?.(next);
    requestAnimationFrame(() => {
      ta.focus();
      // Put the cursor inside the block when it was empty.
      const pos = hasSel ? a + wrapped.length : sel ? next.length : 4;
      ta.setSelectionRange(pos, pos);
    });
  };

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "flex-end", gap: 4 }}>
      <textarea
        ref={taRef}
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={className}
        spellCheck
        style={{ flex: 1, minWidth: 0, resize: "none", lineHeight: "20px", fontFamily: "inherit", ...style }}
      />
      <button
        type="button"
        onClick={wrapCode}
        title="Code block (or type ``` ). Shift+Enter for a new line"
        style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 10, border: "1px solid var(--card-border, #e5e7eb)", background: "transparent", color: "var(--text-secondary, #6b7280)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Code2 size={15} />
      </button>
    </div>
  );
});

export default ChatComposer;
