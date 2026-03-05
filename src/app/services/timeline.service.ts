import { Injectable, signal, computed } from '@angular/core';
import { WorkCenterDocument } from '../models/work-center.model';
import {
  WorkOrderDocument, WorkOrderStatus,
  ZoomLevel, PanelMode, TimelineSegment, BarPosition
} from '../models/work-order.model';
import { SAMPLE_WORK_CENTERS, SAMPLE_WORK_ORDERS } from '../data/sample-data';
import {
  addDays, startOfDay, startOfMonth, endOfMonth,
  formatISO, parseISO, daysBetween, rangesOverlap, daysInMonth
} from '../utils/date-utils';

export const COLUMN_WIDTHS: Record<ZoomLevel, number> = {
  day: 56,
  week: 140,
  month: 160,
};

const LS_KEY = 'nao_work_orders_v1';

@Injectable({ providedIn: 'root' })
export class TimelineService {

  readonly workCenters = signal<WorkCenterDocument[]>(SAMPLE_WORK_CENTERS);
  readonly workOrders  = signal<WorkOrderDocument[]>(this._loadOrders());
  readonly zoom        = signal<ZoomLevel>('day');
  readonly panelMode   = signal<PanelMode | null>(null);
  readonly anchorDate  = signal<Date>(this._defaultAnchor('day'));

  readonly segments = computed<TimelineSegment[]>(() =>
    this._buildSegments(this.anchorDate(), this.zoom())
  );

  readonly timelineWidth = computed<number>(() =>
    this.segments().reduce((sum, s) => sum + s.width, 0)
  );

  // ── Panel ──────────────────────────────────────────────
  openCreatePanel(workCenterId: string, clickedDate: string): void {
    this.panelMode.set({ type: 'create', workCenterId, clickedDate });
  }
  openEditPanel(workOrder: WorkOrderDocument): void {
    this.panelMode.set({ type: 'edit', workOrder });
  }
  closePanel(): void { this.panelMode.set(null); }

  // ── CRUD ───────────────────────────────────────────────
  createWorkOrder(data: WorkOrderDocument['data']): { success: boolean; error?: string } {
    if (this._detectOverlap(data, null)) {
      return { success: false, error: 'This work order overlaps with an existing order on the same work center.' };
    }
    const newOrder: WorkOrderDocument = { docId: `wo-${Date.now()}`, docType: 'workOrder', data };
    this.workOrders.update(orders => { const u = [...orders, newOrder]; this._persist(u); return u; });
    return { success: true };
  }

  updateWorkOrder(docId: string, data: WorkOrderDocument['data']): { success: boolean; error?: string } {
    if (this._detectOverlap(data, docId)) {
      return { success: false, error: 'This work order overlaps with an existing order on the same work center.' };
    }
    this.workOrders.update(orders => { const u = orders.map(o => o.docId === docId ? { ...o, data } : o); this._persist(u); return u; });
    return { success: true };
  }

  deleteWorkOrder(docId: string): void {
    this.workOrders.update(orders => { const u = orders.filter(o => o.docId !== docId); this._persist(u); return u; });
  }

  // ── Zoom ───────────────────────────────────────────────
  setZoom(z: ZoomLevel): void {
    this.zoom.set(z);
    this.anchorDate.set(this._defaultAnchor(z));
  }

  // ── Bar positioning ────────────────────────────────────
  getBarPosition(order: WorkOrderDocument): BarPosition {
    const z      = this.zoom();
    const colW   = COLUMN_WIDTHS[z];
    const anchor = this.anchorDate();
    const start  = parseISO(order.data.startDate);
    const end    = parseISO(order.data.endDate);
    const totalW = this.timelineWidth();

    let left: number, width: number;

    if (z === 'day') {
      left  = daysBetween(anchor, start) * colW;
      width = (daysBetween(start, end) + 1) * colW;
    } else if (z === 'week') {
      left  = (daysBetween(anchor, start) / 7) * colW;
      width = ((daysBetween(start, end) + 1) / 7) * colW;
    } else {
      left  = this._monthOffset(anchor, start);
      const endOff = this._monthOffset(anchor, end);
      const dm = daysInMonth(end.getFullYear(), end.getMonth());
      width = endOff - left + (COLUMN_WIDTHS['month'] / dm);
    }

    return { left, width: Math.max(width, 30), visible: left + width > 0 && left < totalW };
  }

