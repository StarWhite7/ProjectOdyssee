import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomePage } from './home.page';

describe('HomePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders one heading and real application routes without duplicating global media', () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(element.querySelector('h1')?.textContent).toContain('Votre histoire.');
    expect(element.querySelector('video')).toBeFalsy();
    expect(element.querySelector('app-ambient-audio-control')).toBeFalsy();
    expect(element.querySelector('a[href="/tableau-de-bord"]')).toBeTruthy();
    expect(element.querySelector('a[href="#comment-jouer"]')).toBeTruthy();
  });
});
