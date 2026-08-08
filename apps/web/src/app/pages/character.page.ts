import type { OnInit } from '@angular/core';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GameService } from '../core/game.service';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-character',
  imports: [ReactiveFormsModule, RouterLink],
  template: `<div class="shell">
    <header class="topbar">
      <a class="brand" [routerLink]="['/aventure', gameId, 'salon']">Nerys</a
      ><span class="pill">Création du personnage</span>
    </header>
    <main id="main">
      <p class="eyebrow">Votre voix dans l’histoire</p>
      <h2>Qui allez-vous incarner ?</h2>
      <div class="layout">
        <form class="panel grid" [formGroup]="form" (ngSubmit)="save()">
          <div class="grid two-cols">
            <label class="field">Nom<input formControlName="name" maxlength="80" /></label
            ><label class="field"
              >Pronoms, facultatifs<input formControlName="pronouns" maxlength="80"
            /></label>
          </div>
          <label class="field"
            >Âge décrit librement<input
              formControlName="ageDescription"
              maxlength="120"
              placeholder="Une adulte dans la trentaine…" /></label
          ><label class="field"
            >Apparence<textarea formControlName="appearance" maxlength="1200"></textarea></label
          ><label class="field"
            >Personnalité, séparée par des virgules<input formControlName="personality"
          /></label>
          <div class="grid two-cols">
            <label class="field">Valeurs<input formControlName="values" /></label
            ><label class="field">Peurs<input formControlName="fears" /></label
            ><label class="field">Forces<input formControlName="strengths" /></label
            ><label class="field">Faiblesses<input formControlName="weaknesses" /></label>
          </div>
          <label class="field"
            >Histoire personnelle<textarea
              formControlName="backstory"
              maxlength="4000"
            ></textarea></label
          ><label class="field"
            >Description libre<textarea formControlName="description" maxlength="4000"></textarea>
          </label>
          <p class="notice" [class.error]="error()" aria-live="polite">{{ message() }}</p>
          <button [disabled]="form.invalid || saving()">
            {{ saving() ? 'Validation…' : 'Valider mon personnage' }}
          </button>
        </form>
        <aside class="panel preview">
          <p class="eyebrow">Aperçu</p>
          <div class="portrait">{{ initial() }}</div>
          <h3>{{ form.controls.name.value || 'Sans nom' }}</h3>
          <p>{{ form.controls.pronouns.value }}</p>
          <p class="quote">
            {{
              form.controls.description.value ||
                form.controls.appearance.value ||
                'Votre personnage prendra vie ici.'
            }}
          </p>
          <div class="tags">
            @for (trait of list(form.controls.personality.value); track trait) {
              <span class="pill">{{ trait }}</span>
            }
          </div>
        </aside>
      </div>
    </main>
  </div>`,
  styles: [
    `
      main {
        padding: 3vh 0 5rem;
      }
      .layout {
        display: grid;
        gap: 1rem;
      }
      .preview {
        text-align: center;
        height: max-content;
        position: sticky;
        top: 1rem;
      }
      .portrait {
        width: 110px;
        height: 110px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        margin: 1rem auto;
        background: linear-gradient(145deg, var(--accent), #354d75);
        color: #07110e;
        font: 600 3rem 'Newsreader';
      }
      .preview h3 {
        font-size: 2.3rem;
      }
      .quote {
        font-family: 'Newsreader';
        font-size: 1.2rem;
      }
      .tags {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
        flex-wrap: wrap;
      }
      .notice {
        min-height: 1.5rem;
      }
      .error {
        color: #ffaaa5;
      }
      @media (min-width: 900px) {
        .layout {
          grid-template-columns: minmax(0, 1fr) 330px;
        }
      }
    `,
  ],
})
export class CharacterPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly games = inject(GameService);
  private readonly auth = inject(AuthService);
  readonly gameId = this.route.snapshot.paramMap.get('id')!;
  readonly saving = signal(false);
  readonly message = signal('');
  readonly error = signal(false);
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    pronouns: new FormControl('', { nonNullable: true }),
    ageDescription: new FormControl('', { nonNullable: true }),
    appearance: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    personality: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    values: new FormControl('', { nonNullable: true }),
    fears: new FormControl('', { nonNullable: true }),
    strengths: new FormControl('', { nonNullable: true }),
    weaknesses: new FormControl('', { nonNullable: true }),
    backstory: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
  });
  async ngOnInit() {
    try {
      const game = await this.games.load(this.gameId);
      const user = game.characters.find((c) => c.ownerId === this.auth.user()?.id);
      if (user)
        this.form.patchValue({
          name: user.name,
          pronouns: user.pronouns ?? '',
          ageDescription: user.ageDescription ?? '',
          appearance: user.appearance,
          personality: user.personalityTraits.join(', '),
          values: user.values.join(', '),
          fears: user.fears.join(', '),
          strengths: user.strengths.join(', '),
          weaknesses: user.weaknesses.join(', '),
          backstory: user.backstory,
          description: user.freeformDescription,
        });
    } catch {
      /* form remains usable */
    }
  }
  initial() {
    return (this.form.controls.name.value.trim()[0] ?? '?').toUpperCase();
  }
  list(value: string) {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  async save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set(false);
    try {
      await this.games.saveCharacter(this.gameId, {
        name: this.form.controls.name.value,
        pronouns: this.form.controls.pronouns.value || null,
        ageDescription: this.form.controls.ageDescription.value || null,
        appearance: this.form.controls.appearance.value,
        personalityTraits: this.list(this.form.controls.personality.value),
        values: this.list(this.form.controls.values.value),
        fears: this.list(this.form.controls.fears.value),
        strengths: this.list(this.form.controls.strengths.value),
        weaknesses: this.list(this.form.controls.weaknesses.value),
        backstory: this.form.controls.backstory.value,
        freeformDescription: this.form.controls.description.value,
        currentEmotionalState: ['attentif'],
        avatarUrl: null,
      });
      await this.router.navigate(['/aventure', this.gameId, 'salon']);
    } catch (e) {
      this.error.set(true);
      this.message.set(e instanceof Error ? e.message : 'Validation impossible.');
    } finally {
      this.saving.set(false);
    }
  }
}
