import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AppLayoutContentDirective } from '@shared/layout/app-layout-content.directive';
import {
  APP_LAYOUT_CONTEXT,
  AppLayoutContentIdentifier,
  AppLayoutContentRegistration,
  AppLayoutContext,
  AppLayoutContextSnapshot,
  AppLayoutTabIdentifier,
  AppLayoutTabRegistration
} from '@shared/layout/app-layout-context.token';

class AppLayoutContextStub implements AppLayoutContext {
  readonly registrations: AppLayoutContentRegistration[] = [];
  readonly unregisteredIdentifiers: AppLayoutContentIdentifier[] = [];

  registerContent(registration: AppLayoutContentRegistration): void {
    this.registrations.push(registration);
  }

  unregisterContent(identifier: AppLayoutContentIdentifier): void {
    this.unregisteredIdentifiers.push(identifier);
  }

  configureTabs(tabs: readonly AppLayoutTabRegistration[]): void {
    void tabs;
  }

  setActiveTab(identifier: AppLayoutTabIdentifier): void {
    void identifier;
  }

  clearTabs(): void {
    return;
  }

  snapshot(): AppLayoutContextSnapshot {
    return {
      activeContent: null,
      activeNavigationKey: null,
      tabs: [],
      activeTab: null
    };
  }
}

@Component({
  standalone: true,
  imports: [AppLayoutContentDirective],
  template: `
    <section
      appLayoutContent
      [appLayoutContentNavigationKey]="navigationKey"
      [appLayoutContentSurface]="surface"
    ></section>
  `
})
class HostComponent {
  navigationKey: string | null = 'navigation.home';
  surface: 'hero' | 'plain' = 'hero';
}

describe('AppLayoutContentDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let context: AppLayoutContextStub;

  beforeEach(async () => {
    context = new AppLayoutContextStub();

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: APP_LAYOUT_CONTEXT, useValue: context }]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('applies shared hero surface classes by default', () => {
    const element = fixture.debugElement.query(By.css('section')).nativeElement as HTMLElement;

    expect(element.classList.contains('app-layout__surface')).toBeTrue();
    expect(element.classList.contains('app-layout__surface--hero')).toBeTrue();
    expect(element.classList.contains('app-layout__surface--plain')).toBeFalse();
  });

  it('switches to the plain surface variant when configured', () => {
    const component = fixture.componentInstance;
    component.surface = 'plain';
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.css('section')).nativeElement as HTMLElement;

    expect(element.classList.contains('app-layout__surface')).toBeTrue();
    expect(element.classList.contains('app-layout__surface--plain')).toBeTrue();
    expect(element.classList.contains('app-layout__surface--hero')).toBeFalse();
  });

  it('registers and unregisters content using the layout context', () => {
    expect(context.registrations.length).toBe(1);
    expect(context.registrations[0].navigationKey).toBe('navigation.home');

    fixture.destroy();

    expect(context.unregisteredIdentifiers.length).toBe(1);
  });
});
