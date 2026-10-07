/**
 * Web Audio API tick sound generator and Sound Manager.
 * No external audio files used.
 */

let audioCtx = null;
let lastTickTime = 0;

/**
 * Initializes or resumes the Web Audio context after a user gesture.
 */
export function ensureAudioContext() {
  if (typeof window === 'undefined') return null;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Check if the user has enabled sound in their preferences.
 * Default is OFF.
 */
export function isSoundEnabled() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('the_wanted_sound_enabled') === 'true';
}

/**
 * Set sound enabled state and notify listeners.
 */
export function setSoundEnabled(enabled) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('the_wanted_sound_enabled', enabled ? 'true' : 'false');
  if (enabled) {
    ensureAudioContext();
  }
  window.dispatchEvent(new CustomEvent('the_wanted_sound_changed', { detail: { enabled } }));
}

/**
 * Play a short ~25ms mechanical tick sound.
 * Requirements:
 * - Triangle or square oscillator
 * - ~1800-2200 Hz with slight random pitch variation
 * - Fast gain decay (~25ms duration)
 * - Throttled to <= 1 tick every 60ms
 * - Only plays when sound toggle is ON and prefers-reduced-motion is false
 */
export function playTick() {
  if (typeof window === 'undefined') return;
  if (!isSoundEnabled()) return;

  // Check prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const now = performance.now();
  if (now - lastTickTime < 60) {
    return; // Throttled to max 1 tick every 60ms
  }
  lastTickTime = now;

  const ctx = ensureAudioContext();
  if (!ctx || ctx.state !== 'running') return;

  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Triangle oscillator for a clean mechanical snap
    osc.type = 'triangle';

    // 1800 - 2200 Hz with slight random pitch variation (~±4%)
    const baseFreq = 2000;
    const variation = (Math.random() - 0.5) * 300; // ±150Hz
    osc.frequency.setValueAtTime(baseFreq + variation, ctx.currentTime);

    // Fast gain decay envelope ~25ms
    const startTime = ctx.currentTime;
    const duration = 0.025; // 25ms

    gainNode.gain.setValueAtTime(0.08, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.005);
  } catch {
    // Web Audio playback failed or blocked
  }
}
