import { useEffect, useRef, useState, useCallback } from "react";

// A shared whiteboard: everyone can see + draw. Strokes are stored/drawn as
// normalized [0..1] coordinates so they line up across different screen sizes.
// The parent owns the stroke list + sync (over the LiveKit data channel); this
// component just renders it and reports new strokes / clears.

const COLORS = ["#111827", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"];

export default function Whiteboard({ strokes, onStroke, onClear }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const drawingRef = useRef(null); // the in-progress stroke
  const [color, setColor] = useState("#3b82f6");
  const [width, setWidth] = useState(3);
  const [erasing, setErasing] = useState(false);

  const drawStroke = useCallback((ctx, canvas, s) => {
    if (!s?.points?.length) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = s.mode === "erase" ? "destination-out" : "source-over";
    ctx.strokeStyle = s.color || "#111827";
    ctx.lineWidth = (s.width || 3) * (s.mode === "erase" ? 5 : 1);
    ctx.beginPath();
    s.points.forEach((p, i) => {
      const x = p.x * canvas.width;
      const y = p.y * canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    // A single dot (tap) still shows up.
    if (s.points.length === 1) {
      const x = s.points[0].x * canvas.width;
      const y = s.points[0].y * canvas.height;
      ctx.lineTo(x + 0.01, y + 0.01);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    (strokes || []).forEach((s) => drawStroke(ctx, canvas, s));
    if (drawingRef.current) drawStroke(ctx, canvas, drawingRef.current);
  }, [strokes, drawStroke]);

  const sizeAndRedraw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const w = Math.max(1, Math.round(wrap.clientWidth));
    const h = Math.max(1, Math.round(wrap.clientHeight));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    redraw();
  }, [redraw]);

  useEffect(() => { sizeAndRedraw(); }, [sizeAndRedraw]);
  useEffect(() => {
    if (!wrapRef.current || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => sizeAndRedraw());
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [sizeAndRedraw]);
  useEffect(() => { redraw(); }, [redraw]);

  const toPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const onDown = (e) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture?.(e.pointerId);
    drawingRef.current = {
      id: crypto.randomUUID?.() || String(Math.random()),
      color,
      width,
      mode: erasing ? "erase" : "draw",
      points: [toPoint(e)],
    };
    redraw();
  };
  const onMove = (e) => {
    if (!drawingRef.current) return;
    drawingRef.current.points.push(toPoint(e));
    redraw();
  };
  const onUp = () => {
    const s = drawingRef.current;
    drawingRef.current = null;
    if (s && s.points.length) onStroke?.(s);
    redraw();
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.toolbar}>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title="Pen colour"
            onClick={() => { setColor(c); setErasing(false); }}
            style={{
              ...styles.swatch,
              background: c,
              outline: color === c && !erasing ? "2px solid var(--accent)" : "1px solid var(--card-border)",
            }}
          />
        ))}
        <button
          type="button"
          title="Eraser"
          onClick={() => setErasing((v) => !v)}
          style={{ ...styles.tool, background: erasing ? "var(--accent-soft)" : "transparent", color: erasing ? "var(--accent)" : "var(--text-secondary)" }}
        >
          🧽
        </button>
        <select value={width} onChange={(e) => setWidth(Number(e.target.value))} title="Pen size" style={styles.tool}>
          <option value={2}>Thin</option>
          <option value={3}>Med</option>
          <option value={6}>Thick</option>
        </select>
        <button type="button" onClick={onClear} title="Clear the board for everyone" style={{ ...styles.tool, marginLeft: "auto", color: "#dc2626" }}>
          Clear
        </button>
      </div>
      <div ref={wrapRef} style={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          style={styles.canvas}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          onPointerCancel={onUp}
        />
      </div>
      <p style={styles.hint}>Everyone in the room can draw here together.</p>
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", height: "100%", minHeight: 320, padding: 10, gap: 8 },
  toolbar: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  swatch: { width: 22, height: 22, borderRadius: "50%", cursor: "pointer", border: "1px solid var(--card-border)", padding: 0 },
  tool: {
    height: 28, padding: "0 8px", borderRadius: 8, border: "1px solid var(--card-border)",
    background: "transparent", color: "var(--text-secondary)", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
  },
  canvasWrap: {
    flex: 1, minHeight: 240, borderRadius: 12, overflow: "hidden",
    border: "1px solid var(--card-border)", background: "#ffffff",
  },
  canvas: { width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "crosshair" },
  hint: { margin: 0, fontSize: 11, color: "var(--text-muted)", textAlign: "center" },
};
