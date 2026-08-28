import type { OnDestroy, OnInit } from '@angular/core';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  applyWorldPreset,
  createDefaultWorldSettings,
  WORLD_SETTINGS_LIMITS,
  worldSettingsSchema,
  type WorldPreset,
  type WorldSettings,
} from '@odyssee/domain';
import { map, startWith } from 'rxjs';
import { isWorldSetupGameStatus } from '../core/game-status';
import { WorldSettingsService } from '../core/world-settings.service';

type Option = { value: string; label: string };

@Component({
  selector: 'app-world-options-dialog',
  imports: [ReactiveFormsModule],
  template: `
    <div class="world-options-backdrop" role="presentation" (click)="close()"></div>
    <section
      class="world-options-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="world-options-title"
    >
      <header class="world-options-header">
        <div>
          <p class="eyebrow">Préparation</p>
          <h2 id="world-options-title">Options du monde</h2>
          @if (readOnlyReason()) {
            <p>{{ readOnlyReason() }}</p>
          } @else {
            <p>Définissez les règles fondatrices de l'aventure.</p>
          }
        </div>
        <button type="button" class="icon-close" aria-label="Fermer" (click)="close()">×</button>
      </header>

      @if (loading()) {
        <div class="world-options-body">
          <p>Chargement des options...</p>
        </div>
      } @else {
        <form class="world-options-body" [formGroup]="form" (ngSubmit)="save()">
          @if (remoteNotice()) {
            <p class="remote-notice">{{ remoteNotice() }}</p>
          }

          <section class="options-step">
            <h3>1. Votre univers</h3>
            <label>
              Preset
              <select formControlName="preset" (change)="applyPreset(form.controls.preset.value)">
                @for (option of presetOptions; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </label>
            <label>
              Titre de l'aventure
              <input
                formControlName="title"
                maxlength="160"
                placeholder="Laissez vide pour que Nerys puisse proposer un titre plus tard."
              />
            </label>
            <div class="option-grid">
              <label>
                Type d'univers
                <select formControlName="universeType">
                  @for (option of universeOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
              <label>
                Magie / surnaturel
                <select formControlName="magicLevel">
                  @for (option of magicOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
              <label>
                Technologie
                <select formControlName="technologyLevel">
                  @for (option of technologyOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
            </div>
            @if (form.controls.universeType.value === 'other') {
              <label>
                Décrivez votre type d'univers
                <input formControlName="universeCustom" maxlength="120" />
              </label>
            }
            @if (form.controls.magicLevel.value === 'other') {
              <label>
                Décrivez la magie ou le surnaturel
                <input formControlName="magicCustom" maxlength="120" />
              </label>
            }
            @if (form.controls.technologyLevel.value === 'other') {
              <label>
                Décrivez la technologie
                <input formControlName="technologyCustom" maxlength="120" />
              </label>
            }
          </section>

          <section class="options-step">
            <h3>2. Votre histoire</h3>
            <div>
              <span class="field-title">
                Ambiance
                <span class="selection-count">
                  {{ atmosphereCount() }}/{{ selectionLimits.atmospheres }}
                </span>
              </span>
              <div class="chips">
                @for (option of atmosphereOptions; track option.value) {
                  <button
                    type="button"
                    class="chip"
                    [class.selected]="form.controls.atmospheres.value.includes(option.value)"
                    [disabled]="
                      isSelectionDisabled(
                        form.controls.atmospheres,
                        option.value,
                        selectionLimits.atmospheres
                      )
                    "
                    (click)="toggleAtmosphere(option.value)"
                  >
                    {{ option.label }}
                  </button>
                }
              </div>
            </div>
            @if (form.controls.atmospheres.value.includes('other')) {
              <label>
                Autre ambiance
                <input formControlName="atmosphereCustom" maxlength="120" />
              </label>
            }
            <label>
              Rythme narratif
              <select formControlName="narrativePace">
                @for (option of paceOptions; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </label>
            <div>
              <span class="field-title">
                Éléments souhaités
                <span class="selection-count">
                  {{ desiredElementCount() }}/{{ selectionLimits.desiredElements }}
                </span>
              </span>
              <div class="chips">
                @for (option of desiredOptions; track option.value) {
                  <button
                    type="button"
                    class="chip"
                    [class.selected]="form.controls.desiredElements.value.includes(option.value)"
                    [disabled]="
                      isSelectionDisabled(
                        form.controls.desiredElements,
                        option.value,
                        selectionLimits.desiredElements
                      )
                    "
                    (click)="toggleDesiredElement(option.value)"
                  >
                    {{ option.label }}
                  </button>
                }
              </div>
            </div>
            @if (form.controls.desiredElements.value.includes('other')) {
              <label>
                Autre élément souhaité
                <input formControlName="desiredElementsCustom" maxlength="160" />
              </label>
            }
            <label>
              Votre idée
              <textarea
                formControlName="freeDescription"
                maxlength="1200"
                placeholder="Une civilisation vit sur des îles flottantes et personne ne sait ce qui existe sous les nuages..."
              ></textarea>
            </label>
          </section>

          <section class="options-step">
            <h3>3. Règles de la partie</h3>
            <div class="option-grid">
              <label>
                Mode de jeu / minuterie
                <select formControlName="timerMode">
                  <option value="none">Sans limite de temps</option>
                  <option value="timed">Tours chronométrés</option>
                </select>
              </label>
              @if (form.controls.timerMode.value === 'timed') {
                <div class="timer-field">
                  <label>
                    Durée personnalisée
                    <input
                      type="number"
                      formControlName="timerSeconds"
                      min="120"
                      max="3600"
                      step="60"
                    />
                  </label>
                  <div class="chips timer-presets" aria-label="Durées rapides">
                    <button type="button" class="chip" (click)="setTimerSeconds(120)">
                      2 minutes
                    </button>
                    <button type="button" class="chip" (click)="setTimerSeconds(300)">
                      5 minutes
                    </button>
                    <button type="button" class="chip" (click)="setTimerSeconds(600)">
                      10 minutes
                    </button>
                  </div>
                </div>
              }
              <label>
                Logique du monde
                <select formControlName="worldLogic">
                  @for (option of logicOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
              <label>
                Romance
                <select formControlName="romanceLevel">
                  @for (option of romanceOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
              <label>
                Mort des personnages
                <select formControlName="playerDeathLevel">
                  @for (option of deathOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
              <label>
                Contenu intime
                <select formControlName="intimateContentLevel">
                  @for (option of intimateOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
            </div>
            <p class="hint">
              Les préférences de contenu définissent les limites narratives de la partie et doivent
              convenir aux deux joueurs.
            </p>
          </section>

          <section class="options-step">
            <h3>
              4. Limites
              <span class="selection-count">
                {{ forbiddenElementCount() }}/{{ selectionLimits.forbiddenElements }}
              </span>
            </h3>
            <div class="chips">
              @for (option of forbiddenOptions; track option.value) {
                <button
                  type="button"
                  class="chip danger"
                  [class.selected]="form.controls.forbiddenElements.value.includes(option.value)"
                  [disabled]="
                    isSelectionDisabled(
                      form.controls.forbiddenElements,
                      option.value,
                      selectionLimits.forbiddenElements
                    )
                  "
                  (click)="toggleForbiddenElement(option.value)"
                >
                  {{ option.label }}
                </button>
              }
            </div>
            @if (form.controls.forbiddenElements.value.includes('other')) {
              <label>
                Autre limite
                <input formControlName="forbiddenElementsCustom" maxlength="160" />
              </label>
            }
            <label class="permission">
              <input type="checkbox" formControlName="allowPlayer2Edit" />
              Autoriser mon compagnon à modifier les options
            </label>
          </section>

          <section class="options-summary">
            <h3>Résumé</h3>
            @for (line of summaryLines(); track line) {
              <p>{{ line }}</p>
            }
          </section>

          @if (error()) {
            <p class="form-message error">{{ error() }}</p>
          } @else if (message()) {
            <p class="form-message">{{ message() }}</p>
          }

          <footer class="world-options-footer">
            <button type="button" class="secondary" (click)="close()">Fermer</button>
            <button type="submit" [disabled]="!canEdit() || saving() || !form.dirty">
              {{ saving() ? 'Enregistrement...' : 'Enregistrer les options' }}
            </button>
          </footer>
        </form>
      }
    </section>
  `,
  styles: `
    .world-options-backdrop {
      position: fixed;
      inset: 0;
      z-index: 40;
      background: rgba(3, 8, 24, 0.58);
      backdrop-filter: blur(4px);
    }
    .world-options-modal {
      position: fixed;
      inset: clamp(0.8rem, 3vh, 2rem);
      z-index: 41;
      max-width: 72rem;
      margin: auto;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 1.1rem;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      color: #f8f8ff;
      background:
        linear-gradient(135deg, rgba(18, 27, 62, 0.9), rgba(48, 43, 86, 0.86)),
        rgba(13, 20, 44, 0.92);
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.34);
      overflow: hidden;
    }
    .world-options-header,
    .world-options-footer {
      padding: clamp(0.9rem, 2vh, 1.25rem) clamp(1rem, 2vw, 1.6rem);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .world-options-header {
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }
    .world-options-header h2,
    .world-options-header p,
    .options-step h3,
    .options-summary h3,
    .options-summary p {
      margin: 0;
    }
    .world-options-header h2 {
      font:
        600 clamp(1.45rem, 2vw, 2rem) 'Newsreader',
        serif;
    }
    .world-options-header p,
    .hint,
    .form-message,
    .remote-notice {
      color: rgba(255, 255, 255, 0.74);
    }
    .eyebrow,
    .field-title,
    label {
      color: rgba(255, 255, 255, 0.86);
      font-size: 0.82rem;
      font-weight: 800;
    }
    .field-title {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      margin-bottom: 0.45rem;
    }
    .selection-count {
      color: rgba(255, 255, 255, 0.66);
      font-size: 0.75rem;
      font-weight: 700;
    }
    .icon-close {
      width: 2.3rem;
      height: 2.3rem;
      padding: 0;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 50%;
      color: #fff;
      background: rgba(255, 255, 255, 0.08);
      font-size: 1.4rem;
      line-height: 1;
    }
    .world-options-body {
      min-height: 0;
      padding: clamp(0.85rem, 1.8vh, 1.2rem) clamp(1rem, 2vw, 1.6rem);
      display: grid;
      gap: clamp(0.75rem, 1.4vh, 1rem);
      overflow: auto;
    }
    .options-step,
    .options-summary {
      padding: clamp(0.8rem, 1.4vh, 1rem);
      border: 1px solid rgba(255, 255, 255, 0.13);
      border-radius: 0.9rem;
      display: grid;
      gap: 0.75rem;
      background: rgba(255, 255, 255, 0.06);
    }
    .option-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.75rem;
    }
    label {
      display: grid;
      gap: 0.35rem;
    }
    input,
    select,
    textarea {
      width: 100%;
      min-height: 2.35rem;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 0.65rem;
      color: #f8f8ff;
      background: rgba(255, 255, 255, 0.08);
      padding: 0.55rem 0.7rem;
      font: inherit;
    }
    select {
      color: #f5f7ff;
      background: rgba(19, 27, 58, 0.88);
      border-color: rgba(187, 178, 255, 0.34);
      color-scheme: dark;
    }
    select:focus {
      outline: 2px solid rgba(132, 116, 239, 0.5);
      outline-offset: 2px;
      border-color: rgba(187, 178, 255, 0.72);
      background: rgba(24, 33, 72, 0.96);
    }
    select option {
      color: #111827;
      background: #ffffff;
    }
    select option:checked {
      color: #ffffff;
      background: #5145bd;
    }
    textarea {
      min-height: 5rem;
      resize: vertical;
    }
    input:disabled,
    select:disabled,
    textarea:disabled,
    button:disabled {
      cursor: not-allowed;
      opacity: 0.58;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }
    .timer-field {
      display: grid;
      gap: 0.45rem;
    }
    .timer-presets {
      gap: 0.35rem;
    }
    .chip {
      min-height: 2rem;
      padding: 0.35rem 0.65rem;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 999px;
      color: rgba(255, 255, 255, 0.82);
      background: rgba(255, 255, 255, 0.06);
      font-size: 0.8rem;
    }
    .chip.selected {
      color: #fff;
      background: linear-gradient(120deg, #7562e5, #5145bd);
      border-color: rgba(255, 255, 255, 0.32);
    }
    .chip.danger.selected {
      background: linear-gradient(120deg, #b54865, #75314f);
    }
    .permission {
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      justify-content: start;
    }
    .permission input {
      width: auto;
      min-height: 0;
    }
    .options-summary {
      background: rgba(255, 255, 255, 0.1);
    }
    .options-summary p {
      color: rgba(255, 255, 255, 0.82);
      font-size: 0.88rem;
    }
    .form-message,
    .remote-notice {
      margin: 0;
      padding: 0.6rem 0.8rem;
      border-radius: 0.7rem;
      background: rgba(255, 255, 255, 0.08);
    }
    .form-message.error {
      color: #ffd6dc;
      background: rgba(120, 35, 58, 0.34);
    }
    .world-options-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.12);
    }
    .world-options-footer button {
      min-height: 2.35rem;
      padding: 0.55rem 1rem;
      border: 0;
      border-radius: 999px;
      color: #fff;
      background: linear-gradient(120deg, #7562e5, #5145bd);
      font-weight: 800;
    }
    .world-options-footer .secondary {
      color: rgba(255, 255, 255, 0.86);
      background: rgba(255, 255, 255, 0.1);
    }
    @media (max-width: 760px) {
      .world-options-modal {
        inset: 0;
        border-radius: 0;
      }
      .option-grid {
        grid-template-columns: 1fr;
      }
      .world-options-footer {
        align-items: stretch;
        flex-direction: column-reverse;
      }
    }
  `,
})
export class WorldOptionsDialogComponent implements OnInit, OnDestroy {
  private readonly settingsService = inject(WorldSettingsService);
  readonly selectionLimits = WORLD_SETTINGS_LIMITS;
  readonly gameId = input.required<string>();
  readonly gameStatus = input.required<string>();
  readonly isHost = input.required<boolean>();
  readonly closed = output<void>();
  readonly settings = signal<WorldSettings>(createDefaultWorldSettings());
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly remoteNotice = signal('');
  private unsubscribe: (() => void) | null = null;

