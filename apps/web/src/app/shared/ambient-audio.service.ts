import { Injectable, signal } from '@angular/core';

const ENABLED_KEY = 'odyssee-ambient-audio-enabled';
const VOLUME_KEY = 'odyssee-ambient-audio-volume';
const DEFAULT_VOLUME = 0.2;

@Injectable({ providedIn: 'root' })
export class AmbientAudioService {
  readonly playing = signal(false);
  readonly unavailable = signal(false);
  readonly preferredEnabled = signal(this.readEnabled());
  readonly volumePercent = signal(Math.round(this.readVolume() * 100));

  setPlaying(value: boolean): void {
    this.playing.set(value);
    this.unavailable.set(false);
    this.setPreferredEnabled(value);
  }

  setPreferredEnabled(value: boolean): void {
    this.preferredEnabled.set(value);
    this.write(ENABLED_KEY, String(value));
    if (!value) this.playing.set(false);
  }

  setUnavailable(): void {
    this.playing.set(false);
    this.unavailable.set(true);
  }

  setVolumePercent(value: number): number {
    const percentage = Math.min(100, Math.max(0, Number.isFinite(value) ? Math.round(value) : 0));
    this.volumePercent.set(percentage);
    this.write(VOLUME_KEY, String(percentage / 100));
    return percentage;
  }

  private readEnabled(): boolean {
    try {
      return localStorage.getItem(ENABLED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private readVolume(): number {
    try {
      const stored = localStorage.getItem(VOLUME_KEY);
      if (stored === null) return DEFAULT_VOLUME;
      const saved = Number(stored);
      return Number.isFinite(saved) && saved >= 0 && saved <= 1 ? saved : DEFAULT_VOLUME;
    } catch {
      return DEFAULT_VOLUME;
    }
  }

  private write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage can be unavailable in tests or strict privacy contexts.
    }
  }
}
