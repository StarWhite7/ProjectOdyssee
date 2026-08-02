import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, RouterLink],
  template: `<div class="shell">
    <header class="topbar">
      <a class="brand" routerLink="/">ODYSSÉE</a><span class="pill">Mode Mock</span>
    </header>
    <main id="main">
      <p class="eyebrow">Tableau de bord</p>
      <h2>Où partons-nous ?</h2>
      <div class="grid two-cols">
        <section class="panel">
          <h3>Créer une aventure</h3>
          <div class="grid">
            <label class="field">Univers<input [(ngModel)]="genre" maxlength="80" /></label
            ><label class="field">Ambiance<input [(ngModel)]="tone" maxlength="80" /></label
            ><label class="field"
              >Rythme<select [(ngModel)]="mode">
                <option value="asynchronous">Libre, sans minuterie</option>
                <option value="realtime">Temps réel · 2 minutes</option>
              </select></label
            ><button (click)="create()">Créer la démo</button>
          </div>
        </section>
        <section class="panel">
          <h3>Rejoindre</h3>
          <p>Entrez le code transmis par votre partenaire.</p>
          <label class="field"
            >Code d’invitation<input
              [(ngModel)]="code"
              maxlength="10"
              placeholder="NACRE-27" /></label
          ><button class="secondary" (click)="join()">Rejoindre</button>
          <p aria-live="polite">{{ message() }}</p>
        </section>
      </div>
    </main>
  </div>`,
  styles: [
    `
      main {
        padding: 5vh 0;
      }
      .panel h3 {
        font-size: 2rem;
      }
    `,
  ],
})
export class DashboardPage {
  genre = 'Cité futuriste';
  tone = 'Mystère et émotion';
  mode: 'realtime' | 'asynchronous' = 'asynchronous';
  code = '';
  message = signal('');
  private readonly router = inject(Router);
  create() {
    localStorage.setItem(
      'odyssee_demo_config',
      JSON.stringify({ genre: this.genre, tone: this.tone, mode: this.mode }),
    );
    void this.router.navigateByUrl('/aventure/demo');
  }
  join() {
    if (this.code.trim().toUpperCase() === 'NACRE-27')
      void this.router.navigateByUrl('/aventure/demo');
    else this.message.set('Ce code est inconnu ou a expiré.');
  }
}
