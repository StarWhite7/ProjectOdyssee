import { DOCUMENT } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-header',
  imports: [RouterLink],
  template: `
    <header class="home-header">
      <a class="home-brand" routerLink="/" aria-label="Projet Odyssée, accueil">
        <svg class="compass" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="21" />
          <circle cx="32" cy="32" r="4" />
          <path d="M32 2v60M2 32h60M11 11l42 42M53 11 11 53" />
          <path class="needle" d="m32 8 5 19 19 5-19 5-5 19-5-19-19-5 19-5Z" />
        </svg>
        <span><small>Projet</small>Odyssée</span>
      </a>

      <nav class="desktop-nav" aria-label="Navigation principale">
        <a class="active" href="#accueil" aria-current="page">Accueil</a>
        <a href="#comment-jouer">Comment jouer</a>
        <a href="#fonctionnalites">Fonctionnalités</a>
        <a href="#a-propos">À propos</a>
      </nav>

      <div class="desktop-actions">
        <a class="nav-button ghost" routerLink="/connexion">Se connecter</a>
        <a class="nav-button primary" routerLink="/tableau-de-bord">Commencer une aventure</a>
      </div>

      <button
        class="menu-toggle"
        type="button"
        aria-label="Ouvrir le menu"
        aria-controls="mobile-navigation"
        [attr.aria-expanded]="menuOpen()"
        (click)="toggleMenu()"
      >
        <span></span><span></span><span></span>
      </button>
    </header>

    @if (menuOpen()) {
      <div class="menu-backdrop" (click)="closeMenu()"></div>
      <nav id="mobile-navigation" class="mobile-nav" aria-label="Navigation mobile">
        <a href="#accueil" (click)="closeMenu()">Accueil</a>
        <a href="#comment-jouer" (click)="closeMenu()">Comment jouer</a>
        <a href="#fonctionnalites" (click)="closeMenu()">Fonctionnalités</a>
        <a href="#a-propos" (click)="closeMenu()">À propos</a>
        <div class="mobile-actions">
          <a class="nav-button ghost" routerLink="/connexion" (click)="closeMenu()">Se connecter</a>
          <a class="nav-button primary" routerLink="/tableau-de-bord" (click)="closeMenu()">
            Commencer une aventure
          </a>
        </div>
      </nav>
    }
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0 0 auto;
      z-index: 20;
      color: #17203e;
    }
    .home-header {
      height: clamp(5.5rem, 8vw, 7.5rem);
      padding: 0 clamp(1.25rem, 4vw, 4rem);
      display: grid;
      grid-template-columns: minmax(190px, 1fr) auto minmax(300px, 1fr);
      align-items: center;
      gap: 2rem;
    }
    .home-brand {
      display: inline-flex;
      width: max-content;
      align-items: center;
      gap: 0.75rem;
      color: inherit;
      text-decoration: none;
      font:
        500 1.65rem 'Newsreader',
        serif;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }
    .home-brand small {
      display: block;
      margin-bottom: 0.15rem;
      font:
        500 0.66rem 'DM Sans',
        sans-serif;
      letter-spacing: 0.35em;
    }
    .compass {
      width: 4.25rem;
      height: 4.25rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 0.75;
      opacity: 0.8;
    }
    .compass .needle {
      fill: rgba(255, 255, 255, 0.1);
      stroke-width: 1;
    }
    .desktop-nav {
      display: flex;
      align-items: center;
      gap: clamp(1.6rem, 3.4vw, 4rem);
    }
    .desktop-nav a {
      position: relative;
      color: inherit;
      text-decoration: none;
      font-size: 0.96rem;
      white-space: nowrap;
      transition: color 0.2s ease;
    }
    .desktop-nav a:hover {
      color: #5144a0;
    }
    .desktop-nav .active::after {
      content: '✦';
      position: absolute;
      top: 1.55rem;
      left: 50%;
      width: 3.8rem;
      border-top: 1px solid rgba(255, 255, 255, 0.75);
      color: #fff6d9;
      font-size: 0.55rem;
      line-height: 0;
      text-align: center;
      transform: translateX(-50%);
    }
    .desktop-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.9rem;
    }
    .nav-button {
      min-height: 3rem;
      padding: 0.75rem clamp(1.1rem, 1.8vw, 2rem);
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      text-decoration: none;
      font-size: 0.88rem;
      white-space: nowrap;
      transition:
        transform 0.2s ease,
        box-shadow 0.2s ease,
        background 0.2s ease;
    }
    .nav-button:hover {
      transform: translateY(-2px);
    }
    .nav-button.ghost {
      border: 1px solid rgba(255, 255, 255, 0.78);
      background: rgba(255, 255, 255, 0.09);
      backdrop-filter: blur(8px);
    }
    .nav-button.primary {
      background: linear-gradient(120deg, #6551b8, #293c83);
      box-shadow: 0 10px 28px rgba(48, 43, 120, 0.25);
    }
    .menu-toggle {
      display: none;
      justify-self: end;
      width: 2.8rem;
      height: 2.8rem;
      padding: 0.7rem;
      border: 1px solid rgba(255, 255, 255, 0.7);
      background: rgba(255, 255, 255, 0.18);
      color: #17203e;
      box-shadow: none;
    }
    .menu-toggle span {
      display: block;
      width: 100%;
      height: 1px;
      margin: 0.23rem 0;
      background: currentColor;
    }
    .menu-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 20, 47, 0.22);
    }
    .mobile-nav {
      position: fixed;
      top: 4.8rem;
      right: 1rem;
      left: 1rem;
      display: grid;
      gap: 0.2rem;
      padding: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.65);
      border-radius: 1.4rem;
      background: rgba(235, 239, 255, 0.88);
      box-shadow: 0 25px 70px rgba(25, 29, 69, 0.25);
      backdrop-filter: blur(18px);
    }
    .mobile-nav > a {
      padding: 0.8rem 1rem;
      color: #17203e;
      text-decoration: none;
      border-radius: 0.75rem;
    }
    .mobile-nav > a:hover {
      background: rgba(255, 255, 255, 0.5);
    }
    .mobile-actions {
      display: grid;
      grid-template-columns: 1fr 1.4fr;
      gap: 0.6rem;
      margin-top: 0.6rem;
    }
    .mobile-actions .ghost {
      color: #29345b;
      border-color: rgba(62, 68, 118, 0.35);
    }
    a:focus-visible,
    button:focus-visible {
      outline: 3px solid #fff;
      outline-offset: 3px;
    }
    @media (max-width: 1120px) {
      .home-header {
        grid-template-columns: 1fr auto;
      }
      .desktop-nav,
      .desktop-actions {
        display: none;
      }
      .menu-toggle {
        display: block;
      }
    }
    @media (max-width: 540px) {
      .home-header {
        height: 5rem;
        padding-inline: 1rem;
      }
      .home-brand {
        font-size: 1.18rem;
        gap: 0.5rem;
      }
      .home-brand small {
        font-size: 0.5rem;
      }
      .compass {
        width: 3rem;
        height: 3rem;
      }
      .mobile-actions {
        grid-template-columns: 1fr;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      * {
        transition-duration: 0.01ms !important;
      }
    }
  `,
})
export class HomeHeaderComponent implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.setMenuState(!this.menuOpen());
  }

  closeMenu(): void {
    this.setMenuState(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }

  ngOnDestroy(): void {
    this.document.body.style.overflow = '';
  }

  private setMenuState(open: boolean): void {
    this.menuOpen.set(open);
    this.document.body.style.overflow = open ? 'hidden' : '';
  }
}
