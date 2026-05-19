"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type AuthResponse = {
  error?: string;
  redirectTo?: string;
};

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phone, password }),
    });
    const data = (await response.json()) as AuthResponse;

    setIsSubmitting(false);

    if (!response.ok || data.error) {
      setError(data.error || "تعذر إنشاء الحساب.");
      return;
    }

    router.replace(data.redirectTo || "/customer/home");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="block text-sm font-bold text-slate-700" htmlFor="fullName">
          الاسم الكامل
        </label>
        <input
          autoComplete="name"
          className="w-full border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
          id="fullName"
          name="fullName"
          onChange={(event) => setFullName(event.target.value)}
          required
          type="text"
          value={fullName}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-bold text-slate-700" htmlFor="phone">
          رقم الهاتف
        </label>
        <input
          autoComplete="tel"
          className="w-full border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
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
          autoComplete="new-password"
          className="w-full border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
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
        <p className="bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
      ) : null}

      <button
        className="w-full border border-emerald-700 bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
      </button>
    </form>
  );
}
