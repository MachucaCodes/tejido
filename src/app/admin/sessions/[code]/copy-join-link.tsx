"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Copies the participant join link for this session.
 *
 * The origin comes from the browser rather than the server so the copied link
 * always matches wherever the admin is actually looking at the app (localhost,
 * a preview deploy, production) instead of a baked-in host.
 *
 * `prominent` is the big button next to the link on a new session; the small
 * outline one sits in the page header once results come in.
 */
export default function CopyJoinLink({
  code,
  prominent = false,
  onFail,
}: {
  code: string;
  prominent?: boolean;
  onFail?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [url, setUrl] = useState("");
  const timeoutRef = useRef<number>(0);
  const linkRef = useRef<HTMLSpanElement>(null);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  // The small button has no link text beside it: when the clipboard refuses,
  // it turns into the link itself, selected, ready for Ctrl/Cmd-C.
  useEffect(() => {
    const el = linkRef.current;
    if (!failed || prominent || !el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [failed, prominent]);

  const fail = () => {
    setFailed(true);
    onFail?.();
  };

  const copy = async () => {
    const url = `${window.location.origin}/s/${code}`;
    setUrl(url);
    if (!navigator?.clipboard?.writeText) return fail();
    try {
      await navigator.clipboard.writeText(url);
      setFailed(false);
      setCopied(true);
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      fail();
    }
  };

  const Icon = copied ? CheckIcon : CopyIcon;

  if (prominent) {
    return (
      <Button type="button" onClick={copy} className="shrink-0 gap-1.5">
        <Icon aria-hidden />
        {failed ? "Copy it by hand" : copied ? "Copied" : "Copy link"}
      </Button>
    );
  }

  if (failed) {
    return (
      <span
        ref={linkRef}
        aria-label="Join link: copy it by hand"
        className="min-w-0 rounded border border-border bg-background px-2 py-1 font-mono text-xs break-all select-all sm:max-w-sm"
      >
        {url}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`/s/${code}`}
      className="flex items-center gap-1.5 rounded border border-border bg-card px-2 py-1 text-xs hover:bg-accent"
    >
      <Icon className="size-3.5" aria-hidden />
      {copied ? "Copied" : "Copy join link"}
    </button>
  );
}
