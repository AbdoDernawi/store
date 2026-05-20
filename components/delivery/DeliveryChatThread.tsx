"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, SendHorizontal } from "lucide-react";
import { formatDate } from "@/lib/admin/format";

type ChatInfo = {
  id: string;
  is_open: boolean;
};

type ChatMessage = {
  id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type ChatState = {
  tone: "idle" | "error";
  message: string;
};

export function DeliveryChatThread({ orderId }: { orderId: string }) {
  const activeRef = useRef(true);
  const listRef = useRef<HTMLDivElement>(null);
  const [chat, setChat] = useState<ChatInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [state, setState] = useState<ChatState>({
    tone: "idle",
    message: "يتم تحديث المحادثة تلقائياً كل 15 ثانية.",
  });

  const loadMessages = useCallback(async () => {
    const response = await fetch(`/api/delivery/orders/${orderId}/chat`, {
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as {
      chat?: ChatInfo;
      error?: string;
      messages?: ChatMessage[];
      user_id?: string;
    };

    if (!activeRef.current) {
      return;
    }

    setLoading(false);

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر تحميل المحادثة." });
      return;
    }

    setChat(data.chat || null);
    setMessages(data.messages || []);
    setUserId(data.user_id || "");
    setState({
      tone: "idle",
      message: data.chat?.is_open ? "المحادثة مفتوحة مع صاحب الطلب." : "المحادثة مغلقة",
    });
  }, [orderId]);

  useEffect(() => {
    activeRef.current = true;
    void loadMessages();
    const intervalId = window.setInterval(() => {
      void loadMessages();
    }, 15000);

    return () => {
      activeRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [loadMessages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();

    if (!message || !chat?.is_open) {
      return;
    }

    setSending(true);
    const response = await fetch(`/api/delivery/orders/${orderId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setSending(false);

    if (!response.ok || data.error) {
      setState({ tone: "error", message: data.error || "تعذر إرسال الرسالة." });
      return;
    }

    setInput("");
    await loadMessages();
  }

  return (
    <section className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">شات الطلب</h2>
          <p
            className={`mt-1 text-xs font-black ${
              state.tone === "error" ? "text-rose-600" : "text-slate-500"
            }`}
          >
            {state.message}
          </p>
        </div>
        <button
          aria-label="تحديث المحادثة"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
          onClick={() => void loadMessages()}
          type="button"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      <div
        className="min-h-[360px] space-y-3 overflow-y-auto rounded-[1.2rem] bg-slate-50 p-3 ring-1 ring-slate-100"
        ref={listRef}
      >
        {loading ? (
          <div className="flex h-72 items-center justify-center text-slate-400">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : messages.length ? (
          messages.map((message) => {
            const mine = message.sender_id === userId;

            return (
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`} key={message.id}>
                <div
                  className={`max-w-[82%] rounded-[1.05rem] px-4 py-3 text-sm font-bold leading-6 shadow-sm ${
                    mine
                      ? "bg-teal-600 text-white shadow-teal-950/10"
                      : "bg-white text-slate-800 shadow-slate-950/5 ring-1 ring-slate-100"
                  }`}
                >
                  <p>{message.message}</p>
                  <p className={`mt-1 text-[11px] font-bold ${mine ? "text-teal-50" : "text-slate-400"}`}>
                    {formatDate(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex h-72 items-center justify-center rounded-[1.1rem] bg-white px-4 text-center text-sm font-bold leading-6 text-slate-500">
            لا توجد رسائل بعد.
          </div>
        )}
      </div>

      {chat && !chat.is_open ? (
        <div className="mt-4 rounded-[1rem] bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 ring-1 ring-amber-100">
          المحادثة مغلقة
        </div>
      ) : null}

      <form className="mt-4 flex gap-2" onSubmit={sendMessage}>
        <input
          className="h-12 min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-50"
          disabled={!chat?.is_open || sending}
          onChange={(event) => setInput(event.target.value)}
          placeholder={chat?.is_open ? "اكتب رسالة..." : "المحادثة مغلقة"}
          value={input}
        />
        <button
          aria-label="إرسال الرسالة"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white transition hover:bg-teal-700 disabled:bg-slate-100 disabled:text-slate-400"
          disabled={!chat?.is_open || sending || !input.trim()}
          type="submit"
        >
          {sending ? <Loader2 className="animate-spin" size={18} /> : <SendHorizontal size={18} />}
        </button>
      </form>
    </section>
  );
}
