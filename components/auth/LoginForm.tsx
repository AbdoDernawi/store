"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type AuthResponse = {
  error?: string;
  redirectTo?: string;
};

const demoPassword = "Demo@123456";

const demoAccounts = [
  { id: "super-admin", label: "مدير عام", phone: "+218910000001" },
  { id: "admin", label: "أدمن", phone: "+218910000002" },
  { id: "marketer", label: "مسوق", phone: "+218910000003" },
  { id: "delivery", label: "مندوب", phone: "+218910000004" },
  { id: "customer-1", label: "زبون 1", phone: "+218910000005" },
  { id: "customer-2", label: "زبون 2", phone: "+218910000006" },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        password,
        next: searchParams.get("next") || undefined,
      }),
    });
    const data = (await response.json()) as AuthResponse;

    setIsSubmitting(false);

    if (!response.ok || data.error) {
      setError(data.error || "تعذر تسجيل الدخول.");
      return;
    }

    router.replace(data.redirectTo || "/");
    router.refresh();
  }

  function fillDemoAccount(phoneNumber: string) {
    setPhone(phoneNumber);
    setPassword(demoPassword);
    setError("");
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="rounded-[1.25rem] bg-emerald-50/70 p-3 ring-1 ring-emerald-100">
        <p className="mb-3 text-xs font-black text-emerald-800">دخول تجريبي سريع</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {demoAccounts.map((account) => (
            <button
              className="h-10 rounded-full bg-white px-3 text-xs font-black text-slate-700 shadow-sm ring-1 ring-emerald-100 transition hover:bg-emerald-600 hover:text-white"
              data-testid={`demo-login-${account.id}`}
              key={account.id}
              onClick={() => fillDemoAccount(account.phone)}
              type="button"
            >
              {account.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-bold text-slate-700" htmlFor="phone">
          رقم الهاتف
        </label>
        <input
          autoComplete="tel"
          className="h-12 w-full rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-base font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
          id="phone"
          inputMode="tel"
          name="phone"
          onChange={(event) => setPhone(event.target.value)}
          placeholder="09xxxxxxxx"
          required
          type="tel"
          value={phone}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-bold text-slate-700" htmlFor="password">
          كلمة المرور
        </label>
        <input
          autoComplete="current-password"
          className="h-12 w-full rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-base font-bold text-slate-950 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
          id="password"
          minLength={8}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>

      {error ? (
        <p className="rounded-[1rem] bg-red-50 px-4 py-3 text-sm font-black leading-6 text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      <button
        className="h-12 w-full rounded-full bg-emerald-600 px-5 text-sm font-black text-white shadow-sm shadow-emerald-950/10 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "جاري الدخول..." : "تسجيل الدخول"}
      </button>
    </form>
  );
}