  readonly canEdit = computed(
    () =>
      isWorldSetupGameStatus(this.gameStatus()) &&
      !this.settings().lockedAt &&
      (this.isHost() || this.settings().allowPlayer2Edit),
  );
  readonly canEditPermission = computed(
    () => this.isHost() && isWorldSetupGameStatus(this.gameStatus()) && !this.settings().lockedAt,
  );
  readonly readOnlyReason = computed(() => {
    if (!isWorldSetupGameStatus(this.gameStatus()) || this.settings().lockedAt) {
      return 'Les options du monde sont verrouillées depuis le démarrage de l’aventure.';
    }
    if (!this.canEdit()) return "Les options du monde sont définies par l'hôte.";
    if (!this.isHost()) return 'Vous pouvez modifier les options du monde.';
    return '';
  });

  readonly form = new FormGroup({
    preset: new FormControl<WorldPreset>('classic_fantasy', { nonNullable: true }),
    title: new FormControl('', { nonNullable: true }),
    universeType: new FormControl('fantasy', { nonNullable: true }),
    universeCustom: new FormControl('', { nonNullable: true }),
    magicLevel: new FormControl('present', { nonNullable: true }),
    magicCustom: new FormControl('', { nonNullable: true }),
    technologyLevel: new FormControl('medieval', { nonNullable: true }),
    technologyCustom: new FormControl('', { nonNullable: true }),
    atmospheres: new FormControl<string[]>(['adventurous', 'epic'], { nonNullable: true }),
    atmosphereCustom: new FormControl('', { nonNullable: true }),
    narrativePace: new FormControl('balanced', { nonNullable: true }),
    timerMode: new FormControl('none', { nonNullable: true }),
    timerSeconds: new FormControl<number | null>(null),
    romanceLevel: new FormControl('possible', { nonNullable: true }),
    playerDeathLevel: new FormControl('consequential', { nonNullable: true }),
    intimateContentLevel: new FormControl('fade_to_black', { nonNullable: true }),
    desiredElements: new FormControl<string[]>(['exploration', 'mysteries', 'creatures'], {
      nonNullable: true,
    }),
    desiredElementsCustom: new FormControl('', { nonNullable: true }),
    forbiddenElements: new FormControl<string[]>([], { nonNullable: true }),
    forbiddenElementsCustom: new FormControl('', { nonNullable: true }),
    worldLogic: new FormControl('coherent', { nonNullable: true }),
    freeDescription: new FormControl('', { nonNullable: true }),
    allowPlayer2Edit: new FormControl(false, { nonNullable: true }),
  });
  readonly atmosphereCount = toSignal(
    this.form.controls.atmospheres.valueChanges.pipe(
      startWith(this.form.controls.atmospheres.value),
      map((values) => values.length),
    ),
    { initialValue: this.form.controls.atmospheres.value.length },
  );
  readonly desiredElementCount = toSignal(
    this.form.controls.desiredElements.valueChanges.pipe(
      startWith(this.form.controls.desiredElements.value),
      map((values) => values.length),
    ),
    { initialValue: this.form.controls.desiredElements.value.length },
  );
  readonly forbiddenElementCount = toSignal(
    this.form.controls.forbiddenElements.valueChanges.pipe(
      startWith(this.form.controls.forbiddenElements.value),
      map((values) => values.length),
    ),
    { initialValue: this.form.controls.forbiddenElements.value.length },
  );

