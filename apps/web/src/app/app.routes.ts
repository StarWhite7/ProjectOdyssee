import type { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home.page').then((m) => m.HomePage) },
  {
    path: 'connexion',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth.page').then((m) => m.AuthPage),
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./pages/auth-callback.page').then((m) => m.AuthCallbackPage),
  },
  {
    path: 'mot-de-passe/reinitialiser',
    loadComponent: () => import('./pages/password-reset.page').then((m) => m.PasswordResetPage),
  },
  {
    path: 'conditions-utilisation',
    loadComponent: () => import('./pages/legal.page').then((m) => m.LegalPage),
  },
  {
    path: 'confidentialite',
    loadComponent: () => import('./pages/legal.page').then((m) => m.LegalPage),
  },
  { path: 'tableau-de-bord', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard-layout.page').then((m) => m.DashboardLayoutPage),
    children: [
      {
        path: 'dashboard',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'aventures',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/adventures.page').then((m) => m.AdventuresPage),
      },
      {
        path: 'invitations',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/invitations.page').then((m) => m.InvitationsPage),
      },
      {
        path: 'archives',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/archives.page').then((m) => m.ArchivesPage),
      },
      {
        path: 'parametres',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/settings.page').then((m) => m.SettingsPage),
      },
    ],
  },
  {
    path: 'aventure/:id/salon',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/lobby.page').then((m) => m.LobbyPage),
  },
  {
    path: 'aventure/:id/personnage',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/character.page').then((m) => m.CharacterPage),
  },
  {
    path: 'aventure/:id/jouer',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/game.page').then((m) => m.GamePage),
  },
  {
    path: 'aventure/:id/:section',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/details.page').then((m) => m.DetailsPage),
  },
  { path: '**', redirectTo: '' },
];
