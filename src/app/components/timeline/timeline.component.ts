import {
  Component, ChangeDetectionStrategy, inject, signal,
  ElementRef, ViewChild, AfterViewInit, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelineService } from '../../services/timeline.service';
import { WorkOrderBarComponent } from '../work-order-bar/work-order-bar.component';
import { CreateEditPanelComponent } from '../create-edit-panel/create-edit-panel.component';
import { ZoomSelectorComponent } from '../zoom-selector/zoom-selector.component';
import { ZoomLevel } from '../../models/work-order.model';
import { startOfDay } from '../../utils/date-utils';

@Component({
  selector: 'app-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, WorkOrderBarComponent, CreateEditPanelComponent, ZoomSelectorComponent],
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
})
export class TimelineComponent implements AfterViewInit, OnDestroy {
  readonly svc        = inject(TimelineService);
  readonly hoveredRow = signal<string | null>(null);

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  private _ro?: ResizeObserver;

  ngAfterViewInit(): void {
    setTimeout(() => this._scrollToCurrentMonth(), 50);
    this._ro = new ResizeObserver(() => this._scrollToCurrentMonth());
    this._ro.observe(this.scrollContainer.nativeElement);
  }

  ngOnDestroy(): void { this._ro?.disconnect(); }

  private _scrollToCurrentMonth(): void {
    const el = this.scrollContainer?.nativeElement;
    if (!el) return;
    const now  = new Date();
    const segs = this.svc.segments();

    for (const seg of segs) {
      const isCurrentMonth =
        seg.date.getMonth() === now.getMonth() &&
        seg.date.getFullYear() === now.getFullYear();

      if (isCurrentMonth) {
        // centre the current month in the viewport
        el.scrollLeft = Math.max(0, seg.left - el.clientWidth / 2 + seg.width / 2);
        return;
      }
    }
  }

  onZoomChange(z: ZoomLevel): void {
    this.svc.setZoom(z);
    setTimeout(() => this._scrollToCurrentMonth(), 50);
  }

  onRowClick(event: MouseEvent, workCenterId: string): void {
    const target = event.target as HTMLElement;
    if (target.closest('.wo-bar') || target.closest('.wo-dropdown')) return;

    const scrollEl = this.scrollContainer.nativeElement;
    const rect     = scrollEl.getBoundingClientRect();
    const x        = event.clientX - rect.left + scrollEl.scrollLeft;
    const dateStr  = this.svc.xToDate(x);
    this.svc.openCreatePanel(workCenterId, dateStr);
  }

  onRowHover(id: string | null): void { this.hoveredRow.set(id); }

  trackById(_: number, item: { docId: string }): string { return item.docId; }

  get todayX(): number {
    const today = startOfDay(new Date());
    const zoom  = this.svc.zoom();

    if (zoom === 'month') {
      // For month view: find the current month segment and place line at today's position
      const now = new Date();
      for (const seg of this.svc.segments()) {
        if (seg.date.getMonth() === now.getMonth() && seg.date.getFullYear() === now.getFullYear()) {
          const dayFrac = (now.getDate() - 1) / (new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
          return seg.left + dayFrac * seg.width;
        }
      }
    }

    for (const seg of this.svc.segments()) {
      if (seg.date.toDateString() === today.toDateString()) return seg.left;
    }
    return -999;
  }
}