  readonly presetOptions: Option[] = [
    { value: 'classic_fantasy', label: 'Fantasy classique' },
    { value: 'dark_fantasy', label: 'Dark Fantasy' },
    { value: 'modern_fantasy', label: 'Fantastique moderne' },
    { value: 'science_fiction', label: 'Science-fiction' },
    { value: 'cyberpunk', label: 'Cyberpunk' },
    { value: 'post_apocalyptic', label: 'Post-apocalyptique' },
    { value: 'real_life', label: 'Vie réelle' },
    { value: 'historical', label: 'Historique' },
    { value: 'mystery_investigation', label: 'Mystère / Enquête' },
    { value: 'horror', label: 'Horreur' },
    { value: 'custom', label: 'Monde personnalisé' },
  ];
  readonly universeOptions: Option[] = [
    { value: 'fantasy', label: 'Fantasy' },
    { value: 'modern_fantasy', label: 'Fantastique contemporain' },
    { value: 'science_fiction', label: 'Science-fiction' },
    { value: 'cyberpunk', label: 'Cyberpunk' },
    { value: 'realistic_contemporary', label: 'Réaliste contemporain' },
    { value: 'historical', label: 'Historique' },
    { value: 'post_apocalyptic', label: 'Post-apocalyptique' },
    { value: 'horror', label: 'Horreur' },
    { value: 'steampunk', label: 'Steampunk' },
    { value: 'other', label: 'Autre' },
  ];
  readonly magicOptions = this.options([
    ['none', 'Aucun'],
    ['rare', 'Rare'],
    ['present', 'Présent'],
    ['very_present', 'Très présent'],
    ['other', 'Autre'],
  ]);
  readonly technologyOptions = this.options([
    ['primitive', 'Primitive'],
    ['medieval', 'Médiévale'],
    ['industrial', 'Industrielle'],
    ['modern', 'Moderne'],
    ['futuristic', 'Futuriste'],
    ['very_advanced', 'Très avancée'],
    ['other', 'Autre'],
  ]);
  readonly atmosphereOptions = this.options([
    ['epic', 'Épique'],
    ['adventurous', 'Aventureuse'],
    ['mysterious', 'Mystérieuse'],
    ['light', 'Légère'],
    ['dramatic', 'Dramatique'],
    ['dark', 'Sombre'],
    ['horrific', 'Horrifique'],
    ['romantic', 'Romantique'],
    ['melancholic', 'Mélancolique'],
    ['humorous', 'Humoristique'],
    ['other', 'Autre'],
  ]);
  readonly paceOptions = this.options([
    ['contemplative', 'Contemplatif'],
    ['balanced', 'Équilibré'],
    ['dynamic', 'Dynamique'],
  ]);
  readonly romanceOptions = this.options([
    ['none', 'Aucune'],
    ['possible', 'Possible'],
    ['important', 'Importante'],
  ]);
  readonly deathOptions = this.options([
    ['impossible', 'Impossible'],
    ['consequential', 'Possible avec conséquences'],
    ['free', 'Libre'],
  ]);
  readonly intimateOptions = this.options([
    ['none', 'Aucun'],
    ['suggested', 'Romance et intimité suggérées'],
    ['fade_to_black', 'Fondu au noir'],
  ]);
  readonly desiredOptions = this.options([
    ['exploration', 'Exploration'],
    ['mysteries', 'Mystères'],
    ['combats', 'Combats'],
    ['puzzles', 'Énigmes'],
    ['politics', 'Politique'],
    ['relationships', 'Relations entre personnages'],
    ['discoveries', 'Découvertes'],
    ['survival', 'Survie'],
    ['large_battles', 'Grandes batailles'],
    ['creatures', 'Créatures'],
    ['magic', 'Magie'],
    ['other', 'Autre'],
  ]);
  readonly forbiddenOptions = this.options([
    ['graphic_violence', 'Violence graphique'],
    ['torture', 'Torture'],
    ['horror', 'Horreur'],
    ['spiders_insects', 'Araignées / insectes'],
    ['illness', 'Maladie'],
    ['grief', 'Deuil'],
    ['animal_violence', 'Violence envers les animaux'],
    ['kidnapping', 'Enlèvement'],
    ['betrayal', 'Trahison'],
    ['harassment', 'Harcèlement'],
    ['other', 'Autre'],
  ]);
  readonly logicOptions = this.options([
    ['realistic', 'Réaliste'],
    ['coherent', 'Cohérente mais permissive'],
    ['very_free', 'Très libre'],
  ]);

