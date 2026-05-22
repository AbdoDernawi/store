"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-black text-white shadow-sm shadow-emerald-950/10"
      onClick={() => window.print()}
      type="button"
    >
      <Printer size={17} />
      طباعة الحزمة
    </button>
  );
}
