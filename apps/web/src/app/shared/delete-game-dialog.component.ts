import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameService } from '../core/game.service';

@Component({
  selector: 'app-delete-game-dialog',
  imports: [FormsModule],
  template: `
    <button class="danger-trigger" type="button" (click)="open()">Quitter l’aventure</button>
    @if (opened()) {
      <div class="backdrop" role="presentation" (click)="cancel()">
        <section
          class="confirm panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          (click)="$event.stopPropagation()"
        >
          <h2 id="delete-title">Quitter cette aventure ?</h2>
          <p>
            Si vous quittez cette aventure, la partie entière sera supprimée définitivement pour les
            deux joueurs.
          </p>
          <p>
            L’histoire, les personnages, les décisions, les objectifs, les souvenirs et toute la
            progression seront irrécupérables.
          </p>
          <p><strong>Cette action est définitive.</strong></p>
          <label class="field"
            >Saisissez SUPPRIMER pour confirmer
            <input [(ngModel)]="confirmation" autocomplete="off" [disabled]="deleting()" />
          </label>
          @if (error()) {
            <p class="error" aria-live="polite">{{ error() }}</p>
          }
          <div class="actions">
            <button class="secondary" type="button" (click)="cancel()" [disabled]="deleting()">
              Annuler
            </button>
            <button
              class="danger"
              type="button"
              (click)="confirmDelete()"
              [disabled]="confirmation !== 'SUPPRIMER' || deleting()"
            >
              {{ deleting() ? 'Suppression en cours…' : 'Supprimer définitivement la partie' }}
            </button>
          </div>
        </section>
      </div>
    }
  `,
  styles: [
    `
      .danger-trigger,
      .danger {
        color: #ffd8d8;
        background: #7a2430;
        box-shadow: inset 0 0 0 1px #c45b68;
      }
      .danger-trigger {
        padding: 0.65rem 1rem;
      }
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: grid;
        place-items: center;
        padding: 1rem;
        background: #02040bcc;
      }
      .confirm {
        width: min(620px, 100%);
      }
      .confirm h2 {
        font-size: 2rem;
      }
      .confirm strong,
      .error {
        color: #ffb5b5;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.2rem;
        flex-wrap: wrap;
      }
      button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
    `,
  ],
})
export class DeleteGameDialogComponent {
  private readonly games = inject(GameService);
  readonly gameId = input.required<string>();
  readonly deleted = output<'deleted' | 'already_deleted'>();
  readonly opened = signal(false);
  readonly deleting = signal(false);
  readonly error = signal('');
  confirmation = '';

  open(): void {
    this.confirmation = '';
    this.error.set('');
    this.opened.set(true);
  }

  cancel(): void {
    if (!this.deleting()) this.opened.set(false);
  }

  async confirmDelete(): Promise<void> {
    if (this.confirmation !== 'SUPPRIMER' || this.deleting()) return;
    this.deleting.set(true);
    this.error.set('');
    try {
      const status = await this.games.deleteGameForAll(this.gameId());
      this.opened.set(false);
      this.deleted.emit(status);
    } catch {
      this.error.set('La partie n’a pas pu être supprimée. Réessayez dans quelques instants.');
    } finally {
      this.deleting.set(false);
    }
  }
}
