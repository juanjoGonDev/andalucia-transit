import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { APP_CONFIG } from '@core/config';
import { buildStopDetailNavigation } from '@shared/navigation/navigation.util';

@Component({
  selector: 'app-stop-info-redirect',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StopInfoRedirectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const consortiumId = Number(
      this.route.snapshot.paramMap.get(APP_CONFIG.routeParams.stopInfo.consortiumId)
    );
    const stopNumber =
      this.route.snapshot.paramMap.get(APP_CONFIG.routeParams.stopInfo.stopNumber)?.trim() ?? '';

    if (!Number.isSafeInteger(consortiumId) || consortiumId <= 0 || !stopNumber) {
      void this.router.navigate(['/']);
      return;
    }

    const navigation = buildStopDetailNavigation(consortiumId, stopNumber);
    void this.router.navigate(navigation.commands, {
      queryParams: navigation.queryParams,
      replaceUrl: true
    });
  }
}
