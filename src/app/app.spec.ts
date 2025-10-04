import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { AppComponent } from './app';
import { routes } from './app.routes';

class TranslateTestingLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<Record<string, string>> {
    void lang;
    return of({});
  }
}

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: TranslateTestingLoader
          }
        })
      ],
      providers: [provideRouter(routes)]
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
});
