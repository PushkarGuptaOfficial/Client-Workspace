// Audio notification utilities with autoplay unlock

let audioContext = null;
let isUnlocked = false;
let lastPlayTime = 0;
const DEBOUNCE_MS = 600;

// Initialize audio context on user interaction
const initAudioContext = () => {
  if (audioContext) return audioContext;
  
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtx();
  } catch (e) {
    console.warn('Web Audio not supported');
  }
  return audioContext;
};

// Unlock audio on first user interaction
const unlockAudio = async () => {
  if (isUnlocked) return;
  
  const ctx = initAudioContext();
  if (!ctx) return;
  
  // Resume if suspended
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  
  // Play silent buffer to unlock
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
  
  isUnlocked = true;
  console.log('Audio unlocked');
};

// Attach unlock to common user interactions
if (typeof window !== 'undefined') {
  const events = ['click', 'touchstart', 'keydown'];
  const unlockHandler = () => {
    unlockAudio();
    events.forEach(e => document.removeEventListener(e, unlockHandler));
  };
  events.forEach(e => document.addEventListener(e, unlockHandler, { once: false, passive: true }));
}

// Play notification beep using Web Audio API
export const playNotification = async (type = 'visitor') => {
  const now = Date.now();
  if (now - lastPlayTime < DEBOUNCE_MS) return;
  lastPlayTime = now;
  
  const ctx = initAudioContext();
  if (!ctx) return;
  
  // Ensure context is running
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      return;
    }
  }
  
  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === 'agent') {
      // Higher tone for agent reply (visitor hears this)
      oscillator.frequency.setValueAtTime(830, now);
      oscillator.frequency.setValueAtTime(1050, now + 0.08);
      gainNode.gain.setValueAtTime(0.25, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      oscillator.start(now);
      oscillator.stop(now + 0.2);
    } else {
      // Lower tone for visitor message (agent hears this)
      oscillator.frequency.setValueAtTime(440, now);
      oscillator.frequency.setValueAtTime(550, now + 0.1);
      oscillator.frequency.setValueAtTime(660, now + 0.2);
      gainNode.gain.setValueAtTime(0.25, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      oscillator.start(now);
      oscillator.stop(now + 0.35);
    }
  } catch (e) {
    console.warn('Audio playback failed:', e);
  }
};

// Export unlock function for manual triggering if needed
export const ensureAudioUnlocked = unlockAudio;
