import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeHeaderComponent } from './home-header.component';

describe('HomeHeaderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeHeaderComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('opens an accessible mobile navigation and locks background scrolling', () => {
    const fixture = TestBed.createComponent(HomeHeaderComponent);
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('.menu-toggle') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('#mobile-navigation')).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('closes the mobile navigation with Escape', () => {
    const fixture = TestBed.createComponent(HomeHeaderComponent);
    fixture.detectChanges();
    fixture.componentInstance.toggleMenu();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.menuOpen()).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });
});
