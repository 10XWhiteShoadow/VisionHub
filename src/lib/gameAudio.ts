/**
 * Game Audio System using Web Audio API
 * Generates retro 8-bit style sound effects and background music
 */

class GameAudioManager {
  private audioContext: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMusicPlaying = false;
  private musicInterval: number | null = null;
  private musicEnabled = true;
  private sfxEnabled = true;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.musicGain = this.audioContext.createGain();
      this.musicGain.gain.value = 0.15;
      this.musicGain.connect(this.audioContext.destination);
      
      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = 0.3;
      this.sfxGain.connect(this.audioContext.destination);
    }
    
    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    
    return this.audioContext;
  }

  // Play a simple tone
  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "square",
    gainNode?: GainNode,
    fadeOut = true
  ) {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    if (fadeOut) {
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    }
    
    osc.connect(gain);
    gain.connect(gainNode || this.sfxGain || ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  // Wing flap / jump sound
  playFlap() {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.sfxGain || ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  // Score point sound
  playScore() {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    
    // Two-tone ascending chime
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      const startTime = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
      
      osc.connect(gain);
      gain.connect(this.sfxGain || ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  // Collision / game over sound
  playGameOver() {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    
    // Descending crash sound
    const frequencies = [400, 300, 200, 150];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      const startTime = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
      
      osc.connect(gain);
      gain.connect(this.sfxGain || ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  // Game start sound
  playStart() {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    
    // Ascending fanfare
    const frequencies = [262, 330, 392, 523];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      const startTime = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
      
      osc.connect(gain);
      gain.connect(this.sfxGain || ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }

  // Simple looping background music
  startMusic() {
    if (!this.musicEnabled || this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    
    const playMusicLoop = () => {
      if (!this.isMusicPlaying || !this.musicEnabled) return;
      
      const ctx = this.getContext();
      
      // Simple 8-bit style melody
      const melody = [
        { note: 392, duration: 0.2 },  // G4
        { note: 440, duration: 0.2 },  // A4
        { note: 494, duration: 0.2 },  // B4
        { note: 523, duration: 0.4 },  // C5
        { note: 494, duration: 0.2 },  // B4
        { note: 440, duration: 0.2 },  // A4
        { note: 392, duration: 0.4 },  // G4
        { note: 330, duration: 0.2 },  // E4
        { note: 349, duration: 0.2 },  // F4
        { note: 392, duration: 0.4 },  // G4
        { note: 440, duration: 0.2 },  // A4
        { note: 392, duration: 0.2 },  // G4
        { note: 349, duration: 0.2 },  // F4
        { note: 330, duration: 0.4 },  // E4
      ];
      
      let time = ctx.currentTime;
      
      melody.forEach(({ note, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = "triangle";
        osc.frequency.setValueAtTime(note, time);
        
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.setValueAtTime(0.1, time + duration * 0.8);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        
        osc.connect(gain);
        gain.connect(this.musicGain || ctx.destination);
        
        osc.start(time);
        osc.stop(time + duration);
        
        time += duration;
      });
      
      // Bass line
      const bass = [
        { note: 196, duration: 0.8 },  // G3
        { note: 220, duration: 0.8 },  // A3
        { note: 165, duration: 0.8 },  // E3
        { note: 175, duration: 0.8 },  // F3
      ];
      
      let bassTime = ctx.currentTime;
      bass.forEach(({ note, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(note, bassTime);
        
        gain.gain.setValueAtTime(0.15, bassTime);
        gain.gain.setValueAtTime(0.15, bassTime + duration * 0.9);
        gain.gain.exponentialRampToValueAtTime(0.01, bassTime + duration);
        
        osc.connect(gain);
        gain.connect(this.musicGain || ctx.destination);
        
        osc.start(bassTime);
        osc.stop(bassTime + duration);
        
        bassTime += duration;
      });
    };
    
    // Play immediately and loop
    playMusicLoop();
    this.musicInterval = window.setInterval(playMusicLoop, 3200);
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  toggleMusic(): boolean {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) {
      this.stopMusic();
    }
    return this.musicEnabled;
  }

  toggleSfx(): boolean {
    this.sfxEnabled = !this.sfxEnabled;
    return this.sfxEnabled;
  }

  isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  // Cleanup
  dispose() {
    this.stopMusic();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
export const gameAudio = new GameAudioManager();
