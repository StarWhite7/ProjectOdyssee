import type { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home.page').then((m) => m.HomePage) },
  { path: 'connexion', loadComponent: () => import('./pages/auth.page').then((m) => m.AuthPage) },
  {
    path: 'tableau-de-bord',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard.page').then((m) => m.DashboardPage),
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
