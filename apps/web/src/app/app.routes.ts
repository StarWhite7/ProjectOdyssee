import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home.page').then((m) => m.HomePage) },
  { path: 'connexion', loadComponent: () => import('./pages/auth.page').then((m) => m.AuthPage) },
  {
    path: 'tableau-de-bord',
    loadComponent: () => import('./pages/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'aventure/demo',
    loadComponent: () => import('./pages/game.page').then((m) => m.GamePage),
  },
  { path: '**', redirectTo: '' },
];
