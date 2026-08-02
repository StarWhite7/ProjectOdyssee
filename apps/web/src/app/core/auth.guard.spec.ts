import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';
import type { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import type { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const ready = signal(false);
  const authenticated = signal(false);

  beforeEach(() => {
    ready.set(false);
    authenticated.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { ready: ready.asReadonly(), authenticated },
        },
      ],
    });
  });

  it('waits for session restoration before allowing a direct navigation', async () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    expect(isObservable(result)).toBe(true);

    authenticated.set(true);
    ready.set(true);

    await expect(firstValueFrom(result as Observable<boolean | UrlTree>)).resolves.toBe(true);
  });

  it('redirects only after restoration confirms there is no session', async () => {
    const router = TestBed.inject(Router);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

    ready.set(true);

    const resolved = await firstValueFrom(result as Observable<boolean | UrlTree>);
    expect(router.serializeUrl(resolved as UrlTree)).toBe('/connexion');
  });
});
