import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { GameService } from '../core/game.service';
import { DeleteGameDialogComponent } from './delete-game-dialog.component';

describe('DeleteGameDialogComponent', () => {
  let deleteGame: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    deleteGame = vi.fn().mockResolvedValue('deleted');
    TestBed.configureTestingModule({
      imports: [DeleteGameDialogComponent],
      providers: [{ provide: GameService, useValue: { deleteGameForAll: deleteGame } }],
    });
  });

  it('opens a complete destructive warning and makes cancellation the safe default', () => {
    const fixture = TestBed.createComponent(DeleteGameDialogComponent);
    fixture.componentRef.setInput('gameId', 'game-1');
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.danger-trigger')).nativeElement.click();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const destructive = fixture.debugElement.query(By.css('button.danger'))
      .nativeElement as HTMLButtonElement;

    expect(text).toContain('Quitter cette aventure ?');
    expect(text).toContain('supprimée définitivement pour les deux joueurs');
    expect(text).toContain('Cette action est définitive');
    expect(destructive.disabled).toBe(true);
    expect(deleteGame).not.toHaveBeenCalled();

    fixture.debugElement.query(By.css('button.secondary')).nativeElement.click();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[role="dialog"]'))).toBeNull();
  });

  it('requires SUPPRIMER, prevents duplicate submissions and emits after success', async () => {
    let finish!: (value: 'deleted') => void;
    deleteGame.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const fixture = TestBed.createComponent(DeleteGameDialogComponent);
    fixture.componentRef.setInput('gameId', 'game-1');
    const component = fixture.componentInstance;
    const emitted = vi.fn();
    component.deleted.subscribe(emitted);
    component.open();
    component.confirmation = 'SUPPRIMER';

    const request = component.confirmDelete();
    void component.confirmDelete();
    expect(component.deleting()).toBe(true);
    expect(deleteGame).toHaveBeenCalledOnce();
    finish('deleted');
    await request;

    expect(emitted).toHaveBeenCalledWith('deleted');
    expect(component.opened()).toBe(false);
  });

  it('shows a safe error and keeps the dialog open when deletion fails', async () => {
    deleteGame.mockRejectedValueOnce(new Error('PostgreSQL internal details'));
    const fixture = TestBed.createComponent(DeleteGameDialogComponent);
    fixture.componentRef.setInput('gameId', 'game-1');
    const component = fixture.componentInstance;
    component.open();
    component.confirmation = 'SUPPRIMER';

    await component.confirmDelete();

    expect(component.opened()).toBe(true);
    expect(component.error()).toContain('Réessayez');
    expect(component.error()).not.toContain('PostgreSQL');
  });
});
