import type { SessionConfig } from './programs.ts';

export type Phase = 'prep' | 'hold' | 'rest' | 'done';

export interface TimerState {
  phase: Phase;
  secondsLeft: number;
  completed: number;
  running: boolean;
}

export function createTimer(config: SessionConfig): TimerState {
  return {
    phase: config.prepSec > 0 ? 'prep' : 'hold',
    secondsLeft: config.prepSec > 0 ? config.prepSec : config.holdSec,
    completed: 0,
    running: false,
  };
}

function transition(timer: TimerState, config: SessionConfig): TimerState {
  switch (timer.phase) {
    case 'prep':
      return { ...timer, phase: 'hold', secondsLeft: config.holdSec };
    case 'hold':
      return { ...timer, phase: 'rest', secondsLeft: config.restSec };
    case 'rest': {
      const completed = timer.completed + 1;
      if (completed >= config.reps) {
        return { phase: 'done', secondsLeft: 0, completed: config.reps, running: false };
      }
      return { ...timer, phase: 'hold', secondsLeft: config.holdSec, completed };
    }
    case 'done':
      return timer;
  }
}

/** Processes elapsed wall-clock time, including time while the tab is in the background. */
export function advanceTimer(timer: TimerState, config: SessionConfig, elapsedSeconds: number): TimerState {
  if (!timer.running || timer.phase === 'done' || !Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return timer;
  let next = { ...timer };
  let remaining = elapsedSeconds;
  // Hard upper bound is 1 preparation + 2 * 60 reps, even if tab was hidden for hours.
  for (let i = 0; i < config.reps * 2 + 2 && next.phase !== 'done'; i++) {
    if (remaining < next.secondsLeft) {
      next.secondsLeft -= remaining;
      break;
    }
    remaining -= next.secondsLeft;
    next = transition(next, config);
    if (remaining <= 0) break;
  }
  return next;
}

export function skipPhase(timer: TimerState, config: SessionConfig): TimerState {
  if (timer.phase === 'done') return timer;
  return transition(timer, config);
}

export function progressPercent(timer: TimerState, config: SessionConfig): number {
  if (timer.phase === 'done') return 100;
  let fraction = 0;
  if (timer.phase === 'hold') fraction = (1 - timer.secondsLeft / config.holdSec) / 2;
  if (timer.phase === 'rest') fraction = 0.5 + (1 - timer.secondsLeft / config.restSec) / 2;
  return Math.max(0, Math.min(100, ((timer.completed + fraction) / config.reps) * 100));
}
