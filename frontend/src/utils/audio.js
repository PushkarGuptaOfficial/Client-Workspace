// Audio notification utilities using Web Audio API
let audioContext = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

// Play a notification tone
export const playNotificationSound = (type = 'message') => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'agent') {
      // Higher pitched, friendly tone for agent messages (visitor side)
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1); // C#6
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.25);
    } else {
      // Lower pitched, attention tone for visitor messages (agent side)
      oscillator.frequency.setValueAtTime(523, ctx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.08); // E5
      oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.16); // G5
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    console.log('Audio notification not available:', e);
  }
};

// Debounce to prevent excessive sounds
let lastSoundTime = 0;
const SOUND_DEBOUNCE_MS = 500;

export const playNotificationDebounced = (type = 'message') => {
  const now = Date.now();
  if (now - lastSoundTime > SOUND_DEBOUNCE_MS) {
    lastSoundTime = now;
    playNotificationSound(type);
  }
};
