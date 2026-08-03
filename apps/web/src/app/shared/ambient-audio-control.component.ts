import { Component, ViewChild, signal } from '@angular/core';
import type { ElementRef, OnDestroy } from '@angular/core';

const ENABLED_KEY = 'odyssee-ambient-audio-enabled';
const VOLUME_KEY = 'odyssee-ambient-audio-volume';
const DEFAULT_VOLUME = 0.2;

@Component({
  selector: 'app-ambient-audio-control',
  template: `
    <audio #audio loop preload="none" src="/audio/odyssee-ambient.mp3"></audio>
    <div class="audio-panel" [class.playing]="playing()">
      <button
        type="button"
        class="audio-control"
        [attr.aria-pressed]="playing()"
        [attr.aria-label]="label()"
        (click)="toggle()"
      >
        <span class="audio-icon" aria-hidden="true">{{
          volumePercent() === 0 ? '×' : playing() ? '♫' : '♪'
        }}</span>
        <span class="audio-label">{{ label() }}</span>
      </button>
      <span class="divider" aria-hidden="true"></span>
      <label class="volume-control">
        <span class="sr-only">Volume de la musique</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          [value]="volumePercent()"
          [style.--volume]="volumePercent() + '%'"
          [attr.aria-valuetext]="volumePercent() + ' %'"
          (input)="setVolume($event)"
        />
        <output>{{ volumePercent() }}%</output>
      </label>
    </div>
  `,
  styles: `
    :host {
      position: absolute;
      right: clamp(1rem, 3vw, 3rem);
      bottom: clamp(1rem, 3vw, 2.3rem);
      z-index: 12;
    }
    audio {
      display: none;
    }
    .audio-panel {
      min-height: 2.65rem;
      padding: 0.35rem 0.75rem 0.35rem 0.45rem;
      border: 1px solid rgba(255, 255, 255, 0.48);
      border-radius: 999px;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      color: rgba(255, 255, 255, 0.9);
      background: rgba(30, 39, 84, 0.22);
      box-shadow: 0 8px 24px rgba(15, 22, 55, 0.12);
      backdrop-filter: blur(9px);
      font-size: 0.77rem;
      font-weight: 500;
      transition:
        background 0.2s ease,
        transform 0.2s ease;
    }
    .audio-panel:hover,
    .audio-panel:focus-within {
      transform: translateY(-1px);
      background: rgba(30, 39, 84, 0.35);
    }
    .audio-control {
      min-height: 1.9rem;
      padding: 0.25rem 0.35rem;
      color: inherit;
      background: transparent;
      box-shadow: none;
      font-size: inherit;
      font-weight: inherit;
      white-space: nowrap;
    }
    .audio-panel.playing .audio-icon {
      animation: pulse 2.2s ease-in-out infinite;
    }
    .audio-icon {
      display: inline-grid;
      width: 1rem;
      place-items: center;
      font-size: 1rem;
    }
    .divider {
      width: 1px;
      height: 1.3rem;
      background: rgba(255, 255, 255, 0.3);
    }
    .volume-control {
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }
    input[type='range'] {
      width: 5.5rem;
      height: 3px;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 999px;
      appearance: none;
      cursor: pointer;
      background: linear-gradient(
        90deg,
        #d8d2ff 0 var(--volume),
        rgba(255, 255, 255, 0.28) var(--volume) 100%
      );
    }
    input[type='range']::-webkit-slider-thumb {
      width: 0.75rem;
      height: 0.75rem;
      border: 2px solid rgba(255, 255, 255, 0.9);
      border-radius: 50%;
      appearance: none;
      background: #7765c7;
      box-shadow: 0 2px 8px rgba(19, 24, 66, 0.35);
    }
    input[type='range']::-moz-range-thumb {
      width: 0.6rem;
      height: 0.6rem;
      border: 2px solid rgba(255, 255, 255, 0.9);
      border-radius: 50%;
      background: #7765c7;
      box-shadow: 0 2px 8px rgba(19, 24, 66, 0.35);
    }
    output {
      min-width: 2rem;
      color: rgba(255, 255, 255, 0.78);
      font-size: 0.68rem;
      font-variant-numeric: tabular-nums;
      text-align: right;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    button:focus-visible,
    input:focus-visible {
      outline: 3px solid #fff;
      outline-offset: 3px;
    }
    @keyframes pulse {
      50% {
        opacity: 0.5;
        transform: scale(0.9);
      }
    }
    @media (max-width: 540px) {
      :host {
        right: 1rem;
        bottom: 1rem;
      }
      .audio-label,
      output {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
      }
      .audio-panel {
        gap: 0.4rem;
        padding-right: 0.65rem;
      }
      input[type='range'] {
        width: 4.2rem;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .audio-panel,
      .audio-panel.playing .audio-icon {
        animation: none;
        transition: none;
      }
    }
  `,
})
export class AmbientAudioControlComponent implements OnDestroy {
  @ViewChild('audio') private audioRef?: ElementRef<HTMLAudioElement>;
  readonly playing = signal(false);
  readonly volumePercent = signal(Math.round(this.savedVolume() * 100));
  readonly label = signal(this.preferredEnabled() ? 'Reprendre la musique' : 'Activer la musique');
  private fadeTimer?: ReturnType<typeof setInterval>;

  async toggle(): Promise<void> {
    const audio = this.audioRef?.nativeElement;
    if (!audio) return;
    if (this.playing()) {
      this.stopFade();
      audio.pause();
      this.playing.set(false);
      this.label.set('Reprendre la musique');
      localStorage.setItem(ENABLED_KEY, 'false');
      return;
    }

    const targetVolume = this.volumePercent() / 100;
    audio.volume = 0;
    try {
      await audio.play();
      this.playing.set(true);
      this.label.set('Mettre la musique en pause');
      localStorage.setItem(ENABLED_KEY, 'true');
      localStorage.setItem(VOLUME_KEY, String(targetVolume));
      this.fadeTo(audio, targetVolume);
    } catch {
      this.playing.set(false);
      this.label.set('Musique indisponible');
    }
  }

  ngOnDestroy(): void {
    this.stopFade();
  }

  setVolume(event: Event): void {
    const requested = Number((event.target as HTMLInputElement).value);
    const percentage = Math.min(100, Math.max(0, Number.isFinite(requested) ? requested : 0));
    const volume = percentage / 100;
    this.volumePercent.set(percentage);
    localStorage.setItem(VOLUME_KEY, String(volume));
    const audio = this.audioRef?.nativeElement;
    if (audio) {
      this.stopFade();
      audio.volume = volume;
    }
  }

  private fadeTo(audio: HTMLAudioElement, target: number): void {
    this.stopFade();
    this.fadeTimer = setInterval(() => {
      audio.volume = Math.min(target, audio.volume + 0.02);
      if (audio.volume >= target) this.stopFade();
    }, 80);
  }

  private stopFade(): void {
    if (this.fadeTimer) clearInterval(this.fadeTimer);
    this.fadeTimer = undefined;
  }

  private preferredEnabled(): boolean {
    try {
      return localStorage.getItem(ENABLED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private savedVolume(): number {
    try {
      const stored = localStorage.getItem(VOLUME_KEY);
      if (stored === null) return DEFAULT_VOLUME;
      const saved = Number(stored);
      return Number.isFinite(saved) && saved >= 0 && saved <= 1 ? saved : DEFAULT_VOLUME;
    } catch {
      return DEFAULT_VOLUME;
    }
  }
}
