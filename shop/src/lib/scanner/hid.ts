// Lightweight HID-wedge scanner handler for web apps (keyboard emulation)

export type ScannerConfig = {
  prefix: string; // e.g., '^'
  suffix: string; // e.g., 'Enter' or '\n' or any char(s)
  minLength: number; // e.g., 6
  interKeyDelayMs: number; // consider same scan if between keys <= this
};

export type ScannerCallbacks = {
  onScan: (code: string) => void;
  onRawEvent?: (evt: KeyboardEvent) => void;
  onState?: (state: { active: boolean; buffer: string }) => void;
  beep?: boolean;
};

const DEFAULTS: ScannerConfig = { prefix: '', suffix: 'Enter', minLength: 6, interKeyDelayMs: 40 };

export function loadScannerConfig(): ScannerConfig {
  try {
    const raw = localStorage.getItem('scanner:config');
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed } as ScannerConfig;
  } catch { return DEFAULTS; }
}

export function saveScannerConfig(cfg: Partial<ScannerConfig>) {
  const next = { ...loadScannerConfig(), ...cfg };
  localStorage.setItem('scanner:config', JSON.stringify(next));
}

export function attachScanner(cb: ScannerCallbacks, cfg?: Partial<ScannerConfig>) {
  const config: ScannerConfig = { ...DEFAULTS, ...(cfg||{}) };
  let buffer = '';
  let lastTs = 0;
  let active = false;

  function beep() {
    if (!cb.beep) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880; // A5
      o.connect(g); g.connect(ctx.destination);
      o.start();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      o.stop(ctx.currentTime + 0.16);
      setTimeout(() => ctx.close(), 300);
    } catch {}
  }

  function reset() {
    buffer = '';
    active = false;
    cb.onState?.({ active, buffer });
  }

  function onKeydown(e: KeyboardEvent) {
    cb.onRawEvent?.(e);
    const now = e.timeStamp || Date.now();
    const delta = now - lastTs;
    lastTs = now;

    if (delta > config.interKeyDelayMs && buffer) {
      // Timeout between keys => likely not a scan; reset
      reset();
    }

    const key = e.key;
    const printable = key.length === 1;
    if (!active) {
      if (config.prefix) {
        if (printable && key === config.prefix) { active = true; buffer = ''; e.preventDefault(); e.stopPropagation(); cb.onState?.({ active, buffer }); return; }
      } else {
        // no prefix -> start on fast typing
        active = true; buffer = ''; cb.onState?.({ active, buffer });
      }
    }

    if (key === 'Enter' || key === '\n' || key === '\r') {
      if (config.suffix === 'Enter') {
        e.preventDefault(); e.stopPropagation();
        if (buffer.length >= config.minLength) { cb.onScan(buffer); beep(); }
        reset();
        return;
      }
    }

    if (printable) {
      buffer += key;
      if (config.suffix && config.suffix !== 'Enter' && buffer.endsWith(config.suffix)) {
        const code = buffer.slice(0, -config.suffix.length);
        if (code.length >= config.minLength) { cb.onScan(code); beep(); }
        reset();
        e.preventDefault(); e.stopPropagation();
        return;
      }
      cb.onState?.({ active, buffer });
    }
  }

  window.addEventListener('keydown', onKeydown, true);
  return () => window.removeEventListener('keydown', onKeydown, true);
}
