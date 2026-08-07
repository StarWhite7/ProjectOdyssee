import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { AuthCallbackPage } from './auth-callback.page';

describe('AuthCallbackPage', () => {
  const ready = signal(true);
  const authenticated = signal(true);
  const auth = {
    ready: ready.asReadonly(),
    authenticated: authenticated.asReadonly(),
    completeOAuthProfile: vi.fn<() => Promise<void>>(),
  };

  beforeEach(async () => {
    ready.set(true);
    authenticated.set(true);
    auth.completeOAuthProfile.mockResolvedValue();
    await TestBed.configureTestingModule({
      imports: [AuthCallbackPage],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
  });

  afterEach(() => vi.clearAllMocks());

  it('completes the OAuth profile and redirects to the dashboard', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(AuthCallbackPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(auth.completeOAuthProfile).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/tableau-de-bord');
  });
});
