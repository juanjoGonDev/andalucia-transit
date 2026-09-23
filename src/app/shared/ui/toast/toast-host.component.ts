import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ToastEntry, ToastService } from './toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './toast-host.component.html',
  styleUrl: './toast-host.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService).toasts;
  private readonly service = inject(ToastService);

  protected dismiss(id: number): void {
    this.service.dismiss(id);
  }

  protected trackById(_index: number, toast: ToastEntry): number {
    return toast.id;
  }

  protected runAction(toast: ToastEntry): void {
    this.service.dismiss(toast.id);
    toast.action?.run();
  }
}
