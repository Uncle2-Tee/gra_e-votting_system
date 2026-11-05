"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<ComponentProps<"input">, "type">;

export default function PasswordInput({
  className,
  disabled,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative block">
      <input
        {...props}
        disabled={disabled}
        type={visible ? "text" : "password"}
        className={`${className ?? ""} pr-11`}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center rounded-r-lg text-slate-400 transition hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </span>
  );
}
