export type ProgramId = 'month1' | 'month2' | 'month3';

export interface SessionConfig {
  holdSec: number;
  restSec: number;
  reps: number;
  prepSec: number;
}

export interface SessionTemplate extends SessionConfig {
  id: string;
  label: string;
  hint: string;
}

export const PROGRAMS: Record<ProgramId, {
  label: string;
  name: string;
  subtitle: string;
  summary: string;
  templates: readonly SessionTemplate[];
}> = {
  month1: {
    label: 'Mois 01',
    name: 'Les bases',
    subtitle: 'Trouver son rythme',
    summary: 'Des contractions lentes avec autant de temps pour relâcher. Commencez tranquillement, à votre rythme.',
    templates: [
      { id: 'm1-base', label: 'Douce découverte', hint: '6 sec / 6 sec · 10 répétitions', holdSec: 6, restSec: 6, reps: 10, prepSec: 3 },
      { id: 'm1-progress', label: 'Progression', hint: '8 sec / 8 sec · 10 répétitions', holdSec: 8, restSec: 8, reps: 10, prepSec: 3 },
    ],
  },
  month2: {
    label: 'Mois 02',
    name: 'Renforcement',
    subtitle: 'Gagner en contrôle',
    summary: 'Alternez les contractions plus longues et des séquences rapides. Respectez toujours les phases de repos.',
    templates: [
      { id: 'm2-slow', label: 'Contractions longues', hint: '10 sec / 10 sec · 10 répétitions', holdSec: 10, restSec: 10, reps: 10, prepSec: 3 },
      { id: 'm2-fast', label: 'Contractions rapides', hint: '1 sec / 1 sec · 20 répétitions', holdSec: 1, restSec: 1, reps: 20, prepSec: 2 },
    ],
  },
  month3: {
    label: 'Mois 03',
    name: 'Maîtrise',
    subtitle: 'Varier ses séances',
    summary: 'Plusieurs formats de séance pour travailler la coordination et l’endurance sans forcer.',
    templates: [
      { id: 'm3-morning', label: 'Longue · matin', hint: '10 sec / 10 sec · 20 répétitions', holdSec: 10, restSec: 10, reps: 20, prepSec: 3 },
      { id: 'm3-afternoon', label: 'Rapide · après-midi', hint: '1 sec / 1 sec · 40 répétitions', holdSec: 1, restSec: 1, reps: 40, prepSec: 2 },
      { id: 'm3-evening-slow', label: 'Longue · soir', hint: '8 sec / 8 sec · 10 répétitions', holdSec: 8, restSec: 8, reps: 10, prepSec: 3 },
      { id: 'm3-evening-fast', label: 'Rapide · soir', hint: '1 sec / 1 sec · 12 répétitions', holdSec: 1, restSec: 1, reps: 12, prepSec: 2 },
    ],
  },
};

export function findTemplate(id: string): { program: ProgramId; template: SessionTemplate } | undefined {
  for (const program of Object.keys(PROGRAMS) as ProgramId[]) {
    const template = PROGRAMS[program].templates.find((item) => item.id === id);
    if (template) return { program, template };
  }
  return undefined;
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

export function sanitizeConfig(raw: Partial<SessionConfig> | null | undefined): SessionConfig {
  return {
    holdSec: clampInt(raw?.holdSec, 1, 30, 6),
    restSec: clampInt(raw?.restSec, 1, 30, 6),
    reps: clampInt(raw?.reps, 1, 60, 10),
    prepSec: clampInt(raw?.prepSec, 0, 10, 3),
  };
}
