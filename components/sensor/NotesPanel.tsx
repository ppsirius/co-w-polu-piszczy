"use client";

import { useEffect, useState } from "react";
import { sensorProvider } from "@/lib/providers/registry";
import { todayIso } from "@/lib/utils/today";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Notebook, PaperPlaneRight } from "@phosphor-icons/react";
import type { Note } from "@/lib/types";

/**
 * Notes panel (brief §2.D). Lets agronomists log events (harvest, spraying,
 * observations) against a sensor. Reads from the provider; new notes are held
 * in local state (no persistence backend in the MVP).
 */
export function NotesPanel({ sensorId }: { sensorId: string }) {
  const [notes, setNotes] = useState<Note[] | undefined>();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let active = true;
    sensorProvider.getNotes(sensorId).then((n) => {
      if (active) setNotes(n);
    });
    return () => {
      active = false;
    };
  }, [sensorId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const note: Note = {
      id: `n-local-${Date.now()}`,
      sensorId,
      date: todayIso(),
      author: "Ty",
      text,
    };
    setNotes((prev) => [note, ...(prev ?? [])]);
    setDraft("");
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-3 border-l border-border bg-canvas">
      <div className="flex items-center gap-2 px-4 pt-4">
        <Icon icon={Notebook} size={18} className="text-ink-subtle" />
        <h2 className="text-sm font-semibold text-ink">Notatki</h2>
      </div>

      <form
        onSubmit={submit}
        className="flex flex-col gap-2 px-4 pb-3"
      >
        <label htmlFor="note-text" className="sr-only">
          Treść notatki
        </label>
        <textarea
          id="note-text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Zaloguj zdarzenie: zbiór, oprysk, obserwacja..."
          rows={3}
          className="resize-none rounded-md border border-border bg-surface-1 px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-primary"
        />
        <Button type="submit" variant="primary" className="self-end">
          <Icon icon={PaperPlaneRight} size={16} />
          Dodaj
        </Button>
      </form>

      <ul className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
        {notes === undefined ? (
          Array.from({ length: 2 }).map((_, i) => (
            <li key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-12 w-full" />
            </li>
          ))
        ) : notes.length === 0 ? (
          <li className="text-sm text-ink-muted">Brak notatek.</li>
        ) : (
          notes.map((note) => (
            <li
              key={note.id}
              className="flex flex-col gap-1 rounded-md bg-surface-1 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink">
                  {note.author}
                </span>
                <span className="font-mono text-xs text-ink-subtle">
                  {note.date}
                </span>
              </div>
              <p className="text-sm text-ink-muted">{note.text}</p>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
