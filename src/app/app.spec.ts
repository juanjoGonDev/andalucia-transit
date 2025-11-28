import { registerLocaleData } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import localeEs from '@angular/common/locales/es';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateCompiler, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { Observable, of } from 'rxjs';
import { AppComponent } from '@app/app';
import { routes } from '@app/app.routes';
import {
  StopDirectoryOption,
  StopDirectoryService
} from '@data/stops/stop-directory.service';
import { AppLayoutComponent } from '@shared/layout/app-layout/app-layout.component';

class StopDirectoryTestingService {
  searchStops(): Observable<readonly StopDirectoryOption[]> {
    return of([] as const satisfies readonly StopDirectoryOption[]);
  }

  getStopById(): Observable<null> {
    return of(null);
  }

  getOptionByStopId(): Observable<StopDirectoryOption | null> {
    return of(null);
  }

  getOptionByStopSignature(): Observable<StopDirectoryOption | null> {
    return of(null);
  }
}

class TranslateTestingLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<Record<string, string>> {
    void lang;
    return of({});
  }
}

describe('AppComponent', () => {
  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: TranslateTestingLoader
          },
          compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler }
        })
      ],
      providers: [
        provideRouter(routes),
        { provide: StopDirectoryService, useClass: StopDirectoryTestingService }
      ]
    }).compileComponents();
  });

  it('creates the app shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the routed content outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const outlet = compiled.querySelector('router-outlet');
    expect(outlet).not.toBeNull();
  });

  it('navigates to the home component for the root path', async () => {
    const harness = await RouterTestingHarness.create();
    const instance = await harness.navigateByUrl('/', AppLayoutComponent);
    expect(instance).toBeInstanceOf(AppLayoutComponent);
    const rendered = harness.routeNativeElement as HTMLElement;
    expect(rendered.querySelector('.home')).not.toBeNull();
    expect(rendered.querySelector('.shell-actions')).not.toBeNull();
  });
});
