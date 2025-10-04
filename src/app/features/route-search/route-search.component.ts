import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';

import { APP_CONFIG } from '../../core/config';

interface RouteSearchForm {
  origin: FormControl<string>;
  destination: FormControl<string>;
  date: FormControl<Date>;
}

@Component({
  selector: 'app-route-search',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    TranslateModule
  ],
  templateUrl: './route-search.component.html',
  styleUrl: './route-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RouteSearchComponent {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly translationKeys = APP_CONFIG.translationKeys.routeSearch;
  protected readonly form: FormGroup<RouteSearchForm> = this.formBuilder.nonNullable.group({
    origin: '',
    destination: '',
    date: new Date()
  });
  protected readonly submitted = signal(false);

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.set(true);
  }
}
