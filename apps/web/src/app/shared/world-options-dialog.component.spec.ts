import { TestBed } from '@angular/core/testing';
import { createDefaultWorldSettings, type WorldSettings } from '@odyssee/domain';
import { WorldSettingsService } from '../core/world-settings.service';
import { WorldOptionsDialogComponent } from './world-options-dialog.component';

describe('WorldOptionsDialogComponent', () => {
  let realtimeCallback: ((settings: WorldSettings) => void) | null = null;
  const settingsService = {
    load: vi.fn<() => Promise<WorldSettings>>(),
    save: vi.fn<(gameId: string, settings: WorldSettings) => Promise<WorldSettings>>(),
    subscribe: vi.fn(
      (_gameId: string, callback: (settings: WorldSettings) => void): (() => void) => {
        realtimeCallback = callback;
        return vi.fn();
      },
    ),
  };

  beforeEach(async () => {
    realtimeCallback = null;
    settingsService.load.mockResolvedValue(settings());
    settingsService.save.mockImplementation((_gameId, value) => Promise.resolve(value));
    await TestBed.configureTestingModule({
      imports: [WorldOptionsDialogComponent],
      providers: [{ provide: WorldSettingsService, useValue: settingsService }],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('lets the host open, edit and save world options during preparation', async () => {
    const { fixture, component } = await render({ isHost: true });

    expect(component.canEdit()).toBe(true);
    component.form.controls.title.setValue('La Cite des Brumes');
    component.form.markAsDirty();
    await component.save();
    fixture.detectChanges();

    expect(settingsService.save).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      expect.objectContaining({ title: 'La Cite des Brumes' }),
    );
    expect(fixture.nativeElement.textContent).toContain('Options enregistrées.');
  });

  it('keeps player 2 read-only by default', async () => {
    const { component, element } = await render({ isHost: false });

    expect(component.canEdit()).toBe(false);
    expect(component.form.disabled).toBe(true);
    expect(element.textContent).toContain("Les options du monde sont définies par l'hôte.");
  });

  it('allows only the host to toggle player 2 editing permission', async () => {
    const host = await render({ isHost: true });
    host.component.form.controls.allowPlayer2Edit.setValue(true);
    host.component.form.markAsDirty();
    await host.component.save();

    expect(settingsService.save).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      expect.objectContaining({ allowPlayer2Edit: true }),
    );

    settingsService.load.mockResolvedValue(settings({ allowPlayer2Edit: true }));
    const player2 = await render({ isHost: false });

    expect(player2.component.canEdit()).toBe(true);
    expect(player2.component.canEditPermission()).toBe(false);
    expect(player2.component.form.controls.allowPlayer2Edit.disabled).toBe(true);
    expect(player2.element.textContent).toContain('Vous pouvez modifier les options du monde.');
  });

  it('applies presets without locking subsequent edits', async () => {
    const { component } = await render({ isHost: true });

    component.applyPreset('cyberpunk');

    expect(component.form.controls.universeType.value).toBe('cyberpunk');
    expect(component.form.controls.magicLevel.value).toBe('none');
    expect(component.form.controls.technologyLevel.value).toBe('very_advanced');
    expect(component.form.dirty).toBe(true);
  });

  it('persists a custom timed turn duration', async () => {
    const { component } = await render({ isHost: true });

    component.form.controls.timerMode.setValue('timed');
    component.form.controls.timerSeconds.setValue(420);
    component.form.markAsDirty();
    await component.save();

    expect(settingsService.save).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      expect.objectContaining({ timerMode: 'timed', timerSeconds: 420 }),
    );

    component.setTimerSeconds(600);

    expect(component.form.controls.timerSeconds.value).toBe(600);
    expect(component.form.dirty).toBe(true);
  });

  it('shows custom fields only when an Autre value is selected', async () => {
    const { fixture, component } = await render({ isHost: true });

    component.form.controls.universeType.setValue('other');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Décrivez votre type d'univers");

    component.form.controls.universeType.setValue('fantasy');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain("Décrivez votre type d'univers");
  });

  it('updates limited multi-selection counters and blocks only new choices at the limit', async () => {
    const { fixture, component, element } = await render({ isHost: true });

    component.form.controls.atmospheres.setValue([]);
    fixture.detectChanges();
    expect(element.textContent).toMatch(/Ambiance\s+0\/3/);

    component.toggleAtmosphere('epic');
    fixture.detectChanges();
    expect(element.textContent).toMatch(/Ambiance\s+1\/3/);

    component.toggleAtmosphere('adventurous');
    fixture.detectChanges();
    expect(element.textContent).toMatch(/Ambiance\s+2\/3/);

    component.toggleAtmosphere('dark');
    fixture.detectChanges();
    expect(element.textContent).toMatch(/Ambiance\s+3\/3/);

    component.toggleAtmosphere('light');
    fixture.detectChanges();
    expect(component.form.controls.atmospheres.value).toEqual(['epic', 'adventurous', 'dark']);
    expect(component.isSelectionDisabled(component.form.controls.atmospheres, 'light', 3)).toBe(
      true,
    );
    expect(component.isSelectionDisabled(component.form.controls.atmospheres, 'epic', 3)).toBe(
      false,
    );

    component.toggleAtmosphere('epic');
    fixture.detectChanges();
    expect(component.form.controls.atmospheres.value).toEqual(['adventurous', 'dark']);
    expect(element.textContent).toMatch(/Ambiance\s+2\/3/);
  });

  it('shows counters for every limited multi-selection', async () => {
    const { element } = await render({ isHost: true });

    expect(element.textContent).toMatch(/Ambiance\s+2\/3/);
    expect(element.textContent).toMatch(/Éléments souhaités\s+3\/4/);
    expect(element.textContent).toMatch(/4\. Limites\s+0\/12/);
  });

  it('keeps dropdown values functional with readable native options', async () => {
    const { component, element } = await render({ isHost: true });
    const presetSelect = element.querySelector<HTMLSelectElement>(
      'select[formControlName="preset"]',
    );

    expect(presetSelect).not.toBeNull();
    expect([...presetSelect!.options].map((option) => option.textContent)).toContain('Cyberpunk');

    component.form.controls.preset.setValue('cyberpunk');
    presetSelect!.dispatchEvent(new Event('change'));

    expect(component.form.controls.universeType.value).toBe('cyberpunk');
  });

  it('does not overwrite a dirty form when a remote update arrives', async () => {
    const { component } = await render({ isHost: true });
    component.form.controls.title.setValue('Titre local');
    component.form.markAsDirty();

    realtimeCallback?.(settings({ title: 'Titre distant' }));

    expect(component.remoteNotice()).toContain('modifiées par votre compagnon');
    expect(component.form.controls.title.value).toBe('Titre local');
  });

  it('forces read-only mode after startup lock', async () => {
    settingsService.load.mockResolvedValue(settings({ lockedAt: '2026-08-08T10:00:00.000Z' }));

    const { component, element } = await render({ isHost: true, gameStatus: 'active' });

    expect(component.canEdit()).toBe(false);
    expect(component.form.disabled).toBe(true);
    expect(element.textContent).toContain('verrouillées');
  });

  async function render(input: { isHost: boolean; gameStatus?: string }): Promise<{
    fixture: ReturnType<typeof TestBed.createComponent<WorldOptionsDialogComponent>>;
    component: WorldOptionsDialogComponent;
    element: HTMLElement;
  }> {
    const fixture = TestBed.createComponent(WorldOptionsDialogComponent);
    fixture.componentRef.setInput('gameId', '550e8400-e29b-41d4-a716-446655440000');
    fixture.componentRef.setInput('gameStatus', input.gameStatus ?? 'waiting');
    fixture.componentRef.setInput('isHost', input.isHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return {
      fixture,
      component: fixture.componentInstance,
      element: fixture.nativeElement as HTMLElement,
    };
  }

  function settings(patch: Partial<WorldSettings> = {}): WorldSettings {
    return createDefaultWorldSettings({
      gameId: '550e8400-e29b-41d4-a716-446655440000',
      createdBy: '550e8400-e29b-41d4-a716-446655440001',
      createdAt: '2026-08-08T10:00:00.000Z',
      updatedAt: '2026-08-08T10:00:00.000Z',
      ...patch,
    });
  }
});
