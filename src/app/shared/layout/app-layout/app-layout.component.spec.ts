import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateCompiler, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { Observable, of } from 'rxjs';

import { AppLayoutComponent } from './app-layout.component';
import { AppShellTopActionsComponent } from '../top-actions/app-shell-top-actions.component';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({
      'layout.skipToContent': 'Skip to main content'
    });
  }
}

@Component({
  selector: 'app-app-shell-top-actions',
  standalone: true,
  template: ''
})
class AppShellTopActionsStubComponent {}

interface AppLayoutComponentAccess {
  readonly mainContentId: string;
  focusMainContent(): void;
}

const MAIN_ROLE = 'main';

describe('AppLayoutComponent', () => {
  let fixture: ComponentFixture<AppLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        AppLayoutComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
          compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler }
        })
      ]
    })
      .overrideComponent(AppLayoutComponent, {
        remove: { imports: [AppShellTopActionsComponent] },
        add: { imports: [AppShellTopActionsStubComponent] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.detectChanges();
  });

  it('links the skip control to the main content fragment', () => {
    const access = fixture.componentInstance as unknown as AppLayoutComponentAccess;
    const control = fixture.nativeElement.querySelector('.app-shell__skip-button') as HTMLAnchorElement | null;

    expect(control).not.toBeNull();
    expect(control?.getAttribute('href')).toBe(`#${access.mainContentId}`);
  });

  it('exposes the main landmark for routed content', () => {
    const access = fixture.componentInstance as unknown as AppLayoutComponentAccess;
    const element = fixture.nativeElement.querySelector(`#${access.mainContentId}`) as HTMLElement | null;

    expect(element).not.toBeNull();
    expect(element?.getAttribute('role')).toBe(MAIN_ROLE);
  });

  it('focuses the main content when the skip control is activated', () => {
    const access = fixture.componentInstance as unknown as AppLayoutComponentAccess;
    const element = fixture.nativeElement.querySelector(`#${access.mainContentId}`) as HTMLElement | null;

    expect(element).not.toBeNull();

    const target = element as HTMLElement;

    document.body.focus();
    access.focusMainContent();

    expect(document.activeElement).toBe(target);
  });

  it('ignores focus requests when the main content element is not present', () => {
    const access = fixture.componentInstance as unknown as AppLayoutComponentAccess;
    const element = fixture.nativeElement.querySelector(`#${access.mainContentId}`) as HTMLElement | null;

    element?.remove();

    expect(() => access.focusMainContent()).not.toThrow();
  });
});
