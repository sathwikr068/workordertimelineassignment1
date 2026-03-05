import {
  Component, Input, ChangeDetectionStrategy, inject,
  signal, HostListener, ElementRef, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkOrderDocument, BarPosition } from '../../models/work-order.model';
import { TimelineService } from '../../services/timeline.service';

@Component({
  selector: 'app-work-order-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './work-order-bar.component.html',
  styleUrls: ['./work-order-bar.component.scss'],
})
export class WorkOrderBarComponent implements OnDestroy {
  @Input({ required: true }) order!: WorkOrderDocument;
  @Input({ required: true }) position!: BarPosition;

  readonly svc      = inject(TimelineService);
  readonly el       = inject(ElementRef<HTMLElement>);
  readonly menuOpen = signal(false);

  // The dropdown DOM node appended to document.body
  private _dropdownEl: HTMLElement | null = null;

  get statusLabel(): string {
    const labels: Record<string, string> = {
      'open': 'Open', 'in-progress': 'In progress',
      'complete': 'Complete', 'blocked': 'Blocked',
    };
    return labels[this.order.data.status] ?? this.order.data.status;
  }

  get tooltipText(): string {
    return `${this.order.data.name}\n${this.statusLabel}\n${this.order.data.startDate} → ${this.order.data.endDate}`;
  }

  toggleMenu(e: MouseEvent): void {
    e.stopPropagation();
    if (this.menuOpen()) {
      this._destroyDropdown();
      this.menuOpen.set(false);
    } else {
      this.menuOpen.set(true);
      // Defer so the host element is visible/measured first
      setTimeout(() => this._createDropdown(), 0);
    }
  }

  private _createDropdown(): void {
    this._destroyDropdown();

    const btn = this.el.nativeElement.querySelector('.wo-menu-btn') as HTMLElement;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();

    const div = document.createElement('div');
    div.className = 'nao-body-dropdown';
    div.innerHTML = `
      <button class="nao-dd-item" data-action="edit">Edit</button>
      <button class="nao-dd-item nao-dd-danger" data-action="delete">Delete</button>
    `;

    // Position below the button
    div.style.cssText = `
      position: fixed;
      top: ${rect.bottom + 6}px;
      left: ${rect.right - 120}px;
      background: #fff;
      border: 1px solid #e2e4e9;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 999999;
      min-width: 120px;
      overflow: hidden;
      animation: naoDropIn 0.1s ease;
    `;

    // Inject keyframes once
    if (!document.getElementById('nao-dd-styles')) {
      const style = document.createElement('style');
      style.id = 'nao-dd-styles';
      style.textContent = `
        @keyframes naoDropIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .nao-dd-item {
          display: block; width: 100%; padding: 10px 16px;
          border: none; background: none;
          font-size: 13.5px; font-weight: 400;
          color: #374151; cursor: pointer; text-align: left;
          font-family: "Circular-Std", sans-serif;
          transition: background 0.1s;
          box-sizing: border-box;
        }
        .nao-dd-item:hover { background: #f9fafb; }
        .nao-dd-danger { color: #dc2626 !important; }
        .nao-dd-danger:hover { background: #fef2f2 !important; }
      `;
      document.head.appendChild(style);
    }

    div.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const action = (ev.target as HTMLElement).closest('[data-action]')?.getAttribute('data-action');
      if (action === 'edit') {
        this.svc.openEditPanel(this.order);
      } else if (action === 'delete') {
        this.svc.deleteWorkOrder(this.order.docId);
      }
      this._destroyDropdown();
      this.menuOpen.set(false);
    });

    document.body.appendChild(div);
    this._dropdownEl = div;
  }

  private _destroyDropdown(): void {
    if (this._dropdownEl) {
      this._dropdownEl.remove();
      this._dropdownEl = null;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (!this.el.nativeElement.contains(e.target as Node)) {
      this._destroyDropdown();
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:scroll', ['$event'])
  onDocumentScroll(): void {
    if (this._dropdownEl) {
      // Reposition on scroll
      const btn = this.el.nativeElement.querySelector('.wo-menu-btn') as HTMLElement;
      if (btn) {
        const rect = btn.getBoundingClientRect();
        this._dropdownEl.style.top  = `${rect.bottom + 6}px`;
        this._dropdownEl.style.left = `${rect.right - 120}px`;
      }
    }
  }

  ngOnDestroy(): void {
    this._destroyDropdown();
  }
}