  xToDate(x: number): string {
    const z      = this.zoom();
    const colW   = COLUMN_WIDTHS[z];
    const anchor = this.anchorDate();

    if (z === 'day')  return formatISO(addDays(anchor, Math.floor(x / colW)));
    if (z === 'week') return formatISO(addDays(anchor, Math.floor(x / colW) * 7));

    let cumulative = 0;
    for (const seg of this.segments()) {
      if (x < cumulative + seg.width) {
        const frac = (x - cumulative) / seg.width;
        const dm   = daysInMonth(seg.date.getFullYear(), seg.date.getMonth());
        return formatISO(new Date(seg.date.getFullYear(), seg.date.getMonth(), 1 + Math.floor(frac * dm)));
      }
      cumulative += seg.width;
    }
    return formatISO(anchor);
  }

  // ── Private ────────────────────────────────────────────
  private _defaultAnchor(z: ZoomLevel): Date {
    const today = startOfDay(new Date());
    if (z === 'day')   return addDays(today, -14);
    if (z === 'week')  return addDays(today, -56);
    return startOfMonth(addDays(today, -180));
  }

  private _buildSegments(anchor: Date, zoom: ZoomLevel): TimelineSegment[] {
    const now   = new Date();
    const today = startOfDay(now);
    const colW  = COLUMN_WIDTHS[zoom];
    const count = zoom === 'day' ? 90 : zoom === 'week' ? 26 : 18;
    const result: TimelineSegment[] = [];
    let cumLeft = 0;

    // For day view: only the FIRST day of the current month gets the pill
    // We track which month already got the pill to avoid repeats
    const monthsWithPill = new Set<string>();

    for (let i = 0; i < count; i++) {
      let date: Date, label: string, width = colW;
      let isCurrentMonth = false;

      if (zoom === 'day') {
        date = addDays(anchor, i);
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // Only mark isCurrentMonth on the FIRST day of the current month
        // that we encounter — prevents repeated "Current month" pills
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const isCurMon = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        if (isCurMon && !monthsWithPill.has(monthKey)) {
          isCurrentMonth = true;
          monthsWithPill.add(monthKey);
        }

      } else if (zoom === 'week') {
        date = addDays(anchor, i * 7);
        const wEnd = addDays(date, 6);
        label = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${wEnd.toLocaleDateString('en-US', { day: 'numeric' })}`;

        // Show pill only on the week that contains the 1st of the current month
        const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const weekEnd = addDays(date, 6);
        if (firstOfMonth >= date && firstOfMonth <= weekEnd && !monthsWithPill.has(monthKey)) {
          isCurrentMonth = true;
          monthsWithPill.add(monthKey);
        }

      } else {
        // Month view: one column = one month, pill on current month column
        date  = new Date(anchor.getFullYear(), anchor.getMonth() + i, 1);
        label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        width = Math.round(daysInMonth(date.getFullYear(), date.getMonth()) * (colW / 30));
        isCurrentMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }

      const isToday = zoom === 'day' && date.toDateString() === today.toDateString();
      result.push({ label, date, isToday, isCurrentMonth, width, left: cumLeft });
      cumLeft += width;
    }
    return result;
  }

  private _monthOffset(anchor: Date, target: Date): number {
    let cumulative = 0;
    for (const seg of this.segments()) {
      const segEnd = endOfMonth(seg.date);
      if (target >= seg.date && target <= segEnd) {
        const dm = daysInMonth(seg.date.getFullYear(), seg.date.getMonth());
        return cumulative + ((target.getDate() - 1) / dm) * seg.width;
      }
      cumulative += seg.width;
    }
    return cumulative;
  }

  private _detectOverlap(data: WorkOrderDocument['data'], excludeDocId: string | null): boolean {
    const newStart = parseISO(data.startDate);
    const newEnd   = parseISO(data.endDate);
    return this.workOrders().some(order => {
      if (order.docId === excludeDocId) return false;
      if (order.data.workCenterId !== data.workCenterId) return false;
      return rangesOverlap(newStart, newEnd, parseISO(order.data.startDate), parseISO(order.data.endDate));
    });
  }

  private _persist(orders: WorkOrderDocument[]): void {
    try { localStorage.setItem(LS_KEY, JSON.stringify(orders)); } catch { /**/ }
  }

  private _loadOrders(): WorkOrderDocument[] {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw) as WorkOrderDocument[];
    } catch { /**/ }
    return SAMPLE_WORK_ORDERS;
  }
}