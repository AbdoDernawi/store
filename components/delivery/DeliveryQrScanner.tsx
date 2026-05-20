"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Keyboard, Loader2, ScanLine, XCircle } from "lucide-react";

type ScannerInstance = {
  clear: () => Promise<void>;
  render: (
    onScanSuccess: (decodedText: string) => void,
    onScanFailure?: (errorMessage: string) => void,
  ) => void;
};

type ScanResult = {
  id?: string;
  package_number?: number | string | null;
  order_ids?: unknown;
};

type ScanState = {
  tone: "idle" | "success" | "error";
  message: string;
};

export function DeliveryQrScanner({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const scannerRef = useRef<ScannerInstance | null>(null);
  const scanningRef = useRef(false);
  const [manualCode, setManualCode] = useState(initialCode);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<ScanState>({
    tone: "idle",
    message: "وجّه الكاميرا نحو رمز الشحنة، أو أدخل الكود يدوياً عند الحاجة.",
  });

  const submitScan = useCallback(
    async (rawCode: string) => {
      const qrCodeHash = rawCode.trim();

      if (!qrCodeHash || scanningRef.current) {
        return;
      }

      scanningRef.current = true;
      setLoading(true);
      setState({ tone: "idle", message: "جاري ربط الشحنة بعهدتك..." });

      const response = await fetch("/api/packages/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCodeHash }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        package?: ScanResult;
      };

      setLoading(false);
      scanningRef.current = false;

      if (!response.ok || data.error) {
        setResult(null);
        setState({ tone: "error", message: data.error || "تعذر مسح الشحنة." });
        return;
      }

      setResult(data.package || null);
      setState({
        tone: "success",
        message: "تمت إضافة الشحنة إلى عهدتك بنجاح.",
      });
      router.refresh();
      await scannerRef.current?.clear().catch(() => undefined);
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;

    async function mountScanner() {
      const { Html5QrcodeScanner } = await import("html5-qrcode");

      if (cancelled || scannerRef.current) {
        return;
      }

      const scanner = new Html5QrcodeScanner(
        "delivery-qr-reader",
        {
          fps: 10,
          qrbox: { height: 250, width: 250 },
          rememberLastUsedCamera: true,
        },
        false,
      ) as ScannerInstance;

      scannerRef.current = scanner;
      scanner.render((decodedText) => {
        void submitScan(decodedText);
      });
    }

    void mountScanner();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      void scanner?.clear().catch(() => undefined);
    };
  }, [submitScan]);

  async function submitManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitScan(manualCode);
  }

  const orderCount = Array.isArray(result?.order_ids) ? result.order_ids.length : 0;

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] bg-[#eef8f5] p-5 ring-1 ring-teal-100">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white">
            <ScanLine size={22} />
          </span>
          <div>
            <p className="text-xs font-black text-teal-700">مسح الشحنة</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">استلام سريع وواضح</h2>
          </div>
        </div>
      </section>

      <section className="rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5">
        <div className="overflow-hidden rounded-[1.2rem] bg-slate-50 p-2 ring-1 ring-slate-100">
          <div id="delivery-qr-reader" />
        </div>
      </section>

      <form
        className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5"
        onSubmit={submitManual}
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-700">
            <Keyboard size={18} />
          </span>
          <h3 className="text-base font-black text-slate-950">إدخال يدوي</h3>
        </div>
        <div className="flex gap-2">
          <input
            className="h-12 min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-50"
            onChange={(event) => setManualCode(event.target.value)}
            placeholder="كود QR"
            value={manualCode}
          />
          <button
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-teal-600 px-5 text-sm font-black text-white transition hover:bg-teal-700 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={loading || !manualCode.trim()}
            type="submit"
          >
            {loading ? <Loader2 className="animate-spin" size={17} /> : <ScanLine size={17} />}
            ربط
          </button>
        </div>
      </form>

      <div
        className={`rounded-[1.2rem] px-4 py-3 text-sm font-black ${
          state.tone === "success"
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
            : state.tone === "error"
              ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
              : "bg-slate-50 text-slate-500 ring-1 ring-slate-100"
        }`}
      >
        <div className="flex items-center gap-2">
          {state.tone === "success" ? <CheckCircle2 size={17} /> : state.tone === "error" ? <XCircle size={17} /> : null}
          <span>{state.message}</span>
        </div>
      </div>

      {result ? (
        <section className="rounded-[1.35rem] border border-emerald-100 bg-white p-4 shadow-sm shadow-emerald-950/5">
          <p className="text-xs font-black text-emerald-700">تم الربط</p>
          <h3 className="mt-2 text-xl font-black text-slate-950">
            شحنة #{result.package_number || "-"}
          </h3>
          <p className="mt-2 text-sm font-bold text-slate-500">
            أضيفت {orderCount.toLocaleString("ar-LY")} طلبات إلى عهدتك.
          </p>
          <Link
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700"
            href="/delivery/custody"
          >
            عرض عهدتي الآن
          </Link>
        </section>
      ) : null}
    </div>
  );
}
