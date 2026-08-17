"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Copies the participant join link for this session.
 *
 * The origin comes from the browser rather than the server so the copied link
 * always matches wherever the admin is actually looking at the app (localhost,
 * a preview deploy, production) instead of a baked-in host.
 */
export default function CopyJoinLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timeoutRef = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  const copy = async () => {
    const url = `${window.location.origin}/s/${code}`;
    if (!navigator?.clipboard?.writeText) {
      setFailed(true);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setFailed(false);
      setCopied(true);
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
    }
  };

  const Icon = copied ? CheckIcon : CopyIcon;

  return (
    <button
      type="button"
      onClick={copy}
      title={`/s/${code}`}
      className="flex items-center gap-1.5 rounded border border-border bg-card px-2 py-1 text-xs hover:bg-accent"
    >
      <Icon className="size-3.5" aria-hidden />
      {failed ? "Copy failed" : copied ? "Copied" : "Copy join link"}
    </button>
  );
}
