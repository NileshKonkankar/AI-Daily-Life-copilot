/**
 * Sound utility for satisfying, low-latency audio feedback chimes
 * Uses Web Audio API with smooth envelope shaping and graceful fallbacks.
 */

const SOUND_STORAGE_KEY = 'copilot_sound_enabled';
const VOLUME_STORAGE_KEY = 'copilot_sound_volume';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(SOUND_STORAGE_KEY);
  return stored === null ? true : stored === 'true';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'true' : 'false');
}

export function getSoundVolume(): number {
  if (typeof window === 'undefined') return 0.6;
  const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
  if (stored === null) return 0.6;
  const parsed = parseFloat(stored);
  return isNaN(parsed) ? 0.6 : Math.max(0, Math.min(1, parsed));
}

export function setSoundVolume(volume: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VOLUME_STORAGE_KEY, Math.max(0, Math.min(1, volume)).toString());
}

/**
 * Plays a subtle, polished ascending chime on task completion.
 * Inspired by modern accomplishment cues (soft marimba / glass harp timbre).
 */
export function playCompletionChime(options?: { isBulk?: boolean; volumeMultiplier?: number }): void {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext();
  const baseVolume = getSoundVolume() * (options?.volumeMultiplier ?? 1);
  if (baseVolume <= 0.001) return;

  if (ctx) {
    try {
      const now = ctx.currentTime;
      const isBulk = !!options?.isBulk;

      // Note definitions (frequencies in Hz for a sparkling, uplifting pentatonic/major chord)
      // Standard: E5 (659.25), G#5 (830.61), B5 (987.77), E6 (1318.51)
      const notes = isBulk
        ? [
            { freq: 523.25, time: 0.0, dur: 0.5, gain: 0.22 }, // C5
            { freq: 659.25, time: 0.08, dur: 0.6, gain: 0.25 }, // E5
            { freq: 783.99, time: 0.16, dur: 0.7, gain: 0.28 }, // G5
            { freq: 1046.50, time: 0.24, dur: 0.9, gain: 0.32 }, // C6
          ]
        : [
            { freq: 659.25, time: 0.0, dur: 0.35, gain: 0.2 }, // E5
            { freq: 830.61, time: 0.06, dur: 0.45, gain: 0.24 }, // G#5
            { freq: 1046.50, time: 0.12, dur: 0.65, gain: 0.28 }, // C6
          ];

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(Math.min(1, baseVolume * 0.7), now);
      masterGain.connect(ctx.destination);

      notes.forEach(({ freq, time, dur, gain: noteGainLevel }) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        
        // Soft, rich acoustic chime timbre: combination of sine with subtle triangle overtone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        // Gentle overtone shimmer
        const overtone = ctx.createOscillator();
        const overtoneGain = ctx.createGain();
        overtone.type = 'triangle';
        overtone.frequency.setValueAtTime(freq * 2, now + time);

        // Envelope: Instant silky attack (~10ms) to avoid click, exponential soft release
        const startTime = now + time;
        const endTime = startTime + dur;

        noteGain.gain.setValueAtTime(0.0001, startTime);
        noteGain.gain.exponentialRampToValueAtTime(noteGainLevel, startTime + 0.012);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

        overtoneGain.gain.setValueAtTime(0.0001, startTime);
        overtoneGain.gain.exponentialRampToValueAtTime(noteGainLevel * 0.15, startTime + 0.01);
        overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur * 0.6);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        overtone.connect(overtoneGain);
        overtoneGain.connect(masterGain);

        osc.start(startTime);
        osc.stop(endTime);

        overtone.start(startTime);
        overtone.stop(endTime);
      });

      return;
    } catch {
      // Fallback to HTML5 Audio element below if AudioContext fails
    }
  }

  // Graceful fallback using a dynamically generated synthesized chime via HTML5 Audio
  try {
    playHtml5AudioFallback(baseVolume);
  } catch {
    // Ignore audio error gracefully
  }
}

/**
 * Fallback synthesizer that generates a tiny data URI PCM WAV audio chime for HTML5 Audio object
 */
function playHtml5AudioFallback(volume: number) {
  try {
    const sampleRate = 22050;
    const duration = 0.5;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new Uint8Array(44 + numSamples * 2);
    
    // Simple WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) buffer[offset + i] = str.charCodeAt(i);
    };
    const writeUint32 = (offset: number, val: number) => {
      buffer[offset] = val & 0xff;
      buffer[offset + 1] = (val >> 8) & 0xff;
      buffer[offset + 2] = (val >> 16) & 0xff;
      buffer[offset + 3] = (val >> 24) & 0xff;
    };
    const writeUint16 = (offset: number, val: number) => {
      buffer[offset] = val & 0xff;
      buffer[offset + 1] = (val >> 8) & 0xff;
    };

    writeString(0, 'RIFF');
    writeUint32(4, 36 + numSamples * 2);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    writeUint32(16, 16);
    writeUint16(20, 1); // PCM
    writeUint16(22, 1); // Mono
    writeUint32(24, sampleRate);
    writeUint32(28, sampleRate * 2);
    writeUint16(32, 2); // Block align
    writeUint16(34, 16); // 16-bit
    writeString(36, 'data');
    writeUint32(40, numSamples * 2);

    // Render smooth dual chime into buffer
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 8);
      const s1 = Math.sin(2 * Math.PI * 784 * t);
      const s2 = Math.sin(2 * Math.PI * 1046 * t);
      const sample = Math.max(-1, Math.min(1, (s1 * 0.6 + s2 * 0.4) * env * volume));
      const intSample = Math.floor(sample * 32767);
      buffer[44 + i * 2] = intSample & 0xff;
      buffer[44 + i * 2 + 1] = (intSample >> 8) & 0xff;
    }

    let binary = '';
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    const base64 = btoa(binary);
    const audio = new Audio(`data:audio/wav;base64,${base64}`);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch(() => {});
  } catch {
    // Silent fail
  }
}
