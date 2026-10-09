"use client";

import { useEffect, useSyncExternalStore } from "react";
import "./ui.css";

type T = { id: number; msg: string; undo?: () => void } | null;
let current: T = null;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function toast(msg: string, undo?: () => void) {
  current = { id: ++seq, msg, undo };
  emit();
  clearTimeout(timer);
  timer = setTimeout(() => { current = null; emit(); }, undo ? 7000 : 3500);
}

export function Toaster() {
  const t = useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => current, () => null);
  useEffect(() => () => clearTimeout(timer), []);
  if (!t) return null;
  return (
    <div role="status" className="glass toast">
      <span>{t.msg}</span>
      {t.undo && (
        <button type="button" className="btn t sm" onClick={() => { t.undo?.(); current = null; emit(); }}>Urungkan</button>
      )}
    </div>
  );
}
