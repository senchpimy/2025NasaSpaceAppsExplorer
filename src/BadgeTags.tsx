import type { ReactNode } from "react";

export type BadgeTone = "winner" | "finalist" | "nominee" | "special";

export type BadgeLabel = {
  label: string;
  tone: BadgeTone;
};

const LEVEL_PATTERNS = [
  { tone: "winner" as const, label: "Ganador", icon: "★", pattern: /winner/i },
  { tone: "finalist" as const, label: "Finalista", icon: "◆", pattern: /finalist/i },
  { tone: "nominee" as const, label: "Nominado", icon: "○", pattern: /nominee/i },
];

export function parseBadgeLabels(badges: string | null | undefined): BadgeLabel[] {
  const raw = (badges || "")
    .split(",")
    .map((badge) => badge.trim())
    .filter(Boolean);

  const result: BadgeLabel[] = [];
  const seen = new Set<string>();

  for (const level of LEVEL_PATTERNS) {
    if (raw.some((badge) => level.pattern.test(badge))) {
      result.push({ label: level.label, tone: level.tone });
      seen.add(level.label);
    }
  }

  for (const badge of raw) {
    const cleaned = badge
      .replace(/^\d{4}\s+/, "")
      .replace(/\bGlobal\s+(Nominee|Finalist|Winner)\b/gi, "")
      .replace(/\b(Nominee|Finalist|Winner)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push({ label: cleaned, tone: "special" });
  }

  return result;
}

const TONE_CLASS: Record<BadgeTone, string> = {
  winner: "award award-winner",
  finalist: "award award-finalist",
  nominee: "award award-nominee",
  special: "award text-secondary",
};

const TONE_ICON: Record<BadgeTone, ReactNode> = {
  winner: <span aria-hidden="true">★</span>,
  finalist: <span aria-hidden="true">◆</span>,
  nominee: <span aria-hidden="true">○</span>,
  special: <span aria-hidden="true">✦</span>,
};

export function BadgeTags({ badges }: { badges: string | null | undefined }) {
  const labels = parseBadgeLabels(badges);
  if (labels.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Premios del proyecto">
      {labels.map((badge) => (
        <span key={`${badge.tone}-${badge.label}`} className={TONE_CLASS[badge.tone]}>
          {TONE_ICON[badge.tone]}
          {badge.label}
        </span>
      ))}
    </div>
  );
}
