import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { HomeHeaderComponent } from './home-header.component';

describe('HomeHeaderComponent', () => {
  const ready = signal(true);
  const authenticated = signal(false);
  const user = signal<{ id: string; email: string; displayName: string } | null>(null);
  const signOut = vi.fn<() => Promise<void>>();

  beforeEach(async () => {
    ready.set(true);
    authenticated.set(false);
    user.set(null);
    signOut.mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [HomeHeaderComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            ready: ready.asReadonly(),
            authenticated: authenticated.asReadonly(),
            user: user.asReadonly(),
            signOut,
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    document.body.style.overflow = '';
    vi.clearAllMocks();
  });

  it('shows the login action for anonymous users', () => {
    const fixture = TestBed.createComponent(HomeHeaderComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Se connecter');
    expect(fixture.nativeElement.querySelector('.user-trigger')).toBeFalsy();
  });

  it('shows the user menu instead of the login action for authenticated users', () => {
    authenticated.set(true);
    user.set({ id: 'user-1', email: 'mara@example.com', displayName: 'Mara' });
    const fixture = TestBed.createComponent(HomeHeaderComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Se connecter');
    const trigger = fixture.nativeElement.querySelector('.user-trigger') as HTMLButtonElement;
    expect(trigger.textContent).toContain('Mara');

    trigger.click();
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('[role="menu"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Tableau de bord');
    expect(fixture.nativeElement.textContent).toContain('Se déconnecter');
  });

  it('signs out through AuthService and navigates home without reloading', async () => {
    authenticated.set(true);
    user.set({ id: 'user-1', email: 'mara@example.com', displayName: 'Mara' });
    const fixture = TestBed.createComponent(HomeHeaderComponent);
    const router = TestBed.inject(Router);
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();

    fixture.componentInstance.openUserMenu();
    fixture.detectChanges();
    const signOutButton = fixture.nativeElement.querySelector(
      '[data-user-menu-item]:last-child',
    ) as HTMLButtonElement;
    signOutButton.click();
    await fixture.whenStable();

    expect(signOut).toHaveBeenCalledOnce();
    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('opens an accessible mobile navigation and locks background scrolling', () => {
    const fixture = TestBed.createComponent(HomeHeaderComponent);
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('.menu-toggle') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('#mobile-navigation')).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('shows account actions in the mobile navigation for authenticated users', () => {
    authenticated.set(true);
    user.set({ id: 'user-1', email: 'mara@example.com', displayName: 'Mara' });
    const fixture = TestBed.createComponent(HomeHeaderComponent);
    fixture.detectChanges();

    fixture.componentInstance.toggleMenu();
    fixture.detectChanges();

    const mobileNav = fixture.nativeElement.querySelector('#mobile-navigation') as HTMLElement;
    expect(mobileNav.textContent).toContain('Mara');
    expect(mobileNav.textContent).toContain('Tableau de bord');
    expect(mobileNav.textContent).toContain('Se déconnecter');
    expect(mobileNav.textContent).not.toContain('Se connecter');
  });

  it('closes the mobile navigation with Escape', () => {
    const fixture = TestBed.createComponent(HomeHeaderComponent);
    fixture.detectChanges();
    fixture.componentInstance.toggleMenu();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.menuOpen()).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });
});
