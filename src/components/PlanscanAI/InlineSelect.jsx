import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function InlineSelect({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const scroll = (dir) => { if (listRef.current) listRef.current.scrollTop += dir * 42; };

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", zIndex: open ? 20 : 1 }}>
      <button
        type="button"
        disabled={disabled}
        className={`psai-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span style={{ color: selected ? "#0f172a" : "#94a3b8", fontSize: 14 }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown style={{
          width: 15, height: 15, color: "#94a3b8", flexShrink: 0,
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform .2s",
        }} />
      </button>

      {open && !disabled && (
        <div
          className="psai-dropdown"
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
            background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10,
            boxShadow: "0 12px 40px rgba(15,23,42,0.12)", zIndex: 9999,
            overflow: "hidden",
          }}
        >
          <button className="psai-scroll-btn" style={{ borderBottom: "1px solid #f1f5f9" }}
            onMouseDown={(e) => e.preventDefault()} onClick={() => scroll(-1)}>
            <ChevronUp style={{ width: 13, height: 13 }} />
          </button>

          <div ref={listRef} className="psai-drop-list"
            style={{ maxHeight: 210, overflowY: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {options.length === 0
              ? <div style={{ padding: "14px 16px", fontSize: 13, color: "#94a3b8", textAlign: "center" }}>No items found</div>
              : options.map((opt) => (
                <button key={opt.value} type="button"
                  className={`psai-opt ${opt.value === value ? "active" : ""}`}
                  onClick={() => { onChange(opt.value); setOpen(false); }}>
                  {opt.label}
                </button>
              ))
            }
          </div>

          <button className="psai-scroll-btn" style={{ borderTop: "1px solid #f1f5f9" }}
            onMouseDown={(e) => e.preventDefault()} onClick={() => scroll(1)}>
            <ChevronDown style={{ width: 13, height: 13 }} />
          </button>
        </div>
      )}
    </div>
  );
}