  readonly summaryLines = computed(() => {
    const value = this.currentFormSettings();
    return [
      `${this.label(this.universeOptions, value.universeType)} • Magie ${this.label(this.magicOptions, value.magicLevel).toLowerCase()} • Technologie ${this.label(this.technologyOptions, value.technologyLevel).toLowerCase()}`,
      `${value.atmospheres.map((item) => this.label(this.atmosphereOptions, item)).join(' & ')} • Rythme ${this.label(this.paceOptions, value.narrativePace).toLowerCase()}`,
      `Romance ${this.label(this.romanceOptions, value.romanceLevel).toLowerCase()} • Mort ${this.label(this.deathOptions, value.playerDeathLevel).toLowerCase()}`,
      value.desiredElements.map((item) => this.label(this.desiredOptions, item)).join(', '),
      value.forbiddenElements.length
        ? `Sans ${value.forbiddenElements.map((item) => this.label(this.forbiddenOptions, item).toLowerCase()).join(', ')}`
        : 'Aucune limite supplémentaire renseignée',
    ];
  });

  async ngOnInit(): Promise<void> {
    await this.load();
    this.unsubscribe = this.settingsService.subscribe(this.gameId(), (settings) => {
      if (this.form.dirty) {
        this.remoteNotice.set('Les options ont été modifiées par votre compagnon.');
        this.settings.set(settings);
        return;
      }
      this.applySettings(settings);
    });
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
  }

