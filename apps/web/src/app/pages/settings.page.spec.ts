import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { SettingsService, type SettingsProfile } from '../core/settings.service';
import { AmbientAudioService } from '../shared/ambient-audio.service';
import { SettingsPage } from './settings.page';

describe('SettingsPage', () => {
  const initialProfile: SettingsProfile = {
    id: 'user-1',
    email: 'mara@example.com',
    displayName: 'Mara',
    bio: 'Bonjour',
    avatarUrl: 'avatar-a.png',
    bannerUrl: 'banner-a.png',
    emailConfirmed: true,
    providers: ['email'],
    preferences: {
      friendRequestPolicy: 'everyone',
      gameInvitationPolicy: 'friends',
      profileVisibility: 'public',
      searchableByPseudo: true,
    },
    blockedUsers: [],
    appVersion: '0.1.0',
  };

  const settings = {
    load: vi.fn<() => Promise<SettingsProfile | null>>(),
    updateProfile:
      vi.fn<(input: { displayName: string; bio: string }) => Promise<SettingsProfile | null>>(),
    uploadProfileImage:
      vi.fn<(kind: 'avatar' | 'banner', file: File) => Promise<SettingsProfile | null>>(),
    updatePreferences:
      vi.fn<(input: SettingsProfile['preferences']) => Promise<SettingsProfile | null>>(),
    updateEmail: vi.fn<() => Promise<void>>(),
    updatePassword: vi.fn<() => Promise<void>>(),
    unblockUser: vi.fn<() => Promise<SettingsProfile | null>>(),
    deleteAccount: vi.fn<() => Promise<void>>(),
  };

  beforeEach(async () => {
    settings.load.mockResolvedValue(initialProfile);
    settings.updateProfile.mockImplementation(async (input) => ({
      ...initialProfile,
      displayName: input.displayName.trim(),
      bio: input.bio.trim(),
    }));
    settings.uploadProfileImage.mockResolvedValue({
      ...initialProfile,
      avatarUrl: 'avatar-b.png',
    });
    settings.updatePreferences.mockImplementation(async (preferences) => ({
      ...initialProfile,
      preferences,
    }));
    settings.updateEmail.mockResolvedValue();
    settings.updatePassword.mockResolvedValue();
    settings.unblockUser.mockResolvedValue(initialProfile);
    settings.deleteAccount.mockResolvedValue();

    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        provideRouter([]),
        { provide: SettingsService, useValue: settings },
        {
          provide: AuthService,
          useValue: {
            signOut: vi.fn(),
          },
        },
        {
          provide: AmbientAudioService,
          useValue: {
            playing: signal(false),
            preferredEnabled: signal(false),
            volumePercent: signal(20),
            setPreferredEnabled: vi.fn(),
            setVolumePercent: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.inject(Router).dispose();
    vi.clearAllMocks();
  });

  async function render(): Promise<SettingsPage> {
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('enables profile save only when the profile values differ from the initial snapshot', async () => {
    const page = await render();

    expect(page.profileDirty()).toBe(false);

    page.profileForm.controls.bio.setValue('Bonjour a tous');
    expect(page.profileDirty()).toBe(true);

    page.profileForm.controls.bio.setValue('Bonjour');
    expect(page.profileDirty()).toBe(false);

    page.profileForm.controls.bio.setValue('Bio sauvegardee');
    await page.saveProfile();

    expect(settings.updateProfile).toHaveBeenCalledWith({
      displayName: 'Mara',
      bio: 'Bio sauvegardee',
    });
    expect(page.profileDirty()).toBe(false);

    page.profileForm.controls.displayName.setValue('Mara bis');
    expect(page.profileDirty()).toBe(true);
  });

  it('updates the profile snapshot after an avatar upload', async () => {
    const page = await render();
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });

    await page.uploadImage('avatar', { target: input } as unknown as Event);

    expect(settings.uploadProfileImage).toHaveBeenCalledWith('avatar', file);
    expect(page.profile()?.avatarUrl).toBe('avatar-b.png');
    expect(page.profileDirty()).toBe(false);
  });

  it('keeps the profile banner image inside a bounded cover frame', () => {
    const styles = (
      SettingsPage as unknown as {
        ɵcmp: { styles: string[] };
      }
    ).ɵcmp.styles.join('\n');

    expect(styles).toContain('.banner-preview');
    expect(styles).toContain('height: clamp(6rem, 14vh, 8rem)');
    expect(styles).toContain('max-height: 8rem');
    expect(styles).toContain('overflow: hidden');
    expect(styles).toMatch(/\.banner-preview[\s\S]*img/);
    expect(styles).toContain('object-fit: cover');
    expect(styles).toContain('object-position: center');
    expect(styles).toContain('display: block');
    expect(styles).toMatch(/\.banner-preview[\s\S]*\.file-action/);
    expect(styles).toContain('position: absolute');
  });

  it('maps every settings section to its decorative background image', async () => {
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const expectations = [
      ['profile', 'url(/images/settings/profil.png)'],
      ['account', 'url(/images/settings/compte.png)'],
      ['experience', 'url(/images/settings/experience.png)'],
      ['privacy', 'url(/images/settings/confidentialite.png)'],
      ['about', 'url(/images/settings/a-propos.png)'],
    ] as const;

    for (const [section, background] of expectations) {
      fixture.componentInstance.activeSection.set(section);
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.settings-bg-card') as HTMLElement;
      const activeNavButton = fixture.nativeElement.querySelector(
        '.settings-nav button.active',
      ) as HTMLElement;
      expect(fixture.componentInstance.settingsBackground(section)).toBe(background);
      expect(card).not.toBeNull();
      expect(card.style.getPropertyValue('--settings-bg')).toBe(background);
      expect(activeNavButton).not.toBeNull();
      expect(activeNavButton.style.getPropertyValue('--settings-bg')).toBe(background);
    }
  });

  it('renders the about section as two separated cards', async () => {
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.activeSection.set('about');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.settings-bg-card--about .about-content')).not.toBeNull();
    expect(element.querySelector('.settings-bg-card--about .about-main-card')).not.toBeNull();
    expect(element.querySelector('.settings-bg-card--about .about-links-card')).not.toBeNull();
    expect(element.querySelector('.settings-bg-card--about .about-links')).not.toBeNull();
  });

  it('marks the account section with compact layout classes', async () => {
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.activeSection.set('account');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.account-panel')).not.toBeNull();
    expect(element.querySelector('.account-email-form')).not.toBeNull();
    expect(element.querySelector('.account-password-form')).not.toBeNull();
    expect(element.textContent).not.toContain('Envoyer un lien de réinitialisation');
    expect(element.textContent).toContain('Changer le mot de passe');
    expect(
      element.querySelector('.danger-zone input[formControlName="confirmation"]'),
    ).not.toBeNull();
  });

  it('enables account deletion only with the expected confirmation', async () => {
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.activeSection.set('account');
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      '.delete-account-button',
    ) as HTMLButtonElement;

    expect(page.canDeleteAccount()).toBe(false);
    expect(button.disabled).toBe(true);

    page.deleteAccountForm.controls.confirmation.setValue('SUPPRIM');
    fixture.detectChanges();
    expect(page.canDeleteAccount()).toBe(false);
    expect(button.disabled).toBe(true);

    page.deleteAccountForm.controls.confirmation.setValue('supprimer');
    fixture.detectChanges();
    expect(page.canDeleteAccount()).toBe(false);
    expect(button.disabled).toBe(true);

    page.deleteAccountForm.controls.confirmation.setValue('SUPPRIMER');
    fixture.detectChanges();
    expect(page.canDeleteAccount()).toBe(true);
    expect(button.disabled).toBe(false);

    page.deleteAccountForm.controls.confirmation.setValue('SUPPRIMEZ');
    fixture.detectChanges();
    expect(page.canDeleteAccount()).toBe(false);
    expect(button.disabled).toBe(true);
  });

  it('keeps account deletion disabled while deletion is in progress', async () => {
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.activeSection.set('account');
    page.deleteAccountForm.controls.confirmation.setValue('SUPPRIMER');
    page.deletingAccount.set(true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '.delete-account-button',
    ) as HTMLButtonElement;

    expect(page.canDeleteAccount()).toBe(true);
    expect(button.disabled).toBe(true);
  });

  it('does not trigger account deletion when confirmation is invalid', async () => {
    const page = await render();

    page.deleteAccountForm.controls.confirmation.setValue('SUPPRIM');
    await page.deleteAccount();

    expect(settings.deleteAccount).not.toHaveBeenCalled();

    page.deleteAccountForm.controls.confirmation.setValue('SUPPRIMER');
    await page.deleteAccount();

    expect(settings.deleteAccount).toHaveBeenCalledWith('SUPPRIMER');
  });

  it('enables account email save only when the email differs from the initial value', async () => {
    const page = await render();

    expect(page.emailDirty()).toBe(false);

    page.emailForm.controls.email.setValue('new@example.com');
    expect(page.emailDirty()).toBe(true);

    page.emailForm.controls.email.setValue('mara@example.com');
    expect(page.emailDirty()).toBe(false);

    page.emailForm.controls.email.setValue('new@example.com');
    await page.saveEmail();

    expect(settings.updateEmail).toHaveBeenCalledWith('new@example.com');
    expect(page.emailDirty()).toBe(false);
  });

  it('keeps direct password change available from the account section', async () => {
    const page = await render();

    page.passwordForm.setValue({
      password: 'nouveau-secret',
      confirmPassword: 'nouveau-secret',
    });
    await page.savePassword();

    expect(settings.updatePassword).toHaveBeenCalledWith('nouveau-secret');
    expect(page.passwordForm.getRawValue()).toEqual({ password: '', confirmPassword: '' });
  });

  it('enables privacy save only when preferences differ from the initial snapshot', async () => {
    const page = await render();

    expect(page.privacyDirty()).toBe(false);

    page.privacyForm.controls.searchableByPseudo.setValue(false);
    expect(page.privacyDirty()).toBe(true);

    page.privacyForm.controls.searchableByPseudo.setValue(true);
    expect(page.privacyDirty()).toBe(false);

    page.privacyForm.controls.friendRequestPolicy.setValue('nobody');
    await page.savePreferences();

    expect(settings.updatePreferences).toHaveBeenCalledWith({
      friendRequestPolicy: 'nobody',
      gameInvitationPolicy: 'friends',
      profileVisibility: 'public',
      searchableByPseudo: true,
    });
    expect(page.privacyDirty()).toBe(false);

    page.privacyForm.controls.profileVisibility.setValue('friends');
    expect(page.privacyDirty()).toBe(true);
  });
});
