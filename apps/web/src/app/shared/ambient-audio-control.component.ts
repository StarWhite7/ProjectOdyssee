import { Component, ViewChild, computed, effect, inject, input } from '@angular/core';
import type { AfterViewInit, ElementRef, OnDestroy } from '@angular/core';
import { AmbientAudioService } from './ambient-audio.service';

@Component({
  selector: 'app-ambient-audio-control',
  host: {
    '[class.sidebar-placement]': "placement() === 'sidebar'",
  },
  template: `
    <audio #audio loop preload="none" src="/audio/odyssee-ambient.mp3"></audio>
    <div class="audio-panel" [class.playing]="audioState.playing()">
      <button
        type="button"
        class="audio-control"
        [attr.aria-pressed]="audioState.playing()"
        [attr.aria-label]="label()"
        (click)="toggle()"
      >
        <span class="audio-icon" aria-hidden="true">{{
          volumePercent() === 0 ? 'x' : audioState.playing() ? '♫' : '♪'
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
      position: fixed;
      right: clamp(1rem, 3vw, 3rem);
      bottom: clamp(1rem, 3vw, 2.3rem);
      z-index: 40;
    }
    :host.sidebar-placement {
      right: auto;
      left: clamp(1.2rem, 2vw, 1.9rem);
      bottom: clamp(1rem, 3vh, 2.5rem);
      width: clamp(13rem, 14.5vw, 14.2rem);
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
    :host.sidebar-placement .audio-panel {
      min-height: clamp(6.2rem, 12vh, 8.2rem);
      padding: clamp(0.8rem, 1.2vh, 1rem);
      border-radius: 0.85rem;
      align-items: stretch;
      justify-content: center;
      flex-direction: column;
      gap: clamp(0.5rem, 1vh, 0.8rem);
      background: rgba(20, 30, 70, 0.35);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
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
    :host.sidebar-placement .audio-control {
      width: 100%;
      min-height: auto;
      padding: 0;
      justify-content: flex-start;
      gap: 0.65rem;
      line-height: 1.35;
    }
    :host.sidebar-placement .audio-label {
      white-space: normal;
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
    :host.sidebar-placement .divider {
      display: none;
    }
    .volume-control {
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }
    :host.sidebar-placement .volume-control {
      width: 100%;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.55rem 0.8rem;
    }
    :host.sidebar-placement .volume-control::before {
      content: 'Volume';
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.72rem;
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
    :host.sidebar-placement input[type='range'] {
      width: 100%;
      grid-column: 1 / -1;
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
    :host.sidebar-placement output {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
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
    @media (max-width: 900px) {
      :host {
        right: 1rem;
        top: auto;
        bottom: 1rem;
      }
      :host.sidebar-placement {
        right: 1rem;
        left: auto;
        width: auto;
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
      :host.sidebar-placement .audio-panel {
        min-height: 2.65rem;
        padding: 0.35rem 0.75rem 0.35rem 0.45rem;
        border-radius: 999px;
        align-items: center;
        flex-direction: row;
      }
      :host.sidebar-placement .divider {
        display: block;
      }
      :host.sidebar-placement .volume-control {
        display: flex;
      }
      :host.sidebar-placement .volume-control::before {
        content: none;
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
export class AmbientAudioControlComponent implements AfterViewInit, OnDestroy {
  readonly placement = input<'corner' | 'sidebar'>('corner');
  protected readonly audioState = inject(AmbientAudioService);
  @ViewChild('audio') private audioRef?: ElementRef<HTMLAudioElement>;
  readonly volumePercent = this.audioState.volumePercent;
  readonly label = computed(() => {
    if (this.audioState.unavailable()) return 'Musique indisponible';
    if (this.audioState.playing()) return 'Mettre la musique en pause';
    return this.audioState.preferredEnabled() ? 'Reprendre la musique' : 'Activer la musique';
  });
  private fadeTimer?: ReturnType<typeof setInterval>;
  private hasStarted = false;

  constructor() {
    effect(() => {
      const preferred = this.audioState.preferredEnabled();
      const playing = this.audioState.playing();
      const audio = this.audioRef?.nativeElement;
      if (!audio) return;
      this.syncPlayback(audio, preferred, playing);
    });
  }

  ngAfterViewInit(): void {
    const audio = this.audioRef?.nativeElement;
    if (!audio) return;
    audio.volume = this.volumePercent() / 100;
    this.syncPlayback(audio);
  }

  async toggle(): Promise<void> {
    const audio = this.audioRef?.nativeElement;
    if (!audio) return;
    if (this.audioState.playing()) {
      this.stopFade();
      audio.pause();
      this.audioState.setPlaying(false);
      return;
    }

    this.audioState.setPreferredEnabled(true);
    await this.start(audio);
  }

  private async start(audio: HTMLAudioElement): Promise<void> {
    const targetVolume = this.volumePercent() / 100;
    audio.volume = 0;
    try {
      await audio.play();
      this.hasStarted = true;
      this.audioState.setPlaying(true);
      this.fadeTo(audio, targetVolume);
    } catch {
      this.audioState.setUnavailable();
    }
  }

  private syncPlayback(
    audio: HTMLAudioElement,
    preferred = this.audioState.preferredEnabled(),
    playing = this.audioState.playing(),
  ): void {
    if (!preferred) {
      this.stopFade();
      if (this.hasStarted || !audio.paused) audio.pause();
      return;
    }
    if (!playing) void this.start(audio);
  }

  ngOnDestroy(): void {
    this.stopFade();
  }

  setVolume(event: Event): void {
    const requested = Number((event.target as HTMLInputElement).value);
    const percentage = this.audioState.setVolumePercent(requested);
    const volume = percentage / 100;
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
}