  close(): void {
    this.closed.emit();
  }

  async save(): Promise<void> {
    if (!this.canEdit() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const saved = await this.settingsService.save(this.gameId(), this.currentFormSettings());
      this.applySettings(saved);
      this.message.set('Options enregistrées.');
    } catch (error) {
      console.error('Failed to save world settings', error);
      this.error.set("Impossible d'enregistrer les options du monde.");
    } finally {
      this.saving.set(false);
    }
  }

  applyPreset(preset: string): void {
    if (!this.canEdit()) return;
    const current = this.currentFormSettings();
    const next = applyWorldPreset(current, preset as WorldPreset);
    this.patchForm(next, true);
  }

  toggleAtmosphere(value: string): void {
    this.toggleList(this.form.controls.atmospheres, value, this.selectionLimits.atmospheres);
  }

  toggleDesiredElement(value: string): void {
    this.toggleList(
      this.form.controls.desiredElements,
      value,
      this.selectionLimits.desiredElements,
    );
  }

  toggleForbiddenElement(value: string): void {
    this.toggleList(
      this.form.controls.forbiddenElements,
      value,
      this.selectionLimits.forbiddenElements,
    );
  }

  setTimerSeconds(seconds: number): void {
    if (!this.canEdit()) return;
    this.form.controls.timerSeconds.setValue(seconds);
    this.form.controls.timerSeconds.markAsDirty();
    this.form.markAsDirty();
  }

