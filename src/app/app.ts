import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@core/services/language.service';
import { PwaUpdateService } from '@core/services/pwa-update.service';
import { AlarmSchedulerService } from '@domain/stop-alarms/alarm-scheduler.service';

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
  private readonly alarmScheduler = inject(AlarmSchedulerService);

  ngOnInit(): void {
    this.languageService.initialize();
    this.pwaUpdateService.initialize();
    this.alarmScheduler.initialize();
  }
}
