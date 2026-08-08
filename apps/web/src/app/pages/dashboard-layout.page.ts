import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DashboardSidebarComponent } from './dashboard.page';

@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterOutlet, DashboardSidebarComponent],
  template: `
    <main id="main" class="dashboard-page">
      <div class="dashboard-overlay left"></div>
      <div class="dashboard-overlay light"></div>
      <div class="dashboard-overlay bottom"></div>

      <div class="dashboard-layout">
        <app-dashboard-sidebar />
        <div class="dashboard-route">
          <router-outlet />
        </div>
      </div>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100svh;
      color: #f8f5ee;
    }
    .dashboard-page {
      position: relative;
      height: 100svh;
      min-height: 100svh;
      overflow: hidden;
    }
    .dashboard-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .dashboard-overlay.left {
      background: linear-gradient(
        90deg,
        rgba(9, 16, 45, 0.72),
        rgba(9, 16, 45, 0.24) 24%,
        transparent 55%
      );
    }
    .dashboard-overlay.light {
      background:
        radial-gradient(ellipse at 50% 28%, rgba(255, 236, 207, 0.5), transparent 34%),
        linear-gradient(
          90deg,
          transparent 16rem,
          rgba(255, 255, 255, 0.2) 16rem,
          rgba(255, 255, 255, 0.06) 72%
        );
      mix-blend-mode: screen;
      opacity: 0.62;
    }
    .dashboard-overlay.bottom {
      background: linear-gradient(180deg, transparent 56%, rgba(10, 16, 43, 0.5));
    }
    .dashboard-layout {
      position: relative;
      z-index: 1;
      height: 100%;
      display: grid;
      grid-template-columns: clamp(15.8rem, 18vw, 18.1rem) minmax(0, 1fr);
      overflow: hidden;
    }
    .dashboard-route {
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    }
    @media (max-width: 980px) {
      .dashboard-page {
        height: auto;
        min-height: 100svh;
        overflow: visible;
      }
      .dashboard-layout {
        display: block;
        overflow: visible;
      }
      app-dashboard-sidebar {
        display: none;
      }
      .dashboard-route {
        overflow: visible;
      }
    }
  `,
})
export class DashboardLayoutPage {}
