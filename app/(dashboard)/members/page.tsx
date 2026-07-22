"use client";

import { UserPlus } from "@phosphor-icons/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icon";
import type { FieldStatus } from "@/lib/types";

type Member = {
  name: string;
  email: string;
  role: "Agronom" | "Rolnik" | "Technik";
  status: FieldStatus;
};

const MEMBERS: Member[] = [
  { name: "Marek Kowalski", email: "m.kowalski@cowpolupiszczy.pl", role: "Agronom", status: "normal" },
  { name: "Anna Nowak", email: "a.nowak@cowpolupiszczy.pl", role: "Agronom", status: "normal" },
  { name: "Tomasz Wójcik", email: "t.wojcik@cowpolupiszczy.pl", role: "Rolnik", status: "normal" },
  { name: "Katarzyna Lewandowska", email: "k.lewandowska@cowpolupiszczy.pl", role: "Technik", status: "follow-up" },
];

const ROLE_LABEL: Record<Member["role"], string> = {
  Agronom: "Agronom",
  Rolnik: "Rolnik",
  Technik: "Technik IoT",
};

export default function MembersPage() {
  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Członkowie
          </h2>
          <p className="text-sm text-ink-muted">
            Zespół gospodarstwa: role, kontakt i dostęp do danych pól.
          </p>
        </div>
        <Button variant="primary" className="hidden sm:inline-flex">
          <Icon icon={UserPlus} size={16} />
          Zaproś
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {MEMBERS.map((member) => (
          <Card key={member.email} className="flex items-center gap-4 p-4">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-primary"
            >
              {initials(member.name)}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold text-ink">
                {member.name}
              </span>
              <span className="truncate text-xs text-ink-muted">
                {member.email}
              </span>
            </div>
            <span className="ml-auto rounded-pill bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-ink">
              {ROLE_LABEL[member.role]}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}
