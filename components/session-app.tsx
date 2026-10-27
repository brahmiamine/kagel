'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PROGRAMS, findTemplate, sanitizeConfig, type ProgramId, type SessionConfig } from '../lib/programs';
import { advanceTimer, createTimer, progressPercent, skipPhase, type Phase, type TimerState } from '../lib/timer';

const STORAGE_KEY = 'kagel-settings-v2';
const LEGACY_STORAGE_KEY = 'kegel-settings-v1';
const BASE = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
const DEFAULT_PRESET = PROGRAMS.month1.templates[1];
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function Glyph({ name, size = 20 }: { name: 'play' | 'pause' | 'reset' | 'skip' | 'settings' | 'sound' | 'spark' | 'check' | 'arrow' | 'minus' | 'plus' | 'close' | 'download'; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  switch (name) {
    case 'play': return <svg {...common}><path d="m8 5 12 7-12 7z" fill="currentColor" stroke="none" /></svg>;
    case 'pause': return <svg {...common}><path d="M8 5v14M16 5v14" strokeWidth="3.5" /></svg>;
    case 'reset': return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>;
    case 'skip': return <svg {...common}><path d="m4 5 10 7-10 7zM19 5v14" /></svg>;
    case 'settings': return <svg {...common}><path d="M4 7h16M4 17h16M9 4v6M15 14v6" /><circle cx="9" cy="7" r="2" fill="currentColor" /><circle cx="15" cy="17" r="2" fill="currentColor" /></svg>;
    case 'sound': return <svg {...common}><path d="M11 5 6 9H3v6h3l5 4zM15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12" /></svg>;
    case 'spark': return <svg {...common}><path d="m12 2 1.9 7.1L21 11l-7.1 1.9L12 20l-1.9-7.1L3 11l7.1-1.9zM19 18l.7 2.3L22 21l-2.3.7L19 24l-.7-2.3L16 21l2.3-.7z" /></svg>;
    case 'check': return <svg {...common}><path d="m4 12 5 5L20 6" /></svg>;
    case 'arrow': return <svg {...common}><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
    case 'minus': return <svg {...common}><path d="M5 12h14" /></svg>;
    case 'plus': return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case 'close': return <svg {...common}><path d="m5 5 14 14M19 5 5 19" /></svg>;
    case 'download': return <svg {...common}><path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4" /></svg>;
  }
}

function BrandMark({ size = 40 }: { size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="16" fill="#173f3d"/><circle cx="24" cy="24" r="16" stroke="#81dfbd" strokeOpacity=".35" strokeWidth="2"/><circle cx="24" cy="24" r="12" stroke="#81dfbd" strokeWidth="2.5"/><path d="m19 24 4 4 7-9" stroke="#81dfbd" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (enabled: boolean) => void }) {
  return <label className="toggle-row">
    <span><strong>{label}</strong><small>{description}</small></span>
    <input type="checkbox" className="sr-only" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span className={'switch' + (checked ? ' switch-on' : '')} aria-hidden="true"><span /></span>
  </label>;
}

const PHASE_LABELS: Record<Phase, { title: string; message: string; eyebrow: string }> = {
  prep: { title: 'On se prépare', message: 'Installez-vous confortablement et respirez.', eyebrow: 'PRÉPARATION' },
  hold: { title: 'Contractez', message: 'Contractez doucement, sans bloquer votre souffle.', eyebrow: 'CONTRACTION' },
  rest: { title: 'Relâchez', message: 'Relâchez complètement et respirez librement.', eyebrow: 'RELAXATION' },
  done: { title: 'Bien joué !', message: 'Votre séance est terminée. Prenez un instant pour vous.', eyebrow: 'SÉANCE TERMINÉE' },
};

export default function SessionApp() {
  const [mode, setMode] = useState<ProgramId>('month1');
  const [templateId, setTemplateId] = useState(DEFAULT_PRESET.id);
  const [config, setConfig] = useState<SessionConfig>(sanitizeConfig(DEFAULT_PRESET));
  const [timer, setTimer] = useState<TimerState>(() => createTimer(sanitizeConfig(DEFAULT_PRESET)));
  const [sound, setSound] = useState(true);
  const [vibrate, setVibrate] = useState(false);
  const [titleCount, setTitleCount] = useState(false);
  const [manualCount, setManualCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [installHelp, setInstallHelp] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [draft, setDraft] = useState<SessionConfig>(config);
  const [hydrated, setHydrated] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const installEvent = useRef<InstallEvent | null>(null);
  const previousPhase = useRef<Phase | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  const beep = useCallback((frequency = 820) => {
    if (!sound) return;
    try {
      const audio = audioRef.current;
      if (!audio || audio.state !== 'running') return;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.065, audio.currentTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.16);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.17);
    } catch { /* Browser may block audio. */ }
  }, [sound]);

  const unlockAudio = useCallback(() => {
    if (!sound) return;
    try {
      if (!audioRef.current) {
        const Audio = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Audio) audioRef.current = new Audio();
      }
      void audioRef.current?.resume();
    } catch { /* Audio is optional. */ }
  }, [sound]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored) {
        const raw = JSON.parse(stored) as Partial<SessionConfig> & { template?: string; mode?: ProgramId; sound?: boolean; vibrate?: boolean; title?: boolean };
        const found = findTemplate(raw.template || '');
        const selected = found?.template || DEFAULT_PRESET;
        const next = sanitizeConfig({
          holdSec: raw.holdSec ?? selected.holdSec,
          restSec: raw.restSec ?? selected.restSec,
          reps: raw.reps ?? selected.reps,
          prepSec: raw.prepSec ?? selected.prepSec,
        });
        setMode(found?.program || 'month1');
        setTemplateId(selected.id);
        setConfig(next);
        setDraft(next);
        setTimer(createTimer(next));
        setSound(raw.sound ?? true);
        setVibrate(raw.vibrate ?? false);
        setTitleCount(raw.title ?? false);
      }
    } catch { /* Ignore corrupted local storage. */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, mode, template: templateId, sound, vibrate, title: titleCount }));
    } catch { /* Private mode may disable storage. */ }
  }, [config, mode, templateId, sound, vibrate, titleCount, hydrated]);

  useEffect(() => {
    if (!timer.running) return;
    let previous = Date.now();
    const interval = window.setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(0, (now - previous) / 1000);
      previous = now;
      setTimer((current) => advanceTimer(current, config, elapsed));
    }, 100);
    return () => window.clearInterval(interval);
  }, [timer.running, config]);

  useEffect(() => {
    if (!hydrated) return;
    if (previousPhase.current !== null && previousPhase.current !== timer.phase) {
      beep(timer.phase === 'done' ? 1100 : timer.phase === 'rest' ? 610 : 860);
      if (vibrate && typeof navigator.vibrate === 'function') {
        navigator.vibrate(timer.phase === 'done' ? [80, 60, 80] : 70);
      }
    }
    previousPhase.current = timer.phase;
  }, [timer.phase, hydrated, beep, vibrate]);

  useEffect(() => {
    document.title = titleCount && timer.phase !== 'done'
      ? String(Math.max(0, Math.ceil(timer.secondsLeft))) + 's · ' + timer.completed + '/' + config.reps + ' | Kagel'
      : timer.phase === 'done' ? 'Séance terminée ✓ | Kagel' : 'Kagel — Votre séance de Kegel';
  }, [titleCount, timer.phase, timer.secondsLeft, timer.completed, config.reps]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handle = () => { void navigator.serviceWorker.register(BASE + '/sw.js', { scope: BASE + '/' }).catch(() => {}); };
    if (document.readyState === 'complete') handle();
    else window.addEventListener('load', handle, { once: true });
    return () => window.removeEventListener('load', handle);
  }, []);

  useEffect(() => {
    const installHandler = (event: Event) => {
      event.preventDefault();
      installEvent.current = event as InstallEvent;
      setCanInstall(true);
    };
    const installedHandler = () => {
      installEvent.current = null;
      setCanInstall(false);
      setInstallHelp(false);
    };
    window.addEventListener('beforeinstallprompt', installHandler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', installHandler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const start = useCallback(() => {
    unlockAudio();
    setTimer((current) => {
      const next = current.phase === 'done' ? createTimer(config) : current;
      return { ...next, running: true };
    });
  }, [config, unlockAudio]);
  const pause = useCallback(() => setTimer((current) => ({ ...current, running: false })), []);
  const reset = useCallback(() => setTimer(createTimer(config)), [config]);
  const skip = useCallback(() => setTimer((current) => skipPhase(current, config)), [config]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (settingsOpen || target?.closest('input, select, textarea, button, [contenteditable]')) {
        if (event.key === 'Escape') setSettingsOpen(false);
        return;
      }
      const code = event.code;
      if (code === 'Space' || code === 'KeyS' || code === 'KeyR') {
        event.preventDefault();
        if (code === 'Space') timer.running ? pause() : start();
        else if (code === 'KeyS') skip();
        else reset();
      }
      if (event.key === 'Escape') setSettingsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [timer.running, settingsOpen, start, pause, skip, reset]);

  useEffect(() => {
    if (!settingsOpen) return;
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettingsOpen(false);
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); lastFocusRef.current?.focus(); };
  }, [settingsOpen]);

  const openSettings = () => {
    lastFocusRef.current = document.activeElement as HTMLElement | null;
    pause();
    setDraft({ ...config });
    setSettingsOpen(true);
  };
  const applyPreset = (nextMode: ProgramId, nextId?: string) => {
    const next = PROGRAMS[nextMode].templates.find((item) => item.id === nextId) || PROGRAMS[nextMode].templates[0];
    const values = sanitizeConfig(next);
    setMode(nextMode);
    setTemplateId(next.id);
    setConfig(values);
    setDraft(values);
    setTimer(createTimer(values));
  };
  const applyDraft = () => {
    const next = sanitizeConfig(draft);
    setConfig(next);
    setTimer(createTimer(next));
    setSettingsOpen(false);
  };
  const install = async () => {
    const event = installEvent.current;
    if (event) {
      await event.prompt();
      await event.userChoice;
      installEvent.current = null;
      setCanInstall(false);
    } else {
      setInstallHelp((value) => !value);
    }
  };

  const template = PROGRAMS[mode].templates.find((entry) => entry.id === templateId) || PROGRAMS[mode].templates[0];
  const phase = PHASE_LABELS[timer.phase];
  const progress = progressPercent(timer, config);
  const currentRep = Math.min(timer.completed + (timer.phase === 'done' ? 0 : 1), config.reps);

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand"><BrandMark /><div><strong>Kagel<span className="brand-dot">.</span></strong><small>Le bien-être à votre rythme</small></div></div>
        <div className="top-actions">
          <span className="status-pill"><span className="pulse-dot" /> Votre espace personnel</span>
          <button className="button button-outline install-button" onClick={() => void install()} type="button"><Glyph name="download" size={17} /> {canInstall ? 'Installer' : 'L’application'}</button>
          <button className="button icon-only" type="button" onClick={openSettings} aria-label="Ouvrir les réglages"><Glyph name="settings" /></button>
        </div>
      </header>

      {installHelp && <div className="install-note" role="status">Sur iPhone : Safari → Partager → « Sur l’écran d’accueil ». Sur Android : menu Chrome → « Installer l’application ».</div>}

      <section className="welcome">
        <div><p className="overline">VOTRE RITUEL BIEN-ÊTRE <span className="little-star">✦</span></p><h1>Un moment pour <em>vous.</em></h1><p className="welcome-subtitle">De petites séances guidées pour avancer sereinement, une respiration à la fois.</p></div>
        <div className="welcome-decoration" aria-hidden="true"><span className="deco-line deco-one" /><span className="deco-line deco-two" /><span className="deco-center">✺</span></div>
      </section>

      <main className="dashboard">
        <section className="program-panel surface">
          <div className="panel-heading"><span className="section-icon">✦</span><div><h2>Votre programme</h2><p>Choisissez votre rythme</p></div></div>
          <div className="program-list" role="group" aria-label="Choix du programme">
            {(Object.keys(PROGRAMS) as ProgramId[]).map((id, index) => {
              const program = PROGRAMS[id];
              return <button key={id} type="button" className={'program-option' + (mode === id ? ' chosen' : '')} onClick={() => applyPreset(id)} aria-pressed={mode === id}>
                <span className="program-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="program-copy"><strong>{program.name}</strong><small>{program.subtitle}</small></span>
                <span className="program-select" aria-hidden="true">{mode === id ? <Glyph name="check" size={16} /> : <Glyph name="arrow" size={16} />}</span>
              </button>;
            })}
          </div>
          <div className="program-detail">
            <span className="eyebrow-green">SÉANCE DU JOUR</span>
            <label htmlFor="session-select">Type de séance</label>
            <select id="session-select" className="styled-select" value={templateId} onChange={(event) => applyPreset(mode, event.target.value)}>
              {PROGRAMS[mode].templates.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <p className="template-hint">{template.hint}</p>
            <p className="program-summary">{PROGRAMS[mode].summary}</p>
          </div>
          <button type="button" className="link-button" onClick={openSettings}><Glyph name="settings" size={17} /> Personnaliser ma séance <Glyph name="arrow" size={16} /></button>
        </section>

        <section className={'focus-panel surface phase-' + timer.phase} aria-label="Minuteur de la séance">
          <div className="focus-top"><span className="session-tag"><span className="session-tag-dot" /> {PROGRAMS[mode].label} / {template.label}</span><span className="focus-side-label">MA SÉANCE</span></div>
          <div className="focus-intro"><h2>{phase.title}</h2><p aria-live="polite">{phase.message}</p></div>
          <div className="timer-stage">
            <div className="ring-shadow" />
            <div className="timer-ring" style={{ background: 'conic-gradient(#53bf9a ' + progress + '%, #e9f1ed ' + progress + '% 100%)' }}>
              <div className="timer-inner">
                <span className="phase-eyebrow">{phase.eyebrow}</span>
                {timer.phase === 'done' ? <div className="completed-symbol"><Glyph name="check" size={68} /></div> : <span className="timer-digits" role="timer" aria-live="off">{Math.max(0, Math.ceil(timer.secondsLeft)).toString().padStart(2, '0')}</span>}
                <span className="seconds-label">{timer.phase === 'done' ? 'à bientôt !' : 'secondes'}</span>
              </div>
            </div>
            <div className="float-spark left-spark" aria-hidden="true">✳</div><div className="float-spark right-spark" aria-hidden="true">✦</div>
          </div>
          <div className="progress-info"><span>Progression de la séance</span><strong>{Math.round(progress)}%</strong></div>
          <div className="thin-progress" role="progressbar" aria-label="Progression de la séance" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{ width: progress + '%' }} /></div>
          <div className="main-actions">
            <button className="button main-button" type="button" onClick={timer.running ? pause : start}><Glyph name={timer.running ? 'pause' : 'play'} size={22} />{timer.running ? 'Mettre en pause' : timer.phase === 'done' ? 'Recommencer' : timer.completed === 0 && timer.phase === (config.prepSec ? 'prep' : 'hold') && timer.secondsLeft === (config.prepSec || config.holdSec) ? 'Démarrer la séance' : 'Reprendre la séance'}</button>
            <button className="button square-button" type="button" aria-label="Passer la phase" title="Passer la phase" onClick={skip} disabled={timer.phase === 'done'}><Glyph name="skip" /></button>
            <button className="button square-button" type="button" aria-label="Réinitialiser" title="Réinitialiser" onClick={reset}><Glyph name="reset" /></button>
          </div>
          <div className="timer-microcopy">Prenez votre temps. Le plus important, c’est la régularité.</div>
        </section>

        <aside className="side-column">
          <section className="stats-panel surface">
            <div className="panel-heading"><span className="section-icon muted-icon">◷</span><div><h2>Votre progression</h2><p>En temps réel</p></div></div>
            <div className="reps-stats"><div><span className="eyebrow">RÉPÉTITIONS</span><div className="rep-count"><strong>{timer.completed}</strong><span> / {config.reps}</span></div></div><span className="rep-circle"><Glyph name="spark" size={21} /></span></div>
            <div className="reps-dots" aria-hidden="true">{Array.from({ length: Math.min(config.reps, 20) }, (_, index) => <span key={index} className={index < timer.completed ? 'filled' : ''} />)}</div>
            <p className="stat-footnote">Répétition {timer.phase === 'done' ? config.reps : currentRep} sur {config.reps}</p>
            <div className="stat-divider" />
            <div className="durations"><div><small>Contraction</small><strong>{config.holdSec} <span>sec</span></strong></div><div><small>Repos</small><strong>{config.restSec} <span>sec</span></strong></div></div>
          </section>
          <section className="counter-panel surface"><div className="panel-heading"><span className="section-icon yellow-icon">＋</span><div><h2>Compteur libre</h2><p>À utiliser à votre façon</p></div></div><div className="counter-controls"><button className="counter-secondary" onClick={() => setManualCount(0)} type="button" aria-label="Remettre le compteur à zéro"><Glyph name="reset" size={19} /></button><strong aria-live="polite">{manualCount}</strong><button className="counter-add" type="button" onClick={() => { unlockAudio(); beep(920); setManualCount((count) => count + 1); }} aria-label="Ajouter une répétition"><Glyph name="plus" size={24} /></button></div></section>
          <section className="motivation-card"><span className="motivation-emoji" aria-hidden="true">☘</span><h2>Un pas après l’autre.</h2><p>Gardez une respiration naturelle et relâchez pleinement entre chaque contraction.</p></section>
        </aside>
      </main>

      <footer className="page-footer"><span>Kagel · Une pause qui vous fait du bien</span><span>Raccourcis clavier : Espace · Pause/Lecture &nbsp; S · Passer &nbsp; R · Recommencer</span></footer>
      <p className="health-note">Ces suggestions ne remplacent pas un avis médical. En cas de douleur, arrêtez la séance et consultez un professionnel de santé.</p>

      {settingsOpen && <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
        <div className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" ref={dialogRef}>
          <div className="dialog-title"><div><span className="overline">À VOTRE RYTHME</span><h2 id="settings-title">Personnaliser la séance</h2></div><button className="dialog-close" onClick={() => setSettingsOpen(false)} type="button" aria-label="Fermer"><Glyph name="close" /></button></div>
          <div className="settings-fields">
            {([
              ['holdSec', 'Contraction', 'secondes', 1, 30],
              ['restSec', 'Relaxation', 'secondes', 1, 30],
              ['reps', 'Répétitions', 'par séance', 1, 60],
              ['prepSec', 'Préparation', 'secondes', 0, 10],
            ] as const).map(([key, label, unit, min, max]) => (
              <label className="field-wrapper" key={key}><span>{label} <small>{unit}</small></span><input type="number" inputMode="numeric" min={min} max={max} value={draft[key]} onChange={(event) => setDraft((prev) => ({ ...prev, [key]: event.target.value === '' ? 0 : Number(event.target.value) }))} /></label>
            ))}
          </div>
          <div className="dialog-subhead">PREFERENCES</div>
          <div className="toggle-list">
            <Toggle label="Signaux sonores" description="Un son à chaque changement de phase" checked={sound} onChange={setSound} />
            <Toggle label="Vibration" description="Si votre appareil est compatible" checked={vibrate} onChange={setVibrate} />
            <Toggle label="Compte à rebours dans l’onglet" description="Pratique sur ordinateur" checked={titleCount} onChange={setTitleCount} />
          </div>
          <p className="save-caption">Vos préférences restent uniquement sur cet appareil.</p>
          <div className="dialog-actions"><button className="button button-quiet" type="button" onClick={() => { const preset = sanitizeConfig(PROGRAMS[mode].templates.find((x) => x.id === templateId) || DEFAULT_PRESET); setDraft(preset); }}>Réinitialiser les valeurs</button><button className="button button-save" onClick={applyDraft} type="button"><Glyph name="check" size={19} /> Enregistrer</button></div>
        </div>
      </div>}
    </div>
  );
}
