import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { PasswordResetPage } from './password-reset.page';

describe('PasswordResetPage', () => {
  const ready = signal(true);
  const authenticated = signal(true);
  const auth = {
    ready: ready.asReadonly(),
    authenticated: authenticated.asReadonly(),
    updatePassword: vi.fn<() => Promise<void>>(),
  };

  beforeEach(async () => {
    ready.set(true);
    authenticated.set(true);
    auth.updatePassword.mockResolvedValue();
    await TestBed.configureTestingModule({
      imports: [PasswordResetPage],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
  });

  afterEach(() => vi.clearAllMocks());

  it('requires a strong enough password before updating', async () => {
    const fixture = TestBed.createComponent(PasswordResetPage);
    fixture.detectChanges();

    fixture.componentInstance.form.controls.password.setValue('court');
    await fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(auth.updatePassword).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'Le mot de passe doit contenir au moins 8 caractères.',
    );
  });

  it('updates the password and redirects to the dashboard', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(PasswordResetPage);
    fixture.detectChanges();

    fixture.componentInstance.form.controls.password.setValue('motdepasse');
    await fixture.componentInstance.submit();

    expect(auth.updatePassword).toHaveBeenCalledWith('motdepasse');
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });
});
