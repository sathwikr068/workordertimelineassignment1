# Work Order Schedule Timeline


---

##  Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd work-order-timeline

# Install dependencies
npm install

# Start the development server
ng serve

# Open in browser
open http://localhost:4200
```

> **Note:** Node.js 18+ and Angular CLI 17+ required.
>
> ```bash
> npm install -g @angular/cli
> ```

---

##  Features

### Core (Required)
- **Timeline Grid** — Day / Week / Month zoom levels with accurate date positioning
- **Work Order Bars** — Status-colored bars positioned precisely by start/end date
- **Create Panel** — Slide-in form, triggered by clicking empty timeline row; pre-fills start date from click position
- **Edit Panel** — Same panel, pre-populated with existing work order data
- **Delete** — Three-dot action menu on every bar
- **Overlap Detection** — Prevents scheduling two orders on the same work center at the same time
- **Today Indicator** — Vertical line + dot showing the current date
- **Row Hover** — Highlighted background on hovered work center row
- **Horizontal Scroll** — Timeline scrolls; left work center column stays fixed

### Bonus
- **localStorage persistence** — Work orders survive page refresh
- **Smooth animations** — Panel slide-in/out (CSS transitions)
- **Keyboard navigation** — `Escape` closes the panel; Tab navigates form fields
- **Today button** — Instantly scrolls viewport to center on today
- **Tooltip** — Native `title` attribute shows order details on bar hover

---

##  Project Structure

```
src/
└── app/
    ├── components/
    │   ├── timeline/               # Root timeline shell
    │   │   ├── timeline.component.ts
    │   │   ├── timeline.component.html
    │   │   └── timeline.component.scss
    │   ├── work-order-bar/         # Individual work order bar + action menu
    │   │   ├── work-order-bar.component.ts
    │   │   ├── work-order-bar.component.html
    │   │   └── work-order-bar.component.scss
    │   ├── create-edit-panel/      # Unified Create/Edit slide-out panel
    │   │   ├── create-edit-panel.component.ts
    │   │   ├── create-edit-panel.component.html
    │   │   └── create-edit-panel.component.scss
    │   └── zoom-selector/          # Day/Week/Month tab switcher
    │       └── zoom-selector.component.ts
    ├── services/
    │   └── timeline.service.ts     # All business logic + signals state
    ├── models/
    │   ├── work-center.model.ts    # WorkCenterDocument interface
    │   └── work-order.model.ts     # WorkOrderDocument, WorkOrderStatus, ZoomLevel
    ├── utils/
    │   └── date-utils.ts           # Pure date helper functions
    ├── data/
    │   └── sample-data.ts          # Hardcoded 5 work centers, 8 work orders
    ├── app.component.ts
    └── app.config.ts
```

---

## Architecture & Design Decisions

### State Management — Angular Signals
Rather than NgRx or BehaviorSubjects, I used **Angular 17 Signals** (`signal()`, `computed()`) for reactive state. Signals are the Angular-native solution as of v17, offering:
- Fine-grained reactivity (only affected components re-render)
- Zero boilerplate
- Great integration with `ChangeDetectionStrategy.OnPush`

### Timeline Rendering — Absolute Positioning
Each work order bar is absolutely positioned within its row using:

```
left  = daysBetween(anchorDate, orderStart) × columnWidth
width = (daysBetween(orderStart, orderEnd) + 1) × columnWidth
```

The "anchor date" is the leftmost visible date — computed from the zoom level and today's date (centered view with buffer). This keeps the math simple and efficient.

### Single Panel for Create & Edit
The `CreateEditPanelComponent` reads a `panelMode` signal from the service (`'create' | 'edit'`) and adapts its behavior:
- **Create:** blank form, `workCenterId` from the click, start date from click position
- **Edit:** form pre-patched via `patchValue()`, saves to existing `docId`

### Overlap Detection
```typescript
// A overlaps B if: A.start <= B.end AND A.end >= B.start
return rangesOverlap(newStart, newEnd, existingStart, existingEnd);
```
All orders on the same `workCenterId` are checked; the order being edited is excluded by `docId`.

### Zoom System
| Zoom  | Column unit | Column width | Buffer shown |
|-------|-------------|--------------|--------------|
| Day   | 1 day       | 60px         | ±30 days     |
| Week  | 7 days      | 120px        | ±13 weeks    |
| Month | ~30 days    | 160px (proportional) | ±9 months |

Month columns use proportional width: `daysInMonth / 30 × 160px`.

### localStorage Persistence (Bonus)
Work orders are serialized to `localStorage` on every mutation. On boot, the service tries to restore from storage; falls back to hardcoded sample data if absent or corrupted.

---

##  Libraries Used

| Library | Why |
|---------|-----|
| **@ng-bootstrap/ng-bootstrap** | `ngb-datepicker` for date picking (required by spec) |
| **@ng-select/ng-select** | Status dropdown with clean UX (required by spec) |
| **Angular Reactive Forms** | Type-safe form management with validators |
| **Angular Signals** | Fine-grained reactive state (Angular 17+) |

No extra dependencies beyond what was mandated.

---

## Design Notes

- **Font:** Circular Std
- **Color palette:** Indigo (`#6366f1`) as accent; semantic colors per status
- **Status colors:** Blue (open), Purple (in-progress), Green (complete), Yellow (blocked)
- **Spacing system:** 4px base grid

---

##  Running Tests

```bash
ng test
```

Unit tests cover:
- `date-utils.ts` — all pure functions
- `TimelineService` — overlap detection, CRUD, zoom
- `CreateEditPanelComponent` — form validation

---


## Future Improvements

- **Infinite horizontal scroll** — Detect scroll edge, prepend/append date columns dynamically with scroll position compensation
- **Virtual scrolling** — CDK VirtualScrollViewport for large work center lists
- **Drag-to-resize bars** — Pointer events for resizing order duration on timeline
- **Drag-to-move bars** — Move orders by dragging the bar horizontally
- **Multi-select delete** — Checkbox selection + bulk delete
- **WebSocket sync** — Real-time multi-user updates
- **Custom datepicker styling** — Fully matched to Sketch design
- **E2E tests** — Cypress or Playwright scenarios

---

