"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format-date";

type Match = {
  id: string;
  voice: string;
  phrase: string;
  at: string;
  why: string;
};

export default function FindSources({ code }: { code: string }) {
  const [line, setLine] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);

  async function find() {
    setBusy(true);
    setError(null);
    setMatches(null);
    const res = await fetch(`/api/admin/sessions/${code}/sources`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ line }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.text()) || `failed (${res.status})`);
      return;
    }
    setMatches(((await res.json()) as { matches: Match[] }).matches);
  }

  // A header button that opens the search: the summary stays the page's job.
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Find sources
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Where did this come from?</DialogTitle>
          <DialogDescription>
            Paste a line from any summary to see the answers it most likely
            draws on.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={line}
          onChange={(e) => setLine(e.target.value)}
          placeholder="a neighbor arriving with a chainsaw"
          rows={2}
        />
        <div>
          <Button size="sm" onClick={find} disabled={busy || !line.trim()}>
            {busy ? "Looking…" : "Find sources"}
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {matches &&
          (matches.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No answers clearly match that line.
            </p>
          ) : (
            <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
              {matches.map((m) => (
                <li key={m.id} className="text-sm">
                  <p className="text-xs font-medium text-muted-foreground">
                    {m.voice}
                    <span className="ml-2 font-normal">
                      {formatDateTime(m.at)}
                    </span>
                  </p>
                  <p>“{m.phrase}”</p>
                  <p className="text-xs text-muted-foreground">{m.why}</p>
                </li>
              ))}
            </ul>
          ))}
      </DialogContent>
    </Dialog>
  );
}
