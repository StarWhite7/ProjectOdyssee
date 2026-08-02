import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: ` <div class="shell">
    <header class="topbar">
      <a class="brand" routerLink="/">ODYSSÉE</a
      ><a class="button secondary" routerLink="/connexion">Connexion</a>
    </header>
    <main id="main">
      <section class="hero">
        <p class="eyebrow">Récit coopératif · Deux joueurs</p>
        <h1>Écrivez une histoire qui n’appartient qu’à vous.</h1>
        <p class="lead">
          Deux joueurs imaginent librement une histoire. Une intelligence artificielle veille à sa
          cohérence.
        </p>
        <div class="actions">
          <a class="button" routerLink="/tableau-de-bord">Créer une aventure <span>→</span></a
          ><a class="button secondary" routerLink="/tableau-de-bord">Rejoindre avec un code</a>
        </div>
      </section>
      <section class="how">
        <p class="eyebrow">Comment ça marche</p>
        <div class="grid three-cols">
          <article class="panel">
            <span>01</span>
            <h3>Imaginez</h3>
            <p>Choisissez librement votre univers, son ton et vos limites.</p>
          </article>
          <article class="panel">
            <span>02</span>
            <h3>Décidez en secret</h3>
            <p>Chaque personnage agit sans voir la décision actuelle de l’autre.</p>
          </article>
          <article class="panel">
            <span>03</span>
            <h3>Découvrez</h3>
            <p>Vos deux intentions fusionnent en une nouvelle scène cohérente.</p>
          </article>
        </div>
      </section>
    </main>
  </div>`,
  styles: [
    `
      .hero {
        padding: 9vh 0 14vh;
      }
      .lead {
        font-size: clamp(1.05rem, 2vw, 1.35rem);
        max-width: 640px;
      }
      .actions {
        display: flex;
        gap: 0.8rem;
        flex-wrap: wrap;
        margin-top: 2rem;
      }
      .how {
        padding-bottom: 8rem;
      }
      .panel span {
        color: var(--accent);
        font-size: 0.8rem;
      }
      .panel h3 {
        font-size: 1.8rem;
      }
    `,
  ],
})
export class HomePage {}
