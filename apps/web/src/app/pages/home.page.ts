import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, ViewChild } from '@angular/core';
import type { AfterViewInit, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AmbientAudioControlComponent } from '../shared/ambient-audio-control.component';
import { HomeHeaderComponent } from '../shared/home-header.component';

@Component({
  selector: 'app-home',
  imports: [RouterLink, HomeHeaderComponent, AmbientAudioControlComponent],
  template: `
    <main id="main" class="home">
      <section id="accueil" class="hero" aria-labelledby="hero-title">
        <video
          #backgroundVideo
          class="hero-video"
          autoplay
          muted
          loop
          playsinline
          preload="metadata"
          aria-hidden="true"
        >
          <source src="/video/odyssee-background.mp4" type="video/mp4" />
        </video>
        <div class="veil veil-left"></div>
        <div class="veil veil-light"></div>
        <div class="veil veil-edges"></div>
        <div class="mist" aria-hidden="true"></div>

        <app-home-header />

        <div class="hero-content">
          <h1 id="hero-title">Votre histoire.<br />Votre <em>odyssée.</em></h1>
          <div class="ornament" aria-hidden="true"><span></span></div>
          <p>
            Projet Odyssée est une expérience narrative<br class="desktop-break" />
            coopérative où chaque choix façonne votre aventure.<br class="desktop-break" />
            Partez à deux, écrivez votre légende.
          </p>
          <div class="hero-actions">
            <a class="hero-button primary" routerLink="/tableau-de-bord">
              Commencer une aventure <span aria-hidden="true">✦</span>
            </a>
            <a class="hero-button secondary" href="#comment-jouer">
              Comment ça marche ? <span aria-hidden="true">›</span>
            </a>
          </div>
        </div>

        <a class="scroll-indicator" href="#comment-jouer" aria-label="Découvrir comment jouer">
          <span class="mouse" aria-hidden="true"><i></i></span>
          <span>Découvrir</span>
          <span class="chevron" aria-hidden="true"></span>
        </a>
        <app-ambient-audio-control />
      </section>

      <section id="comment-jouer" class="story-section" aria-labelledby="how-title">
        <p class="section-kicker">Une aventure à deux</p>
        <h2 id="how-title">Imaginez. Décidez. Découvrez.</h2>
        <div class="steps" id="fonctionnalites">
          <article>
            <span>01</span>
            <h3>Imaginez</h3>
            <p>Choisissez librement votre univers, son ton et vos limites.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Décidez en secret</h3>
            <p>Chaque personnage agit sans voir la décision actuelle de l’autre.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Découvrez</h3>
            <p>Vos intentions fusionnent en une nouvelle scène cohérente.</p>
          </article>
        </div>
        <p id="a-propos" class="about">
          Odyssée laisse les joueurs écrire leur histoire. L’IA relie leurs choix et veille à la
          cohérence du récit.
        </p>
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
      color: #17203e;
      background: #eef1fb;
    }
    .home {
      overflow: hidden;
    }
    .hero {
      position: relative;
      min-height: 100svh;
      overflow: hidden;
      isolation: isolate;
      background: linear-gradient(135deg, #dce5f5, #8799c5);
    }
    .hero-video {
      position: absolute;
      z-index: -4;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center center;
    }
    .veil {
      position: absolute;
      z-index: -3;
      inset: 0;
      pointer-events: none;
    }
    .veil-left {
      background: linear-gradient(
        90deg,
        rgba(232, 237, 250, 0.34) 0%,
        rgba(239, 240, 249, 0.12) 35%,
        transparent 62%
      );
    }
    .veil-light {
      background: radial-gradient(ellipse at 25% 47%, rgba(255, 250, 235, 0.32), transparent 39%);
      animation: light-breathe 12s ease-in-out infinite alternate;
    }
    .veil-edges {
      background: linear-gradient(
        180deg,
        rgba(29, 39, 79, 0.15),
        transparent 23%,
        transparent 72%,
        rgba(26, 34, 75, 0.24)
      );
    }
    .mist {
      position: absolute;
      z-index: -2;
      inset: 50% -15% -15%;
      opacity: 0.16;
      filter: blur(22px);
      background:
        radial-gradient(ellipse at 25% 50%, #fff 0 12%, transparent 40%),
        radial-gradient(ellipse at 72% 70%, #fff 0 10%, transparent 38%);
      animation: mist-drift 30s ease-in-out infinite alternate;
      pointer-events: none;
    }
    .hero-content {
      position: relative;
      z-index: 2;
      width: min(42rem, calc(100% - 2rem));
      padding-top: clamp(11rem, 28svh, 18.5rem);
      margin-left: clamp(2rem, 9.2vw, 9rem);
      text-shadow: 0 1px 18px rgba(255, 255, 255, 0.34);
    }
    h1 {
      max-width: none;
      margin: 0;
      color: #17203e;
      font:
        500 clamp(4rem, 5vw, 4.8rem)/0.98 'Newsreader',
        serif;
      letter-spacing: -0.025em;
    }
    h1 em {
      color: #5144a0;
      font-style: normal;
    }
    .ornament {
      position: relative;
      width: 8.5rem;
      margin: 1.6rem 0 1.4rem;
      border-top: 1px solid rgba(61, 69, 111, 0.42);
    }
    .ornament span {
      position: absolute;
      left: 47%;
      top: -0.3rem;
      width: 0.55rem;
      height: 0.55rem;
      background: #5c6380;
      transform: rotate(45deg);
    }
    .hero-content p {
      margin: 0;
      color: #1d2948;
      font-size: clamp(0.98rem, 1.15vw, 1.1rem);
      line-height: 1.85;
      font-weight: 500;
    }
    .hero-actions {
      display: flex;
      gap: 1.25rem;
      margin-top: 2rem;
    }
    .hero-button {
      min-height: 3.1rem;
      padding: 0.8rem 1.85rem;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      text-decoration: none;
      font-size: 0.92rem;
      font-weight: 500;
      transition:
        transform 0.2s ease,
        filter 0.2s ease,
        box-shadow 0.2s ease;
    }
    .hero-button:hover {
      transform: translateY(-2px);
    }
    .hero-button.primary {
      color: white;
      background: linear-gradient(120deg, #6654bd, #354999);
      box-shadow: 0 14px 30px rgba(55, 49, 129, 0.24);
    }
    .hero-button.primary:hover {
      filter: brightness(1.08);
      box-shadow: 0 17px 36px rgba(55, 49, 129, 0.32);
    }
    .hero-button.secondary {
      color: #263054;
      border: 1px solid rgba(70, 71, 138, 0.45);
      background: rgba(255, 255, 255, 0.18);
      backdrop-filter: blur(8px);
    }
    .hero-button.secondary span {
      font-size: 1.65rem;
      line-height: 0.5;
    }
    .scroll-indicator {
      position: absolute;
      z-index: 5;
      bottom: 1.7rem;
      left: 50%;
      display: grid;
      justify-items: center;
      gap: 0.45rem;
      color: rgba(255, 255, 255, 0.94);
      text-decoration: none;
      font-size: 0.87rem;
      transform: translateX(-50%);
      text-shadow: 0 2px 12px rgba(21, 30, 69, 0.45);
    }
    .mouse {
      width: 1.5rem;
      height: 2.35rem;
      border: 1px solid currentColor;
      border-radius: 1rem;
      display: grid;
      justify-items: center;
    }
    .mouse i {
      width: 3px;
      height: 5px;
      margin-top: 0.5rem;
      border-radius: 3px;
      background: currentColor;
      animation: scroll-dot 2.2s ease-in-out infinite;
    }
    .chevron {
      width: 0.65rem;
      height: 0.65rem;
      border-right: 1px solid currentColor;
      border-bottom: 1px solid currentColor;
      transform: rotate(45deg);
    }
    .story-section {
      min-height: 90svh;
      padding: clamp(5rem, 10vw, 9rem) clamp(1.25rem, 8vw, 8rem);
      text-align: center;
      background: radial-gradient(circle at 50% 0, #fff 0, #edf0fb 55%, #e2e7f5);
    }
    .section-kicker {
      color: #6554ad;
      text-transform: uppercase;
      letter-spacing: 0.22em;
      font-size: 0.72rem;
      font-weight: 600;
    }
    .story-section h2 {
      color: #17203e;
      font-size: clamp(2.6rem, 5vw, 4.5rem);
      font-weight: 500;
    }
    .steps {
      width: min(70rem, 100%);
      margin: 4rem auto 0;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      text-align: left;
    }
    .steps article {
      padding: 2rem;
      border: 1px solid rgba(61, 70, 116, 0.15);
      border-radius: 1.5rem;
      background: rgba(255, 255, 255, 0.5);
    }
    .steps span {
      color: #6554ad;
      font-size: 0.75rem;
      letter-spacing: 0.1em;
    }
    .steps h3 {
      color: #17203e;
      font-size: 1.7rem;
    }
    .steps p,
    .about {
      color: #59617b;
    }
    .about {
      max-width: 44rem;
      margin: 5rem auto 0;
    }
    a:focus-visible {
      outline: 3px solid white;
      outline-offset: 3px;
    }
    @keyframes mist-drift {
      to {
        transform: translate3d(3%, -1%, 0);
        opacity: 0.23;
      }
    }
    @keyframes light-breathe {
      to {
        opacity: 0.72;
      }
    }
    @keyframes scroll-dot {
      0%,
      100% {
        transform: translateY(0);
        opacity: 0.35;
      }
      50% {
        transform: translateY(0.75rem);
        opacity: 1;
      }
    }
    @media (max-width: 1120px) {
      .hero-content {
        padding-top: clamp(10rem, 25svh, 14rem);
        margin-left: clamp(1.5rem, 6vw, 4rem);
      }
      .hero-video {
        object-position: 58% center;
      }
    }
    @media (max-width: 780px) {
      .hero-content {
        width: min(35rem, calc(100% - 2rem));
        padding-top: clamp(9rem, 24svh, 12rem);
        margin-inline: auto;
      }
      .veil-left {
        background: linear-gradient(
          90deg,
          rgba(230, 236, 249, 0.62),
          rgba(239, 241, 250, 0.28) 80%
        );
      }
      .hero-video {
        object-position: 62% center;
      }
      .steps {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 540px) {
      .hero-content {
        padding-top: clamp(8rem, 21svh, 10rem);
      }
      h1 {
        font-size: clamp(2.9rem, 13vw, 3.6rem);
      }
      .ornament {
        margin-block: 1.2rem;
      }
      .hero-content p {
        font-size: 0.92rem;
        line-height: 1.65;
      }
      .desktop-break {
        display: none;
      }
      .hero-actions {
        display: grid;
        gap: 0.7rem;
        margin-top: 1.4rem;
      }
      .hero-button {
        width: 100%;
      }
      .scroll-indicator {
        bottom: 1.2rem;
        font-size: 0.76rem;
      }
      .mouse {
        display: none;
      }
    }
    @media (max-height: 690px) {
      .hero-content {
        padding-top: 7rem;
      }
      .ornament {
        margin-block: 0.8rem;
      }
      .hero-actions {
        margin-top: 1rem;
      }
      .scroll-indicator {
        display: none;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      html {
        scroll-behavior: auto;
      }
      .mist,
      .veil-light,
      .mouse i {
        animation: none;
      }
      .hero-button {
        transition: none;
      }
    }
  `,
})
export class HomePage implements AfterViewInit {
  @ViewChild('backgroundVideo') private backgroundVideo?: ElementRef<HTMLVideoElement>;
  private readonly platformId = inject(PLATFORM_ID);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.playBackgroundVideo();
  }

  private playBackgroundVideo(): void {
    const video = this.backgroundVideo?.nativeElement;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    void video.play().catch(() => undefined);
  }
}
