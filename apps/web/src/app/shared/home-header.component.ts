import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { OdysseeBrandComponent } from './odyssee-brand.component';

@Component({
  selector: 'app-home-header',
  imports: [RouterLink, OdysseeBrandComponent],
  template: `
    <header class="home-header">
      <app-odyssee-brand />

      <nav class="desktop-nav" aria-label="Navigation principale">
        <a class="active" href="#accueil" aria-current="page">Accueil</a>
        <a href="#comment-jouer">Comment jouer</a>
        <a href="#fonctionnalites">Fonctionnalités</a>
        <a href="#a-propos">À propos</a>
      </nav>

      <div class="desktop-actions">
        @if (!auth.ready()) {
          <span class="nav-button ghost loading-auth" aria-label="Session en cours de vérification">
            <span></span>
          </span>
        } @else if (auth.authenticated()) {
          <div
            class="user-menu"
            (mouseenter)="openUserMenu()"
            (mouseleave)="scheduleUserMenuClose()"
          >
            <button
              class="nav-button ghost user-trigger"
              type="button"
              aria-haspopup="menu"
              aria-controls="home-user-menu"
              [attr.aria-expanded]="userMenuOpen()"
              (click)="toggleUserMenu($event)"
              (keydown)="onUserTriggerKeydown($event)"
            >
              <span>{{ userName() }}</span>
              <span class="chevron" aria-hidden="true"></span>
            </button>

            @if (userMenuOpen()) {
              <div
                id="home-user-menu"
                class="user-dropdown"
                role="menu"
                (mouseenter)="cancelUserMenuClose()"
                (mouseleave)="scheduleUserMenuClose()"
                (keydown)="onUserMenuKeydown($event)"
              >
                <a
                  class="menu-item"
                  role="menuitem"
                  routerLink="/tableau-de-bord"
                  data-user-menu-item
                  (click)="closeUserMenu()"
                  >Tableau de bord</a
                >
                <button
                  class="menu-item"
                  type="button"
                  role="menuitem"
                  data-user-menu-item
                  [disabled]="signingOut()"
                  (click)="signOut()"
                >
                  {{ signingOut() ? 'Déconnexion...' : 'Se déconnecter' }}
                </button>
                @if (signOutError()) {
                  <p class="menu-error" aria-live="polite">{{ signOutError() }}</p>
                }
              </div>
            }
          </div>
        } @else {
          <a class="nav-button ghost" routerLink="/connexion">Se connecter</a>
        }
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
          @if (!auth.ready()) {
            <span class="mobile-user loading-auth" aria-label="Session en cours de vérification">
              <span></span>
            </span>
          } @else if (auth.authenticated()) {
            <span class="mobile-user">{{ userName() }}</span>
            <a class="nav-button ghost" routerLink="/tableau-de-bord" (click)="closeMenu()">
              Tableau de bord
            </a>
            <button
              class="nav-button secondary-action"
              type="button"
              [disabled]="signingOut()"
              (click)="signOut()"
            >
              {{ signingOut() ? 'Déconnexion...' : 'Se déconnecter' }}
            </button>
            @if (signOutError()) {
              <p class="menu-error mobile-error" aria-live="polite">{{ signOutError() }}</p>
            }
          } @else {
            <a class="nav-button ghost" routerLink="/connexion" (click)="closeMenu()">
              Se connecter
            </a>
          }
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
      border: 0;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      text-decoration: none;
      font: inherit;
      font-size: 0.88rem;
      white-space: nowrap;
      cursor: pointer;
      transition:
        transform 0.2s ease,
        box-shadow 0.2s ease,
        background 0.2s ease,
        border-color 0.2s ease;
    }
    .nav-button:hover {
      transform: translateY(-2px);
    }
    .nav-button:disabled {
      cursor: wait;
      opacity: 0.72;
      transform: none;
    }
    .nav-button.ghost,
    .mobile-user {
      border: 1px solid rgba(255, 255, 255, 0.78);
      background: rgba(255, 255, 255, 0.09);
      backdrop-filter: blur(8px);
    }
    .nav-button.primary {
      background: linear-gradient(120deg, #6551b8, #293c83);
      box-shadow: 0 10px 28px rgba(48, 43, 120, 0.25);
    }
    .user-menu {
      position: relative;
    }
    .user-trigger {
      gap: 0.65rem;
      max-width: min(15rem, 26vw);
    }
    .user-trigger span:first-child,
    .mobile-user {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .chevron {
      width: 0.42rem;
      height: 0.42rem;
      border-right: 1px solid currentColor;
      border-bottom: 1px solid currentColor;
      transform: translateY(-0.12rem) rotate(45deg);
      transition: transform 0.2s ease;
    }
    .user-trigger[aria-expanded='true'] .chevron {
      transform: translateY(0.1rem) rotate(225deg);
    }
    .user-dropdown {
      position: absolute;
      top: calc(100% + 0.6rem);
      right: 0;
      width: 13.5rem;
      padding: 0.45rem;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 0.9rem;
      background: rgba(18, 27, 62, 0.88);
      box-shadow: 0 18px 45px rgba(14, 20, 49, 0.28);
      backdrop-filter: blur(16px);
    }
    .menu-item {
      width: 100%;
      min-height: 2.6rem;
      padding: 0.7rem 0.8rem;
      border: 0;
      border-radius: 0.55rem;
      display: flex;
      align-items: center;
      color: rgba(255, 255, 255, 0.94);
      background: transparent;
      text-align: left;
      text-decoration: none;
      font: inherit;
      font-size: 0.9rem;
      cursor: pointer;
      transition:
        background 0.18s ease,
        color 0.18s ease;
    }
    .menu-item:hover,
    .menu-item:focus-visible {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
    .menu-item:disabled {
      cursor: wait;
      opacity: 0.7;
    }
    .menu-error {
      margin: 0.35rem 0.45rem 0.2rem;
      color: #ffd0d0;
      font-size: 0.78rem;
      line-height: 1.35;
    }
    .loading-auth {
      width: 8.5rem;
      pointer-events: none;
    }
    .loading-auth span {
      width: 4.7rem;
      height: 0.65rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.4);
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
    .mobile-actions .ghost,
    .secondary-action {
      color: #29345b;
      border-color: rgba(62, 68, 118, 0.35);
    }
    .mobile-user {
      min-height: 3rem;
      padding: 0.75rem 1rem;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      color: #29345b;
      font-size: 0.88rem;
      white-space: nowrap;
    }
    .secondary-action {
      background: rgba(255, 255, 255, 0.18);
      backdrop-filter: blur(8px);
    }
    .mobile-error {
      grid-column: 1 / -1;
      color: #6c1f31;
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
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly menuOpen = signal(false);
  readonly userMenuOpen = signal(false);
  readonly signingOut = signal(false);
  readonly signOutError = signal('');
  readonly userName = computed(() => this.auth.user()?.displayName.trim() || 'Voyageur');
  private userMenuCloseTimer: ReturnType<typeof setTimeout> | null = null;

  toggleMenu(): void {
    this.setMenuState(!this.menuOpen());
  }

  closeMenu(): void {
    this.setMenuState(false);
  }

  openUserMenu(): void {
    this.cancelUserMenuClose();
    this.signOutError.set('');
    this.userMenuOpen.set(true);
  }

  closeUserMenu(): void {
    this.cancelUserMenuClose();
    this.userMenuOpen.set(false);
  }

  scheduleUserMenuClose(): void {
    this.cancelUserMenuClose();
    this.userMenuCloseTimer = setTimeout(() => this.userMenuOpen.set(false), 180);
  }

  cancelUserMenuClose(): void {
    if (!this.userMenuCloseTimer) return;
    clearTimeout(this.userMenuCloseTimer);
    this.userMenuCloseTimer = null;
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    if (this.userMenuOpen()) this.closeUserMenu();
    else this.openUserMenu();
  }

  onUserTriggerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.openUserMenu();
    this.focusMenuItem(0);
  }

  onUserMenuKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeUserMenu();
      this.focusUserTrigger();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusAdjacentMenuItem(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusAdjacentMenuItem(-1);
    }
  }

  async signOut(): Promise<void> {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.signOutError.set('');
    try {
      await this.auth.signOut();
      this.closeUserMenu();
      this.closeMenu();
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.signOutError.set(
        error instanceof Error ? error.message : 'Déconnexion impossible pour le moment.',
      );
    } finally {
      this.signingOut.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.userMenuOpen()) return;
    if (this.host.nativeElement.contains(event.target as Node)) return;
    this.closeUserMenu();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeUserMenu();
    this.closeMenu();
  }

  ngOnDestroy(): void {
    this.cancelUserMenuClose();
    this.document.body.style.overflow = '';
  }

  private setMenuState(open: boolean): void {
    this.menuOpen.set(open);
    this.document.body.style.overflow = open ? 'hidden' : '';
    if (open) this.closeUserMenu();
  }

  private focusMenuItem(index: number): void {
    setTimeout(() => {
      this.menuItems()[index]?.focus();
    });
  }

  private focusAdjacentMenuItem(direction: 1 | -1): void {
    const items = this.menuItems();
    if (!items.length) return;
    const activeIndex = items.findIndex((item) => item === this.document.activeElement);
    const nextIndex = activeIndex < 0 ? 0 : (activeIndex + direction + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  private focusUserTrigger(): void {
    const trigger = this.host.nativeElement.querySelector(
      '.user-trigger',
    ) as HTMLButtonElement | null;
    trigger?.focus();
  }

  private menuItems(): HTMLElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll('[data-user-menu-item]'),
    ) as HTMLElement[];
  }
}
