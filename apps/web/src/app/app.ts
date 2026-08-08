import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, ViewChild, computed, inject } from '@angular/core';
import type { AfterViewInit, ElementRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AmbientAudioControlComponent } from './shared/ambient-audio-control.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AmbientAudioControlComponent],
  template: `<video
      #backgroundVideo
      class="app-background-video"
      autoplay
      muted
      loop
      playsinline
      preload="metadata"
      aria-hidden="true"
    >
      <source src="/video/odyssee-background.mp4" type="video/mp4" />
    </video>
    <a class="skip-link" href="#main">Aller au contenu</a>
    <div class="app-route-shell"><router-outlet /></div>
    <app-ambient-audio-control [placement]="audioPlacement()" />`,
  styleUrl: './app.scss',
})
export class App implements AfterViewInit {
  @ViewChild('backgroundVideo') private backgroundVideo?: ElementRef<HTMLVideoElement>;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );
  readonly audioPlacement = computed(() =>
    this.isDashboardUrl(this.currentUrl()) ? 'sidebar' : 'corner',
  );

  private isDashboardUrl(url: string): boolean {
    const path = url.split(/[?#]/, 1)[0];
    return [
      '/dashboard',
      '/aventures',
      '/invitations',
      '/archives',
      '/parametres',
      '/tableau-de-bord',
    ].some((dashboardPath) => path === dashboardPath || path.startsWith(`${dashboardPath}/`));
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const video = this.backgroundVideo?.nativeElement;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    void video.play().catch(() => undefined);
  }
}
