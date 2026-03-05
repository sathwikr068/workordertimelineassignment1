import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, signal, HostListener, ElementRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZoomLevel } from '../../models/work-order.model';

@Component({
  selector: 'app-zoom-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="timescale-wrap">
      <span class="ts-label">Timescale</span>
      <div class="ts-pill" (click)="toggleDropdown($event)">
        <span class="ts-value">{{ currentLabel }}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      @if (open()) {
        <div class="ts-dropdown">
          @for (opt of options; track opt.value) {
            <div
              class="ts-option"
              [class.active]="zoom === opt.value"
              (click)="select(opt.value, $event)">
              {{ opt.label }}
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { position: relative; display: inline-block; }

    .timescale-wrap {
      display: flex;
      align-items: center;
      gap: 0;
      position: relative;
    }

    .ts-label {
      font-size: 13px;
      font-weight: 400;
      color: #6b7280;
      font-family: "Circular-Std", sans-serif;
      border: 1px solid #e2e4e9;
      border-right: none;
      padding: 5px 10px 5px 12px;
      border-radius: 6px 0 0 6px;
      background: #fff;
      line-height: 1.4;
      white-space: nowrap;
    }

    .ts-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px 5px 10px;
      border: 1px solid #e2e4e9;
      border-radius: 0 6px 6px 0;
      background: #fff;
      cursor: pointer;
      font-family: "Circular-Std", sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #1a1a2e;
      transition: background 0.12s;
      user-select: none;
      line-height: 1.4;

      &:hover { background: #f8f9fc; }
      svg { color: #6b7280; flex-shrink: 0; }
    }

    .ts-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      background: #fff;
      border: 1px solid #e2e4e9;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.10);
      z-index: 500;
      min-width: 140px;
      overflow: hidden;
      animation: ddIn 0.1s ease;
    }

    @keyframes ddIn {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .ts-option {
      padding: 9px 16px;
      font-size: 14px;
      font-weight: 400;
      color: #374151;
      cursor: pointer;
      font-family: "Circular-Std", sans-serif;
      transition: background 0.1s;

      &:hover { background: #f3f4f6; }
      &.active {
        color: #6c63ff;
        font-weight: 600;
        background: #f0f0ff;
      }
    }
  `]
})
export class ZoomSelectorComponent {
  @Input({ required: true }) zoom!: ZoomLevel;
  @Output() zoomChange = new EventEmitter<ZoomLevel>();

  private readonly el = inject(ElementRef);
  readonly open = signal(false);

  readonly options: { value: ZoomLevel; label: string }[] = [
    { value: 'day',   label: 'Day'   },
    { value: 'week',  label: 'Week'  },
    { value: 'month', label: 'Month' },
  ];

  get currentLabel(): string {
    return this.options.find(o => o.value === this.zoom)?.label ?? 'Month';
  }

  toggleDropdown(e: MouseEvent): void {
    e.stopPropagation();
    this.open.update(v => !v);
  }

  select(value: ZoomLevel, e: MouseEvent): void {
    e.stopPropagation();
    this.zoomChange.emit(value);
    this.open.set(false);
  }

  @HostListener('document:click')
  onDocClick(): void { this.open.set(false); }
}
