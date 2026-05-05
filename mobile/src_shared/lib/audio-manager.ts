
"use client"

import { Howl } from 'howler';
import type { SoundSettings } from './types';

const DEFAULT_SOUNDS: SoundSettings = {
  success: 'https://actions.google.com/sounds/v1/events/positive_feedback.ogg',
  error: 'https://actions.google.com/sounds/v1/events/negative_feedback.ogg',
  tick: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
  timeout: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg',
  fanfare: 'https://actions.google.com/sounds/v1/events/victory_music.ogg'
};

class AudioManager {
  private static instance: AudioManager;
  private audioCache: Map<string, Howl> = new Map();
  private soundConfig: SoundSettings = DEFAULT_SOUNDS;

  private constructor() {
    // A inicialização real ocorre via init() para garantir que tenhamos acesso ao Firestore se necessário
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }
  
  public init(config: Partial<SoundSettings>) {
    this.soundConfig = { ...DEFAULT_SOUNDS, ...config };
    // Limpa o cache para forçar o recarregamento se os sons mudaram
    this.audioCache.clear();
    // Preload opcional dos novos sons
    Object.entries(this.soundConfig).forEach(([key, url]) => {
      if (key !== 'library' && typeof url === 'string' && url !== 'none') {
        this.getSound(url);
      }
    });
  }

  private getSound(url: string): Howl {
    if (!url) {
      // Retorna um Howl vazio para evitar falhas se a URL for inválida
      return new Howl({ src: ['data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='] });
    }

    let sound = this.audioCache.get(url);
    if (!sound) {
      sound = new Howl({
        src: [url],
        html5: !url.startsWith('data:audio'), // Use HTML5 audio apenas para URLs reais, não para Base64
        preload: true,
      });
      this.audioCache.set(url, sound);
    }
    return sound;
  }

  private play(url: string, volume: number = 0.5) {
    if (typeof window === 'undefined') return;
    
    try {
      const sound = this.getSound(url);
      sound.stop(); // Garante que o som pare antes de tocar novamente, evitando sobreposição
      sound.volume(volume);
      sound.play();
    } catch (e) {
      console.error("Erro ao reproduzir som:", e);
    }
  }

  public playSuccess() { this.play(this.soundConfig.success, 0.4); }
  public playError() { this.play(this.soundConfig.error, 0.4); }
  public playTick() { this.play(this.soundConfig.tick, 0.2); }
  public playTimeout() { this.play(this.soundConfig.timeout, 0.5); }
  public playFanfare() { this.play(this.soundConfig.fanfare, 0.4); }
}

export const audioManager = AudioManager.getInstance();
