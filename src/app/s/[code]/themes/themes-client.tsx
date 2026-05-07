"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Theme = {
  id: string;
  short_name: string;
  description: string;
  count: number;
};

export default function ThemesClient({
  sessionCode,
  topic,
  initialThemes,
}: {
  sessionCode: string;
  topic: string;
  initialThemes: Theme[];
}) {
  const [themes, setThemes] = useState<Theme[]>(initialThemes);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel(`session:${sessionCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "themes",
          filter: `session_id=eq.${sessionCode}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Theme;
            setThemes((prev) => [...prev, { ...row, count: 0 }]);
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Theme;
            setThemes((prev) =>
              prev.map((t) =>
                t.id === row.id
                  ? { ...t, short_name: row.short_name, description: row.description }
                  : t,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as { id: string };
            setThemes((prev) => prev.filter((t) => t.id !== row.id));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "theme_assignments" },
        (payload) => {
          const row = payload.new as { theme_id: string };
          setThemes((prev) =>
            prev.map((t) =>
              t.id === row.theme_id ? { ...t, count: t.count + 1 } : t,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, sessionCode]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          The topic
        </p>
        <h1 className="text-lg font-medium leading-snug">{topic}</h1>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Themes from this session
        </h2>
        {themes.length === 0 ? (
          <p className="text-sm text-muted-foreground/80">
            No themes have surfaced yet. They appear as more people finish.
          </p>
        ) : (
          <ul className="space-y-3">
            {themes.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border bg-card p-4 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium">{t.short_name}</h3>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {t.count} {t.count === 1 ? "perspective" : "perspectives"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.description}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-auto pt-6 text-xs text-muted-foreground/70">
        Updates live as more people complete their conversation.
      </footer>
    </div>
  );
}
