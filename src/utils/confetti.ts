import confetti from 'canvas-confetti';

const CONFETTI_STORAGE_KEY = 'copilot_confetti_enabled';

/**
 * Check if celebratory confetti animations are enabled in user settings
 */
export function isConfettiEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(CONFETTI_STORAGE_KEY);
  return stored === null ? true : stored === 'true';
}

/**
 * Set celebratory confetti preference in local storage
 */
export function setConfettiEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONFETTI_STORAGE_KEY, enabled ? 'true' : 'false');
}

/**
 * Checks if the user prefers reduced motion
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Vibrant celebratory color palette matching modern productivity palettes
const CELEBRATION_COLORS = [
  '#10b981', // Emerald green
  '#3b82f6', // Bright blue
  '#f59e0b', // Amber gold
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

/**
 * Triggers a celebratory confetti animation when a single task is marked as completed.
 * Accepts optional normalized screen coordinates (0 to 1) for localized burst origin.
 */
export function fireTaskCompletionConfetti(origin?: { x: number; y: number }): void {
  if (!isConfettiEnabled() || prefersReducedMotion()) return;

  const defaultOrigin = origin || { x: 0.5, y: 0.7 };

  // Center / localized burst
  confetti({
    particleCount: 50,
    angle: 90,
    spread: 65,
    origin: defaultOrigin,
    colors: CELEBRATION_COLORS,
    startVelocity: 32,
    gravity: 0.9,
    scalar: 0.9,
    ticks: 200,
    shapes: ['square', 'circle'],
  });

  // Dual side celebratory accents for extra delight
  setTimeout(() => {
    confetti({
      particleCount: 25,
      angle: 60,
      spread: 45,
      origin: { x: Math.max(0.05, (origin?.x ?? 0.5) - 0.2), y: Math.min(0.9, (origin?.y ?? 0.7) + 0.05) },
      colors: CELEBRATION_COLORS,
      startVelocity: 25,
      gravity: 0.95,
      scalar: 0.8,
      ticks: 160,
    });

    confetti({
      particleCount: 25,
      angle: 120,
      spread: 45,
      origin: { x: Math.min(0.95, (origin?.x ?? 0.5) + 0.2), y: Math.min(0.9, (origin?.y ?? 0.7) + 0.05) },
      colors: CELEBRATION_COLORS,
      startVelocity: 25,
      gravity: 0.95,
      scalar: 0.8,
      ticks: 160,
    });
  }, 100);
}

/**
 * Grand celebration confetti for bulk actions (multiple tasks completed at once)
 */
export function fireBulkCompletionConfetti(): void {
  if (!isConfettiEnabled() || prefersReducedMotion()) return;

  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    colors: CELEBRATION_COLORS,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  // Wave 1: Fast small pop
  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });

  // Wave 2: Wider medium spray
  fire(0.2, {
    spread: 60,
  });

  // Wave 3: Massive wide shower
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });

  // Wave 4: Floating glitter
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });

  // Wave 5: High power finish
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}

/**
 * Fires a celebratory milestone celebration (e.g. weekly goal reached)
 */
export function fireMilestoneConfetti(): void {
  if (!isConfettiEnabled() || prefersReducedMotion()) return;

  const duration = 2.5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 999 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    // since particles fall down, start a bit higher than random
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: CELEBRATION_COLORS,
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: CELEBRATION_COLORS,
    });
  }, 250);
}
