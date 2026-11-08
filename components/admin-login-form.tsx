"use client";

import { useActionState } from "react";
import { loginAdmin } from "@/app/admin/login/actions";
import PasswordInput from "@/components/password-input";

const initialState = { error: null };

export default function AdminLoginForm({ disabled = false }: { disabled?: boolean }) {
  const [state, action, pending] = useActionState(loginAdmin, initialState);

  return (
    <form action={action} aria-label="Administrator credentials" className="space-y-4">
      <label className="block text-left text-xs font-medium text-slate-700">
        Administrator username
        <input
          autoComplete="username"
          className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:cursor-not-allowed disabled:bg-slate-50"
          name="username"
          required
          disabled={disabled}
          placeholder="Enter your administrator username"
        />
      </label>
      <label className="block text-left text-xs font-medium text-slate-700">
        Password
        <PasswordInput
          autoComplete="current-password"
          className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:cursor-not-allowed disabled:bg-slate-50"
          name="password"
          required
          disabled={disabled}
          placeholder="Enter your administrator password"
        />
      </label>
      {state.error && (
        <p aria-live="polite" className="rounded-lg bg-red-50 px-3 py-2 text-left text-xs text-red-700">
          {state.error}
        </p>
      )}
      <button
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending || disabled}
        type="submit"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
