import { TestBed } from '@angular/core/testing';
import { AmbientAudioControlComponent } from './ambient-audio-control.component';

describe('AmbientAudioControlComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AmbientAudioControlComponent],
    }).compileComponents();
  });

  it('starts paused and does not preload the audio', () => {
    const fixture = TestBed.createComponent(AmbientAudioControlComponent);
    fixture.detectChanges();
    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(audio.getAttribute('preload')).toBe('none');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Activer la musique');
  });

  it('starts playback only after the user activates the control', async () => {
    const fixture = TestBed.createComponent(AmbientAudioControlComponent);
    fixture.detectChanges();
    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    const play = vi.spyOn(audio, 'play').mockResolvedValue();

    await fixture.componentInstance.toggle();
    fixture.detectChanges();

    expect(play).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.playing()).toBe(true);
    expect(localStorage.getItem('odyssee-ambient-audio-enabled')).toBe('true');
    fixture.destroy();
  });

  it('handles an unavailable audio file without throwing', async () => {
    const fixture = TestBed.createComponent(AmbientAudioControlComponent);
    fixture.detectChanges();
    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    vi.spyOn(audio, 'play').mockRejectedValue(new Error('missing file'));

    await fixture.componentInstance.toggle();

    expect(fixture.componentInstance.playing()).toBe(false);
    expect(fixture.componentInstance.label()).toBe('Musique indisponible');
  });
});
