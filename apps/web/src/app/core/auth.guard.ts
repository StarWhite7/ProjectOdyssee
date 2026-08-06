import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const authorize = () => auth.authenticated() || router.createUrlTree(['/connexion']);

  if (auth.ready()) return authorize();

  return toObservable(auth.ready).pipe(
    filter((ready) => ready),
    take(1),
    map(() => authorize()),
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const authorize = () =>
    auth.authenticated() ? router.createUrlTree(['/tableau-de-bord']) : true;

  if (auth.ready()) return authorize();

  return toObservable(auth.ready).pipe(
    filter((ready) => ready),
    take(1),
    map(() => authorize()),
  );
};
