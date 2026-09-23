import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateCompiler, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { RideLineProposal } from '@domain/ride-detection/ride-candidates.util';
import { RideDetectionService } from '@domain/ride-detection/ride-detection.service';
import { RideProposalBubbleComponent } from './ride-proposal-bubble.component';

const sampleProposal: RideLineProposal = {
  consortiumId: 3,
  lineId: 'L1',
  lineCode: 'M-101',
  direction: 1,
  destinationName: 'Centro',
  matches: 2,
  closestStopMeters: 90,
  directionAgrees: true,
  score: 0.9,
  stopIds: ['10', '11']
};

class RideDetectionStub {
  private readonly phaseSignal: WritableSignal<'idle' | 'collecting' | 'proposing'> =
    signal('idle');
  private readonly proposalsSignal: WritableSignal<readonly RideLineProposal[]> = signal<
    RideLineProposal[]
  >([]);

  readonly phase = this.phaseSignal.asReadonly();
  readonly proposals = this.proposalsSignal.asReadonly();

  readonly accept = jasmine.createSpy('accept');
  readonly dismiss = jasmine.createSpy('dismiss');

  setProposing(proposals: readonly RideLineProposal[]): void {
    this.phaseSignal.set('proposing');
    this.proposalsSignal.set(proposals);
  }
}

describe('RideProposalBubbleComponent', () => {
  let fixture: ComponentFixture<RideProposalBubbleComponent>;
  let detection: RideDetectionStub;
  let router: jasmine.SpyObj<Router>;
  let translate: TranslateService;

  beforeEach(async () => {
    detection = new RideDetectionStub();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        RideProposalBubbleComponent,
        TranslateModule.forRoot({
          defaultLanguage: 'en',
          compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler }
        })
      ],
      providers: [
        { provide: RideDetectionService, useValue: detection },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      layout: {
        rideProposal: {
          regionLabel: 'Trip suggestion',
          title: 'On the move?',
          subtitle: 'Start tracking',
          dismiss: 'Dismiss suggestion',
          lineLabel: 'Line {lineCode} · {destination}'
        }
      }
    });
    translate.use('en');

    fixture = TestBed.createComponent(RideProposalBubbleComponent);
    fixture.detectChanges();
  });

  it('stays hidden while the detector is idle', () => {
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelector('.ride-proposal')).toBeNull();
  });

  it('announces candidate lines when the detector proposes', () => {
    detection.setProposing([sampleProposal]);
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    const title = root.querySelector('.ride-proposal__title');
    const candidate = root.querySelector('.ride-proposal__candidate');

    expect(title?.textContent).toContain('On the move?');
    expect(candidate?.textContent).toContain('Line M-101 · Centro');
  });

  it('dismisses the bubble storing cooldown', () => {
    detection.setProposing([sampleProposal]);
    fixture.detectChanges();

    const dismiss = fixture.nativeElement.querySelector('.ride-proposal__dismiss') as HTMLButtonElement;
    dismiss.click();

    expect(detection.dismiss).toHaveBeenCalledTimes(1);
  });

  it('navigates to the stop feeding the top candidate', () => {
    detection.setProposing([sampleProposal]);
    fixture.detectChanges();

    const candidate = fixture.nativeElement.querySelector('.ride-proposal__candidate') as HTMLButtonElement;
    candidate.click();

    expect(detection.accept).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(
      jasmine.arrayContaining([jasmine.any(String)]),
      jasmine.objectContaining({ queryParams: { consortiumId: '3' } })
    );
  });
});
