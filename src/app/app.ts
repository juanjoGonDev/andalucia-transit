import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@core/services/language.service';
import { PwaUpdateService } from '@core/services/pwa-update.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TranslateModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit {
  private readonly languageService = inject(LanguageService);
  private readonly pwaUpdateService = inject(PwaUpdateService);

  ngOnInit(): void {
    this.languageService.initialize();
    this.pwaUpdateService.initialize();
  }
}
