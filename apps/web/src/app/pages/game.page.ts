import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-game',
  imports: [FormsModule, RouterLink],
  template: `<div class="shell">
    <header class="topbar">
      <a class="brand" routerLink="/tableau-de-bord">ODYSSÉE</a>
      <div class="status">
        <span class="dot"></span> Partie sauvegardée <span class="pill">{{ modeLabel() }}</span>
      </div>
    </header>
    <main id="main">
      <section class="game-grid">
        <aside class="character panel">
          <p class="eyebrow">Votre personnage</p>
          <div class="avatar">M</div>
          <h3>Mara Venn</h3>
          <p>Enquêtrice intuitive</p>
          <hr />
          <small>OBJECTIF PRIVÉ</small>
          <p class="goal">Découvrir la vérité sans sacrifier vos valeurs.</p>
        </aside>
        <article class="story panel">
          <div class="chapter">TOUR {{ turn() }} · LES ÉCHOS DE NACRE</div>
          <h2>{{ location() }}</h2>
          <p class="narration">{{ scene() }}</p>
          @if (resolution()) {
            <div class="resolution">
              <span>Conséquence</span>
              <p>{{ resolution() }}</p>
            </div>
          }
        </article>
        <aside class="character panel partner">
          <p class="eyebrow">Partenaire</p>
          <div class="avatar android">I</div>
          <h3>Ilyon-7</h3>
          <p>Androïde archiviste</p>
          <hr />
          <small>PRÉSENCE</small>
          <p><span class="dot"></span> {{ submitted() ? 'Décision envoyée' : 'En réflexion…' }}</p>
        </aside>
      </section>
      <section class="decisions panel">
        <div>
          <p class="eyebrow">Votre décision reste secrète</p>
          <h3>Que fait Mara ?</h3>
        </div>
        <div class="choices">
          <button
            class="choice"
            [class.selected]="action() === suggestions[0]"
            (click)="choose(suggestions[0])"
          >
            <b>Observer les détails</b
            ><span>Lire les signes discrets laissés dans le laboratoire.</span></button
          ><button
            class="choice"
            [class.selected]="action() === suggestions[1]"
            (click)="choose(suggestions[1])"
          >
            <b>Prendre l’initiative</b
            ><span>Interroger directement l’intelligence de la cité.</span>
          </button>
        </div>
        <label class="field"
          >Ou écrivez librement votre action<textarea
            [(ngModel)]="freeAction"
            maxlength="1500"
            [disabled]="submitted()"
            placeholder="Mara décide de…"
          ></textarea>
        </label>
        <div class="submit-row">
          <span class="muted">{{ freeAction.length }} / 1500</span
          ><button (click)="submit()" [disabled]="submitted() || (!freeAction.trim() && !action())">
            {{ submitted() ? 'En attente de l’autre joueur…' : 'Valider en secret' }}
          </button>
        </div>
      </section>
    </main>
  </div>`,
  styles: [
    `
      .status {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        color: var(--muted);
        font-size: 0.85rem;
      }
      .dot {
        display: inline-block;
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        background: var(--accent);
        box-shadow: 0 0 12px var(--accent);
      }
      .game-grid {
        display: grid;
        gap: 1rem;
      }
      .character {
        text-align: center;
      }
      .avatar {
        width: 74px;
        height: 74px;
        margin: 1rem auto;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: linear-gradient(145deg, #8ee8d2, #326f70);
        font: 600 2rem 'Newsreader';
      }
      .android {
        background: linear-gradient(145deg, #aaa0ff, #4a3b87);
      }
      hr {
        border: 0;
        border-top: 1px solid var(--line);
        margin: 1.5rem 0;
      }
      .goal {
        color: #e7dfb5;
      }
      .story {
        min-height: 440px;
      }
      .chapter,
      small {
        color: var(--muted);
        font-size: 0.7rem;
        letter-spacing: 0.13em;
      }
      .narration {
        font:
          500 clamp(1.2rem, 2vw, 1.55rem)/1.75 'Newsreader',
          serif;
        color: #e9e7e2;
      }
      .resolution {
        border-left: 2px solid var(--accent);
        padding-left: 1rem;
      }
      .resolution span {
        color: var(--accent);
        font-size: 0.75rem;
        text-transform: uppercase;
      }
      .decisions {
        margin: 1rem 0 4rem;
      }
      .choices {
        display: grid;
        gap: 0.7rem;
        margin: 1rem 0;
      }
      .choice {
        border-radius: 1rem;
        background: #0b101c;
        color: var(--ink);
        border: 1px solid var(--line);
        text-align: left;
        display: grid;
        justify-content: start;
      }
      .choice span {
        color: var(--muted);
        font-weight: 400;
      }
      .choice.selected {
        border-color: var(--accent);
        box-shadow: 0 0 0 1px var(--accent);
      }
      .submit-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1rem;
      }
      button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      @media (min-width: 900px) {
        .game-grid {
          grid-template-columns: 220px minmax(0, 1fr) 220px;
        }
        .choices {
          grid-template-columns: 1fr 1fr;
        }
        .partner {
          display: block;
        }
      }
      @media (max-width: 899px) {
        .game-grid {
          grid-template-columns: 1fr 1fr;
        }
        .story {
          grid-column: 1/-1;
          grid-row: 1;
        }
        .character {
          padding: 1rem;
        }
        .avatar {
          width: 48px;
          height: 48px;
        }
        .character hr,
        .character small,
        .character .goal {
          display: none;
        }
      }
    `,
  ],
})
export class GamePage {
  readonly suggestions = ['observer les traces invisibles', 'interroger l’intelligence de la cité'];
  readonly turn = signal(1);
  readonly scene = signal(
    'La pluie dessine des lignes de lumière sur le laboratoire désert. La chercheuse Sora Elian a disparu, mais son terminal vient de se rallumer. Une phrase y pulse : « Ne faites confiance ni au silence, ni à ma voix. »',
  );
  readonly location = signal('Laboratoire des Hautes-Strates');
  readonly resolution = signal('');
  readonly submitted = signal(false);
  readonly action = signal('');
  freeAction = '';
  readonly modeLabel = computed(() => {
    try {
      return JSON.parse(localStorage.getItem('odyssee_demo_config') ?? '{}').mode === 'realtime'
        ? 'Temps réel · 02:00'
        : 'Mode libre';
    } catch {
      return 'Mode libre';
    }
  });
  choose(value: string) {
    if (!this.submitted()) {
      this.action.set(value);
      this.freeAction = '';
    }
  }
  submit() {
    const chosen = this.freeAction.trim() || this.action();
    if (!chosen || this.submitted()) return;
    this.submitted.set(true);
    setTimeout(() => {
      this.resolution.set(
        `Mara choisit de ${chosen}. Au même instant, Ilyon-7 isole un fragment de mémoire dans le terminal. Les deux gestes se complètent : la piste désigne désormais les jardins orbitaux, sans encore expliquer qui a envoyé le message.`,
      );
      this.scene.set(
        'Une navette attend, portes ouvertes, à destination des jardins orbitaux. Quelqu’un a préparé leur arrivée.',
      );
      this.location.set('Quai des Jardins orbitaux');
      this.turn.update((v) => v + 1);
      this.submitted.set(false);
      this.action.set('');
      this.freeAction = '';
      this.persist();
    }, 900);
  }
  private persist() {
    localStorage.setItem(
      'odyssee_demo_game',
      JSON.stringify({ turn: this.turn(), scene: this.scene(), resolution: this.resolution() }),
    );
  }
  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem('odyssee_demo_game') ?? 'null') as {
        turn: number;
        scene: string;
        resolution: string;
      } | null;
      if (saved) {
        this.turn.set(saved.turn);
        this.scene.set(saved.scene);
        this.resolution.set(saved.resolution);
        this.location.set('Quai des Jardins orbitaux');
      }
    } catch {
      /* corrupted demo state is ignored */
    }
  }
}
