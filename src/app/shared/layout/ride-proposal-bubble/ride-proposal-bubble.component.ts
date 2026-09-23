import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RideLineProposal } from '@domain/ride-detection/ride-candidates.util';
import { RideDetectionService } from '@domain/ride-detection/ride-detection.service';
import {
  StopDetailNavigation,
  buildStopDetailNavigation
} from '@shared/navigation/navigation.util';

const RIDE_PROPOSAL_I18N = {
  regionLabel: 'layout.rideProposal.regionLabel',
  title: 'layout.rideProposal.title',
  subtitle: 'layout.rideProposal.subtitle',
  dismiss: 'layout.rideProposal.dismiss',
  lineLabel: 'layout.rideProposal.lineLabel'
} as const;

/**
 * Floating bubble shown while the ride detector has confident line
 * candidates. Positioned pinned above the bottom navigation so it never
 * hides fixed chrome; everything stays on-device (directory snapshot + the
 * public timetable API already used elsewhere in the app).
 */
@Component({
  selector: 'app-ride-proposal-bubble',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './ride-proposal-bubble.component.html',
  styleUrl: './ride-proposal-bubble.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ride-proposal-host'
  }
})
export class RideProposalBubbleComponent {
  protected readonly i18n = RIDE_PROPOSAL_I18N;
  readonly detection = inject(RideDetectionService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  protected readonly visible = computed(() => {
    return this.detection.phase() === 'proposing' && this.detection.proposals().length > 0;
  });

  protected readonly proposals = computed(() => this.detection.proposals());

  protected candidateLabel(proposal: RideLineProposal): string {
    return this.translate.instant(this.i18n.lineLabel, {
      lineCode: proposal.lineCode,
      destination: proposal.destinationName
    });
  }

  trackByStop(_: number, proposal: RideLineProposal): string {
    return `${proposal.consortiumId}:${proposal.lineId}:${proposal.direction}`;
  }

  onDismiss(): void {
    this.detection.dismiss();
  }

  onOpen(proposal: RideLineProposal): void {
    const stopId = proposal.stopIds[0];
    this.detection.accept();

    const navigation: StopDetailNavigation = buildStopDetailNavigation(
      proposal.consortiumId,
      stopId
    );

    if (navigation.commands.length === 0) {
      return;
    }

    void this.router.navigate(navigation.commands, { queryParams: navigation.queryParams });
  }
}
