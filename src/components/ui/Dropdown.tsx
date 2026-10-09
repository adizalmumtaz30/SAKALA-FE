"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export function Dropdown({ items, value, onChange, label }: { items: string[]; value: number; onChange: (i: number) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function away(e: MouseEvent) { if (!ref.current?.contains(e.target as Node)) setOpen(false); }
    function esc(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, []);
  return (
    <div className="dd" ref={ref}>
      <button type="button" className="ddb" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}>
        {items[value]}<ChevronDown size={16} aria-hidden />
      </button>
      {open && (
        <div className="dd-pop glass" role="listbox">
          {items.map((x, i) => (
            <button key={x} type="button" role="option" aria-selected={i === value} className="menu-i" onClick={() => { onChange(i); setOpen(false); }}>{x}</button>
          ))}
        </div>
      )}
    </div>
  );
}
