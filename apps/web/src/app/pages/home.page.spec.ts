import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomePage } from './home.page';

describe('HomePage', () => {
  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders one heading, the video background and real application routes', () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(element.querySelector('h1')?.textContent).toContain('Votre histoire.');
    expect(element.querySelector('video source')?.getAttribute('src')).toBe(
      '/video/odyssee-background.mp4',
    );
    expect(element.querySelector('a[href="/tableau-de-bord"]')).toBeTruthy();
    expect(element.querySelector('a[href="#comment-jouer"]')).toBeTruthy();
  });

  it('keeps the background video playing when reduced motion is enabled', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause');
    const fixture = TestBed.createComponent(HomePage);

    fixture.detectChanges();

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(pause).not.toHaveBeenCalled();
  });
});
