import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { AuthPage } from './auth.page';

describe('AuthPage', () => {
  const ready = signal(true);
  const authenticated = signal(false);
  const auth = {
    ready: ready.asReadonly(),
    authenticated: authenticated.asReadonly(),
    backend: signal('supabase').asReadonly(),
    signIn: vi.fn<() => Promise<void>>(),
    signUp: vi.fn<() => Promise<string>>(),
    resetPassword: vi.fn<() => Promise<void>>(),
    signInWithGoogle: vi.fn<() => Promise<void>>(),
    signInWithDiscord: vi.fn<() => Promise<void>>(),
  };

  beforeEach(async () => {
    ready.set(true);
    authenticated.set(false);
    auth.signIn.mockResolvedValue();
    auth.signUp.mockResolvedValue('Compte créé.');
    auth.resetPassword.mockResolvedValue();
    auth.signInWithGoogle.mockResolvedValue();
    auth.signInWithDiscord.mockResolvedValue();
    await TestBed.configureTestingModule({
      imports: [AuthPage],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
  });

  afterEach(() => vi.clearAllMocks());

  function render(): {
    fixture: ReturnType<typeof TestBed.createComponent<AuthPage>>;
    element: HTMLElement;
  } {
    const fixture = TestBed.createComponent(AuthPage);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('renders login, registration, Google and Discord only', () => {
    const { element } = render();

    expect(element.textContent).toContain('Connexion');
    expect(element.textContent).toContain('Créer un compte');
    expect(element.querySelectorAll('[aria-label="Continuer avec Google"]')).toHaveLength(2);
    expect(element.querySelectorAll('[aria-label="Continuer avec Discord"]')).toHaveLength(2);
    expect(element.querySelectorAll('img[src="/icons/auth/google.svg"]')).toHaveLength(2);
    expect(element.querySelectorAll('img[src="/icons/auth/discord.svg"]')).toHaveLength(2);
    expect(element.textContent?.toLowerCase()).not.toContain('apple');
  });

  it('validates the login form before submitting', async () => {
    const { fixture, element } = render();

    await fixture.componentInstance.submitLogin();
    fixture.detectChanges();

    expect(auth.signIn).not.toHaveBeenCalled();
    expect(element.textContent).toContain("L'adresse e-mail est requise.");
    expect(element.textContent).toContain('Le mot de passe est requis.');
  });

  it('signs in by email and redirects to the dashboard', async () => {
    const { fixture } = render();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture.componentInstance.loginForm.setValue({
      email: 'mara@example.com',
      password: 'motdepasse',
    });
    await fixture.componentInstance.submitLogin();

    expect(auth.signIn).toHaveBeenCalledWith('mara@example.com', 'motdepasse');
    expect(navigate).toHaveBeenCalledWith('/tableau-de-bord');
  });

  it('requires terms before registration', async () => {
    const { fixture, element } = render();

    fixture.componentInstance.registerForm.patchValue({
      displayName: 'Mara',
      email: 'mara@example.com',
      password: 'motdepasse',
      acceptedTerms: false,
    });
    await fixture.componentInstance.submitRegister();
    fixture.detectChanges();

    expect(auth.signUp).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Vous devez accepter les conditions.');
  });

  it('signs up with the display name and redirects only when authenticated', async () => {
    const { fixture } = render();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture.componentInstance.registerForm.setValue({
      displayName: '  Mara  ',
      email: 'mara@example.com',
      password: 'motdepasse',
      acceptedTerms: true,
    });
    await fixture.componentInstance.submitRegister();
    expect(auth.signUp).toHaveBeenCalledWith('mara@example.com', 'motdepasse', 'Mara');
    expect(navigate).not.toHaveBeenCalled();

    authenticated.set(true);
    await fixture.componentInstance.submitRegister();
    expect(navigate).toHaveBeenCalledWith('/tableau-de-bord');
  });

  it('sends a reset link without revealing whether the account exists', async () => {
    const { fixture } = render();

    fixture.componentInstance.loginForm.controls.email.setValue('mara@example.com');
    await fixture.componentInstance.sendResetLink();
    fixture.detectChanges();

    expect(auth.resetPassword).toHaveBeenCalledWith('mara@example.com');
    expect(fixture.nativeElement.textContent).toContain(
      'Si un compte correspond à cette adresse, un lien de réinitialisation a été envoyé.',
    );
  });

  it('starts OAuth with Google and Discord through the auth service', async () => {
    const { fixture } = render();

    await fixture.componentInstance.continueWithGoogle();
    await fixture.componentInstance.continueWithDiscord();

    expect(auth.signInWithGoogle).toHaveBeenCalledOnce();
    expect(auth.signInWithDiscord).toHaveBeenCalledOnce();
  });

  it('maps unsupported provider errors without displaying raw JSON', async () => {
    const { fixture, element } = render();
    auth.signInWithGoogle.mockRejectedValueOnce(
      new Error('Unsupported provider: provider is not enabled'),
    );

    await fixture.componentInstance.continueWithGoogle();
    fixture.detectChanges();

    expect(element.textContent).toContain("La connexion avec Google n'est pas encore disponible.");
    expect(element.textContent).not.toContain('Unsupported provider');
  });
});
