import { Component, ViewChild, signal } from '@angular/core';
import type { ElementRef, OnDestroy } from '@angular/core';

const ENABLED_KEY = 'odyssee-ambient-audio-enabled';
const VOLUME_KEY = 'odyssee-ambient-audio-volume';
const DEFAULT_VOLUME = 0.2;

@Component({
  selector: 'app-ambient-audio-control',
  template: `
    <audio #audio loop preload="none" src="/audio/odyssee-ambient.mp3"></audio>
    <button
      type="button"
      class="audio-control"
      [class.playing]="playing()"
      [attr.aria-pressed]="playing()"
      [attr.aria-label]="label()"
      (click)="toggle()"
    >
      <span class="audio-icon" aria-hidden="true">{{ playing() ? '♫' : '♪' }}</span>
      <span>{{ label() }}</span>
    </button>
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
    .audio-control {
      min-height: 2.65rem;
      padding: 0.55rem 0.9rem;
      border: 1px solid rgba(255, 255, 255, 0.48);
      border-radius: 999px;
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
    .audio-control:hover {
      transform: translateY(-1px);
      background: rgba(30, 39, 84, 0.35);
    }
    .audio-control.playing .audio-icon {
      animation: pulse 2.2s ease-in-out infinite;
    }
    .audio-icon {
      font-size: 1rem;
    }
    button:focus-visible {
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
      .audio-control span:last-child {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
      }
      .audio-control {
        width: 2.8rem;
        padding: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .audio-control,
      .audio-control.playing .audio-icon {
        animation: none;
        transition: none;
      }
    }
  `,
})
export class AmbientAudioControlComponent implements OnDestroy {
  @ViewChild('audio') private audioRef?: ElementRef<HTMLAudioElement>;
  readonly playing = signal(false);
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

    const targetVolume = this.savedVolume();
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
      const saved = Number(localStorage.getItem(VOLUME_KEY));
      return Number.isFinite(saved) && saved >= 0.05 && saved <= 0.4 ? saved : DEFAULT_VOLUME;
    } catch {
      return DEFAULT_VOLUME;
    }
  }
}
