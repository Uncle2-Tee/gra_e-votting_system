"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyVoterIdButton({ voterId }: { voterId: string }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  function copyVoterId() {
    const textArea = document.createElement("textarea");
    textArea.value = voterId;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);

    try {
      textArea.select();
      const success = document.execCommand("copy");
      setCopied(success);
      setCopyFailed(!success);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    } finally {
      document.body.removeChild(textArea);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={copyVoterId}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-700/30 bg-white px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy voter ID"}
      </button>
      {copyFailed ? (
        <p role="status" className="mt-1 text-[10px] text-rose-700">
          Could not copy. Select the ID and copy it manually.
        </p>
      ) : null}
    </div>
  );
}
