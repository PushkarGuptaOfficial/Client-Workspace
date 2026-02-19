// Audio notification utilities

// Simple beep sounds as base64 data URIs (tiny WAV files)
const SOUNDS = {
  // Short high-pitched beep for agent messages (heard by visitor)
  agent: 'data:audio/wav;base64,UklGRl4AAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YToAAAAwgDCAAIAAAACAAIAAAIAAAACAAAAAAQAA/v8AAAEAAAAAAP//AAD//wAAAAABAAAAAAD//wAA',
  // Lower beep for visitor messages (heard by agent)  
  visitor: 'data:audio/wav;base64,UklGRmQAAABXQVZFZm10IBAAAAABAAEAESsAABErAAACABAAZGF0YUAAAABggGCAAIAAAACAAIAAAIAAAACAAAAAAYAA/n8AAAIAAAAAAP7/AAD+/wAAAAACAAAAAQD+/wAA'
};

let lastPlayTime = 0;
const DEBOUNCE_MS = 800;

export const playNotificationSound = (type = 'visitor') => {
  const now = Date.now();
  if (now - lastPlayTime < DEBOUNCE_MS) return;
  
  try {
    const audio = new Audio(SOUNDS[type] || SOUNDS.visitor);
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Autoplay blocked - ignore silently
    });
    lastPlayTime = now;
  } catch (e) {
    // Audio not supported
  }
};

// Alternative using Web Audio API for browsers that block Audio elements
export const playBeep = (frequency = 520, duration = 150, type = 'visitor') => {
  const now = Date.now();
  if (now - lastPlayTime < DEBOUNCE_MS) return;
  
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    
    oscillator.frequency.value = type === 'agent' ? 880 : 520;
    oscillator.type = 'sine';
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
    
    lastPlayTime = now;
    
    // Clean up
    setTimeout(() => ctx.close(), duration + 100);
  } catch (e) {
    // Web Audio not supported
  }
};

// Combined function that tries both methods
export const playNotification = (type = 'visitor') => {
  playNotificationSound(type);
};
