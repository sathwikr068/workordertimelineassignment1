# AI Prompts Used During Development

This document captures the key AI-assisted decisions made during the implementation of the Work Order Schedule Timeline.

---

## 1. Architecture Planning

**Prompt:**
> "I'm building an Angular 17 timeline component for a manufacturing ERP. The timeline shows work orders as horizontal bars across work center rows. What's the best state management approach — NgRx, Services with BehaviorSubjects, or Angular Signals?"

**Decision:** Angular Signals + Service pattern (no NgRx). Rationale: Signals are Angular-native in v17, reduce boilerplate, and integrate perfectly with OnPush components. For a single-page feature component without deep routing, NgRx is overkill.

---

## 2. Timeline Pixel Positioning Math

**Prompt:**
> "Given an anchor date (leftmost visible date), a column width in pixels, and a work order's start/end ISO dates, how do I calculate the left offset and width of a bar in pixels? Show me the formula for day, week, and month zoom levels."

**Key insight from response:**
```typescript
// Day zoom:
left  = daysBetween(anchor, orderStart) * COL_WIDTH_PX
width = (daysBetween(orderStart, orderEnd) + 1) * COL_WIDTH_PX

// Month zoom requires proportional calculation:
// Find which month column the date falls in, then
// offset = (dayOfMonth - 1) / daysInMonth * columnWidth
```

The `+1` on width is critical — an order starting and ending on the same day should still have non-zero width.

---

## 3. Overlap Detection Algorithm

**Prompt:**
> "What's the most concise algorithm to check if two date ranges overlap? The ranges are inclusive on both ends."

**Answer:**
```typescript
// Two ranges [A_start, A_end] and [B_start, B_end] overlap if:
A_start <= B_end  AND  A_end >= B_start
```

This handles all cases: complete overlap, partial overlap from left, partial overlap from right, and one range containing the other.

---

## 4. Angular Reactive Forms with Cross-Field Validation

**Prompt:**
> "In Angular Reactive Forms, how do I add a cross-field validator that checks if endDate >= startDate, where both fields hold NgbDateStruct values?"

**Decision:** Group-level validator function passed to `FormGroup` options:
```typescript
this.fb.group({ ... }, { validators: dateRangeValidator })
```
This cleanly separates field-level required validation from the cross-field business rule.

---

## 5. Fixed Left Column + Horizontal Scroll

**Prompt:**
> "CSS layout problem: I have a table-like structure with a fixed left column showing names, and a horizontally scrollable right panel showing a timeline. The left column must NOT scroll horizontally but should vertically sync with the right. Best approach?"

**Decision:** CSS Flexbox layout:
- Parent: `display: flex`
- Left panel: `flex-shrink: 0; width: 200px; overflow: hidden`
- Right panel: `flex: 1; overflow-x: auto`

Row heights are fixed (`72px`), ensuring vertical alignment without JavaScript.

---

## 6. SCSS Design System

**Prompt:**
> "Design SCSS variables for a professional ERP timeline UI. Colors for status badges: Open (blue), In Progress (purple), Complete (green), Blocked (yellow/amber). The overall palette should be clean and enterprise-grade with an indigo accent."

**Decision:**
- Accent: `#6366f1` (Tailwind indigo-500) — modern, professional
- Open: `#dbeafe` bg / `#1d4ed8` text (blue tones)
- In Progress: `#ede9fe` bg / `#5b21b6` text (purple tones)
- Complete: `#dcfce7` bg / `#15803d` text (green tones)
- Blocked: `#fef9c3` bg / `#92400e` text (amber tones)

---

## 7. Panel Slide-In Animation

**Prompt:**
> "What's the most performant CSS animation for a panel sliding in from the right? Should I use `transform: translateX` or `right` positioning?"

**Decision:** `transform: translateX` — GPU-accelerated, doesn't trigger layout. Combined with `animation: slideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)` for a Material-style ease.

---

## 8. localStorage Persistence Strategy

**Prompt:**
> "What's the safest pattern for persisting Angular service data to localStorage? What should I handle defensively?"

**Patterns used:**
- Wrap in `try/catch` — localStorage can throw on quota exceeded or in private mode
- Only persist work orders (not work centers — they're static reference data)
- Validate schema on load — if parse fails, fall back to sample data
- Persist on every mutation, not on a timer (simple, correct)

---

## 9. OnPush Change Detection Strategy

**Prompt:**
> "Which Angular components in this timeline should use OnPush change detection, and which should not?"

**Decision:** All components use `OnPush`. With Signals, Angular automatically schedules re-renders when signals change — OnPush is safe for all components in this architecture.

---

## 10. Sample Data Design

**Prompt:**
> "Generate realistic manufacturing work order names and work center names for a sample dataset. Need 5 work centers and 8+ work orders with all 4 statuses represented and some work centers having multiple orders."

**Work Centers:** Extrusion Line A, CNC Machine 1, Assembly Station, Quality Control, Packaging Line

**Work Orders:** Named with center prefix + sequential ID (EXT-Batch-001, CNC-Run-Alpha, etc.) — realistic naming convention for shop floor management systems.

---

## Trade-offs Documented

| Decision | Alternative | Why I Chose My Approach |
|----------|-------------|------------------------|
| Angular Signals | NgRx / BehaviorSubjects | Less boilerplate, Angular-native, no extra dependency |
| Absolute positioning for bars | CSS Grid | More control over pixel-perfect positioning with dynamic widths |
| Single panel component for create + edit | Separate components | DRY principle — same form fields, same validation |
| Fixed column count per zoom | Infinite scroll (bonus) | Simpler baseline; infinite scroll noted as @upgrade |
| localStorage on every save | IndexedDB | Simplicity; work order data is small |
