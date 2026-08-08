import { TestBed } from '@angular/core/testing';
import { AmbientAudioService } from './ambient-audio.service';
import { AmbientAudioControlComponent } from './ambient-audio-control.component';

describe('AmbientAudioControlComponent', () => {
  beforeAll(() => {
    if (globalThis.localStorage) return;
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        clear: () => store.clear(),
        getItem: (key: string) => store.get(key) ?? null,
        removeItem: (key: string) => store.delete(key),
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });
  });

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

    expect(fixture.nativeElement.querySelectorAll('audio')).toHaveLength(1);
    expect(audio.getAttribute('preload')).toBe('none');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Activer la musique');
    expect(fixture.nativeElement.querySelector('input[type="range"]').value).toBe('20');
  });

  it('starts playback only after the user activates the control', async () => {
    const fixture = TestBed.createComponent(AmbientAudioControlComponent);
    fixture.detectChanges();
    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    const play = vi.spyOn(audio, 'play').mockResolvedValue();

    await fixture.componentInstance.toggle();
    fixture.detectChanges();

    expect(play).toHaveBeenCalledOnce();
    expect(TestBed.inject(AmbientAudioService).playing()).toBe(true);
    expect(localStorage.getItem('odyssee-ambient-audio-enabled')).toBe('true');
    fixture.destroy();
  });

  it('starts playback when the shared preference is enabled externally', async () => {
    const fixture = TestBed.createComponent(AmbientAudioControlComponent);
    fixture.detectChanges();
    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    const play = vi.spyOn(audio, 'play').mockResolvedValue();
    const service = TestBed.inject(AmbientAudioService);

    service.setPreferredEnabled(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(play).toHaveBeenCalled();
    expect(service.playing()).toBe(true);
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-pressed')).toBe('true');
    fixture.destroy();
  });

  it('pauses playback when the shared preference is disabled externally', async () => {
    const fixture = TestBed.createComponent(AmbientAudioControlComponent);
    fixture.detectChanges();
    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    vi.spyOn(audio, 'play').mockResolvedValue();
    const pause = vi.spyOn(audio, 'pause').mockImplementation(() => undefined);
    const service = TestBed.inject(AmbientAudioService);

    await fixture.componentInstance.toggle();
    audio.currentTime = 42;
    service.setPreferredEnabled(false);
    fixture.detectChanges();

    expect(pause).toHaveBeenCalled();
    expect(service.preferredEnabled()).toBe(false);
    expect(service.playing()).toBe(false);
    expect(audio.currentTime).toBe(42);
    fixture.destroy();
  });

  it('resumes from the paused position and keeps the same volume', async () => {
    const fixture = TestBed.createComponent(AmbientAudioControlComponent);
    fixture.detectChanges();
    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    const play = vi.spyOn(audio, 'play').mockResolvedValue();
    vi.spyOn(audio, 'pause').mockImplementation(() => undefined);
    const service = TestBed.inject(AmbientAudioService);

    service.setVolumePercent(20);
    await fixture.componentInstance.toggle();
    audio.currentTime = 37;
    service.setPreferredEnabled(false);
    fixture.detectChanges();
    service.setPreferredEnabled(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(play).toHaveBeenCalledTimes(2);
    expect(audio.currentTime).toBe(37);
    expect(service.volumePercent()).toBe(20);
    expect(localStorage.getItem('odyssee-ambient-audio-volume')).toBe('0.2');
    fixture.destroy();
  });

  it('handles an unavailable audio file without throwing', async () => {
    const fixture = TestBed.createComponent(AmbientAudioControlComponent);
    fixture.detectChanges();
    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    vi.spyOn(audio, 'play').mockRejectedValue(new Error('missing file'));

    await fixture.componentInstance.toggle();

    expect(TestBed.inject(AmbientAudioService).playing()).toBe(false);
    expect(fixture.componentInstance.label()).toBe('Musique indisponible');
  });

  it('updates and remembers the volume', () => {
    const fixture = TestBed.createComponent(AmbientAudioControlComponent);
    fixture.detectChanges();
    const audio = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    const slider = fixture.nativeElement.querySelector('input[type="range"]') as HTMLInputElement;

    slider.value = '64';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.volumePercent()).toBe(64);
    expect(audio.volume).toBe(0.64);
    expect(localStorage.getItem('odyssee-ambient-audio-volume')).toBe('0.64');
    expect(fixture.nativeElement.querySelector('output').textContent).toContain('64%');
  });

  it('restores the saved volume', () => {
    localStorage.setItem('odyssee-ambient-audio-volume', '0.35');

    const fixture = TestBed.createComponent(AmbientAudioControlComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.volumePercent()).toBe(35);
  });
});
