"use client";

import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { PersonMatch } from "@/app/api/admin/people/route";
import { InfoTip } from "@/components/info-tip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/**
 * "Add numbers" button for the Members heading. Search and paste live in a
 * dialog so the page opens on who is in the list, not on an empty form.
 */
export default function AddMembersForm({ listId, memberPhones }: { listId: string; memberPhones: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<PersonMatch[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const inList = new Set(memberPhones);

  useEffect(() => {
    const q = query.trim();
    // Under 2 chars the results list is hidden, so stale matches never show.
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const res = await fetch(`/api/admin/people?q=${encodeURIComponent(q)}`, {
        signal: ctrl.signal,
      }).catch(() => null);
      if (res?.ok) setMatches(((await res.json()) as { people: PersonMatch[] }).people);
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  async function post(lines: string) {
    const res = await fetch(`/api/admin/lists/${listId}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: lines }),
    });
    const body = res.headers.get("content-type")?.includes("json")
      ? ((await res.json()) as { added: number; invalid: string[] })
      : null;
    return { res, body };
  }

  async function addPerson(p: PersonMatch) {
    setAdding(p.phone);
    setError(null);
    const { res, body } = await post(`${p.phone}, ${p.name}`);
    setAdding(null);
    if (!res.ok || !body) {
      setError(body ? "Could not add that number." : await res.text());
      return;
    }
    router.refresh();
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    const { res, body } = await post(text);
    setBusy(false);
    if (!res.ok && !body) {
      setError(await res.text());
      return;
    }
    const invalid = body?.invalid ?? [];
    router.refresh();
    // All good: close. Otherwise keep the bad lines in the box to fix.
    if (invalid.length === 0) {
      setText("");
      setOpen(false);
      return;
    }
    setText(invalid.join("\n"));
    setResult(`Added ${body?.added ?? 0}.` + ` ${invalid.length} not valid — left in the box to fix.`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
          setResult(null);
          setQuery("");
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <PlusIcon aria-hidden />
        Add numbers
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add numbers</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium" htmlFor="person-search">
              Add by name
            </label>
            <input
              id="person-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people who've used Tejido, by name or lot"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              autoComplete="off"
            />
            {query.trim().length >= 2 &&
              (matches.length === 0 ? (
                <p className="text-xs text-muted-foreground">No one found.</p>
              ) : (
                <ul className="divide-y rounded border">
                  {matches.map((p) => {
                    const already = inList.has(p.phone);
                    return (
                      <li
                        key={p.phone}
                        className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm"
                      >
                        <div className="min-w-0">
                          <span className="font-medium">{p.name}</span>
                          {p.lot && <span className="ml-2 text-xs text-muted-foreground">Lot {p.lot}</span>}
                          <span className="ml-2 font-mono text-xs text-muted-foreground">{p.phone}</span>
                        </div>
                        {already ? (
                          <span className="shrink-0 text-xs text-muted-foreground">In list</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addPerson(p)}
                            disabled={adding === p.phone}
                            className="shrink-0 text-xs font-medium hover:underline disabled:opacity-50"
                          >
                            {adding === p.phone ? "Adding…" : "Add"}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <label className="text-xs font-medium" htmlFor="numbers">
                  Or paste numbers
                </label>
                <InfoTip label="How to paste numbers">
                  One per line: phone, then an optional name and language (en or es), separated by commas or
                  tabs. Numbers without a + are read as Costa Rica. With no language, +506 numbers get
                  Spanish and the rest English.
                </InfoTip>
              </div>
              <textarea
                id="numbers"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder={"+506 8888 7777, Ana, es\n8888 6666, Luis\n+1 415 555 0100, Sam, en"}
                className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
                required
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            {result && <p className="text-xs text-muted-foreground">{result}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? "Adding…" : "Add to list"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
