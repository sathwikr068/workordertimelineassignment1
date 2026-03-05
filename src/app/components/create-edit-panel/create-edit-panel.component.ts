import {
  Component, ChangeDetectionStrategy, inject, OnInit,
  signal, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup,
  Validators, AbstractControl, ValidationErrors
} from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { TimelineService } from '../../services/timeline.service';
import { WorkOrderStatus } from '../../models/work-order.model';
import { parseISO, formatISO, addDays } from '../../utils/date-utils';

interface StatusOption { value: WorkOrderStatus; label: string; }

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'open',        label: 'Open'        },
  { value: 'in-progress', label: 'In progress' },
  { value: 'complete',    label: 'Complete'    },
  { value: 'blocked',     label: 'Blocked'     },
];

/** Parse MM.DD.YYYY → ISO "YYYY-MM-DD", returns null if invalid */
function parseMDY(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;
  const [, m, d, y] = match.map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return formatISO(date);
}

/** ISO "YYYY-MM-DD" → MM.DD.YYYY display string */
function isoToMDY(iso: string): string {
  const d = parseISO(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = d.getFullYear();
  return `${mm}.${dd}.${yy}`;
}

/** Auto-insert dots as user types: turn "12302025" → "12.30.2025" */
function autoFormatDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0,2)}.${digits.slice(2)}`;
  return `${digits.slice(0,2)}.${digits.slice(2,4)}.${digits.slice(4)}`;
}

/** Validator: string must be parseable as MM.DD.YYYY */
function dateStringValidator(ctrl: AbstractControl): ValidationErrors | null {
  const v = ctrl.value as string;
  if (!v) return { required: true };
  return parseMDY(v) ? null : { invalidDate: true };
}

/** Group validator: start must be <= end */
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = parseMDY(group.get('startDate')?.value ?? '');
  const end   = parseMDY(group.get('endDate')?.value ?? '');
  if (!start || !end) return null;
  return start > end ? { endBeforeStart: true } : null;
}

@Component({
  selector: 'app-create-edit-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule],
  templateUrl: './create-edit-panel.component.html',
  styleUrls: ['./create-edit-panel.component.scss'],
})
export class CreateEditPanelComponent implements OnInit {
  readonly svc        = inject(TimelineService);
  private readonly fb = inject(FormBuilder);

  readonly statusOptions = STATUS_OPTIONS;
  readonly error         = signal<string | null>(null);
  readonly submitted     = signal(false);

  form!: FormGroup;

  get mode()         { return this.svc.panelMode(); }
  get isEdit()       { return this.mode?.type === 'edit'; }
  get submitLabel()  { return this.isEdit ? 'Save' : 'Create'; }

  ngOnInit(): void {
    this._buildForm();
    this._populate();
  }

  private _buildForm(): void {
    this.form = this.fb.group(
      {
        name:      ['', [Validators.required, Validators.minLength(2)]],
        status:    ['open', Validators.required],
        endDate:   ['', [Validators.required, dateStringValidator]],
        startDate: ['', [Validators.required, dateStringValidator]],
      },
      { validators: dateRangeValidator }
    );
  }

  private _populate(): void {
    const mode = this.mode;
    if (!mode) return;

    if (mode.type === 'create') {
      const startIso = mode.clickedDate ?? formatISO(new Date());
      const endIso   = formatISO(addDays(parseISO(startIso), 7));
      this.form.patchValue({ name: '', status: 'open', startDate: isoToMDY(startIso), endDate: isoToMDY(endIso) });
    } else if (mode.type === 'edit' && mode.workOrder) {
      const d = mode.workOrder.data;
      this.form.patchValue({ name: d.name, status: d.status, startDate: isoToMDY(d.startDate), endDate: isoToMDY(d.endDate) });
    }
  }

  /** Auto-format date fields as user types */
  onDateInput(field: 'startDate' | 'endDate', event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = autoFormatDate(input.value);
    this.form.get(field)?.setValue(formatted, { emitEvent: false });
    input.value = formatted;
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) return;

    const v    = this.form.value;
    const mode = this.mode;
    if (!mode) return;

    const startIso = parseMDY(v.startDate)!;
    const endIso   = parseMDY(v.endDate)!;

    const workCenterId = mode.type === 'create'
      ? mode.workCenterId!
      : mode.workOrder!.data.workCenterId;

    const data = {
      name:          (v.name as string).trim(),
      workCenterId,
      status:        v.status as WorkOrderStatus,
      startDate:     startIso,
      endDate:       endIso,
    };

    const result = mode.type === 'create'
      ? this.svc.createWorkOrder(data)
      : this.svc.updateWorkOrder(mode.workOrder!.docId, data);

    if (result.success) {
      this.svc.closePanel();
    } else {
      this.error.set(result.error ?? 'An error occurred.');
    }
  }

  onCancel(): void { this.svc.closePanel(); }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('panel-backdrop')) {
      this.svc.closePanel();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.svc.closePanel(); }

  hasFieldError(field: string): boolean {
    const c = this.form.get(field);
    return !!(this.submitted() && c?.invalid);
  }
}
