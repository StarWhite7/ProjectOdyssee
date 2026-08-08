import { Component, signal } from '@angular/core';

type InvitationView = {
  id: string;
  title: string;
  companion: string;
  detail: string;
  status: string;
};

const RECEIVED_INVITATIONS: InvitationView[] = [
  {
    id: 'received-hazer',
    title: 'Les portes de Vohrys',
    companion: 'Hazer',
    detail: 'vous invite à commencer une aventure',
    status: 'À décider',
  },
];

const SENT_INVITATIONS: InvitationView[] = [
  {
    id: 'sent-hazer',
    title: 'Le sanctuaire oublié',
    companion: 'Hazer',
    detail: 'Invitation envoyée',
    status: 'En attente',
  },
];

@Component({
  selector: 'app-invitations-page',
  template: `
    <section class="dashboard-subpage" aria-labelledby="invitations-title">
      <header class="page-header">
        <p>Invitations</p>
        <h1 id="invitations-title">Rejoindre une odyssée à deux</h1>
      </header>

      @if (feedback()) {
        <p class="feedback" aria-live="polite">{{ feedback() }}</p>
      }

      <div class="invitation-grid">
        <section class="panel" aria-labelledby="received-title">
          <h2 id="received-title">Invitations reçues</h2>
          <div class="list">
            @for (invitation of receivedInvitations; track invitation.id) {
              <article class="invitation-card">
                <span class="avatar" aria-hidden="true">{{ invitation.companion[0] }}</span>
                <div>
                  <p class="meta">{{ invitation.companion }} {{ invitation.detail }}</p>
                  <h3>{{ invitation.title }}</h3>
                  <span class="pill">{{ invitation.status }}</span>
                </div>
                <div class="actions">
                  <button type="button" (click)="placeholder('accept')">Accepter</button>
                  <button type="button" class="ghost" (click)="placeholder('decline')">Refuser</button>
                </div>
              </article>
            }
          </div>
        </section>

        <section class="panel" aria-labelledby="sent-title">
          <h2 id="sent-title">Invitations envoyées</h2>
          <div class="list">
            @for (invitation of sentInvitations; track invitation.id) {
              <article class="invitation-card">
                <span class="avatar" aria-hidden="true">{{ invitation.companion[0] }}</span>
                <div>
                  <p class="meta">{{ invitation.detail }} à {{ invitation.companion }}</p>
                  <h3>{{ invitation.title }}</h3>
                  <span class="pill">{{ invitation.status }}</span>
                </div>
              </article>
            }
          </div>
        </section>

        <section class="panel timeline" aria-labelledby="duo-title">
          <h2 id="duo-title">Événements duo</h2>
          <article>
            <h3>Demandes liées aux aventures</h3>
            <p>
              Les reprises de partie, demandes de rejoindre et signaux de compagnon seront
              centralisés ici quand la donnée sera connectée.
            </p>
          </article>
        </section>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-height: 0;
    }
    .dashboard-subpage {
      height: 100%;
      min-height: 0;
      padding: clamp(1.35rem, 3vh, 2.65rem) clamp(1.7rem, 3.2vw, 3.4rem);
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr);
      gap: clamp(0.9rem, 1.8vh, 1.4rem);
      overflow: hidden;
      color: #17264e;
    }
    .page-header p,
    h2 {
      margin: 0;
      color: #18264d;
      font: 700 0.78rem 'DM Sans', sans-serif;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0.3rem 0 0;
      font: 600 clamp(2rem, 3vw, 3.3rem) / 1 'Newsreader', serif;
      color: #18264d;
      letter-spacing: 0;
    }
    .feedback {
      margin: 0;
      padding: 0.7rem 0.9rem;
      border-radius: 0.8rem;
      color: white;
      background: rgba(25, 39, 72, 0.62);
      backdrop-filter: blur(10px);
    }
    .invitation-grid {
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
      grid-auto-rows: min-content;
      gap: 1rem;
      overflow: auto;
      padding-right: 0.2rem;
    }
    .panel {
      padding: 1.15rem;
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(12px);
      box-shadow: 0 18px 45px rgba(15, 23, 56, 0.14);
    }
    .timeline {
      grid-column: 1 / -1;
    }
    .list {
      display: grid;
      gap: 0.8rem;
      margin-top: 0.85rem;
    }
    .invitation-card {
      min-height: 7.2rem;
      padding: 0.95rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 0.9rem;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.9rem;
      color: white;
      background:
        linear-gradient(90deg, rgba(10, 20, 50, 0.82), rgba(18, 30, 66, 0.54)),
        url('/images/dashboard/DernierAventure.png') center / cover;
    }
    .avatar {
      width: 2.8rem;
      aspect-ratio: 1;
      border: 1px solid rgba(255, 255, 255, 0.44);
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: rgba(255, 255, 255, 0.12);
      font-weight: 700;
    }
    .meta,
    .timeline p {
      margin: 0;
      color: rgba(255, 255, 255, 0.78);
      line-height: 1.45;
    }
    h3 {
      margin: 0.25rem 0;
      color: white;
      font: 600 1.25rem / 1.1 'Newsreader', serif;
      letter-spacing: 0;
    }
    .pill {
      display: inline-flex;
      padding: 0.22rem 0.52rem;
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: 999px;
      color: rgba(255, 255, 255, 0.88);
      font-size: 0.72rem;
    }
    .actions {
      display: flex;
      gap: 0.55rem;
    }
    button {
      min-height: 2.15rem;
      padding: 0.45rem 0.9rem;
      border: 0;
      border-radius: 999px;
      color: white;
      background: linear-gradient(120deg, #7364df, #3c49b0);
    }
    button.ghost {
      border: 1px solid rgba(255, 255, 255, 0.24);
      background: rgba(255, 255, 255, 0.12);
    }
    @media (max-width: 980px) {
      .dashboard-subpage {
        height: auto;
        min-height: 100svh;
        overflow: visible;
        padding: 1rem;
      }
      .invitation-grid {
        grid-template-columns: 1fr;
        overflow: visible;
      }
      .invitation-card {
        grid-template-columns: auto minmax(0, 1fr);
      }
      .actions {
        grid-column: 1 / -1;
      }
    }
  `,
})
export class InvitationsPage {
  readonly receivedInvitations = RECEIVED_INVITATIONS;
  readonly sentInvitations = SENT_INVITATIONS;
  readonly feedback = signal('');

  placeholder(action: 'accept' | 'decline'): void {
    this.feedback.set(
      action === 'accept'
        ? "L'acceptation sera connectée au système d'invitations."
        : 'Le refus sera connecté au système d’invitations.',
    );
  }
}