  isSelectionDisabled(control: FormControl<string[]>, value: string, max: number): boolean {
    const current = control.value;
    return !this.canEdit() || (!current.includes(value) && current.length >= max);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.applySettings(await this.settingsService.load(this.gameId()));
    } catch (error) {
      console.error('Failed to load world settings', error);
      this.error.set('Impossible de charger les options du monde.');
    } finally {
      this.loading.set(false);
    }
  }

  private applySettings(settings: WorldSettings): void {
    this.settings.set(settings);
    this.patchForm(settings, false);
    this.remoteNotice.set('');
    if (this.canEdit()) this.form.enable({ emitEvent: false });
    else this.form.disable({ emitEvent: false });
    if (!this.canEditPermission())
      this.form.controls.allowPlayer2Edit.disable({ emitEvent: false });
  }

  private patchForm(settings: WorldSettings, dirty: boolean): void {
    this.form.patchValue(
      {
        preset: settings.preset,
        title: settings.title,
        universeType: settings.universeType,
        universeCustom: settings.universeCustom,
        magicLevel: settings.magicLevel,
        magicCustom: settings.magicCustom,
        technologyLevel: settings.technologyLevel,
        technologyCustom: settings.technologyCustom,
        atmospheres: settings.atmospheres,
        atmosphereCustom: settings.atmosphereCustom,
        narrativePace: settings.narrativePace,
        timerMode: settings.timerMode,
        timerSeconds: settings.timerSeconds,
        romanceLevel: settings.romanceLevel,
        playerDeathLevel: settings.playerDeathLevel,
        intimateContentLevel: settings.intimateContentLevel,
        desiredElements: settings.desiredElements,
        desiredElementsCustom: settings.desiredElementsCustom,
        forbiddenElements: settings.forbiddenElements,
        forbiddenElementsCustom: settings.forbiddenElementsCustom,
        worldLogic: settings.worldLogic,
        freeDescription: settings.freeDescription,
        allowPlayer2Edit: settings.allowPlayer2Edit,
      },
      { emitEvent: true },
    );
    if (dirty) this.form.markAsDirty();
    else this.form.markAsPristine();
  }

  private currentFormSettings(): WorldSettings {
    const raw = this.form.getRawValue();
    return worldSettingsSchema.parse({
      ...this.settings(),
      ...raw,
      gameId: this.gameId(),
      timerSeconds: raw.timerMode === 'timed' ? (raw.timerSeconds ?? 300) : null,
    });
  }

  private toggleList(control: FormControl<string[]>, value: string, max: number): void {
    if (!this.canEdit()) return;
    const current = control.value;
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : current.length < max
        ? [...current, value]
        : current;
    control.setValue(next);
    control.markAsDirty();
  }

  private label(options: Option[], value: string): string {
    return options.find((option) => option.value === value)?.label ?? value;
  }

  private options(values: Array<[string, string]>): Option[] {
    return values.map(([value, label]) => ({ value, label }));
  }
}
