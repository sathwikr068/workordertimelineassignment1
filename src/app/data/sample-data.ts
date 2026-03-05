import { WorkCenterDocument } from '../models/work-center.model';
import { WorkOrderDocument } from '../models/work-order.model';
import { addDays, formatISO } from '../utils/date-utils';

// All dates are relative to TODAY so the timeline always looks current
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function d(offsetDays: number): string {
  return formatISO(addDays(TODAY, offsetDays));
}

export const SAMPLE_WORK_CENTERS: WorkCenterDocument[] = [
  { docId: 'wc-1', docType: 'workCenter', data: { name: 'Extrusion Line A' } },
  { docId: 'wc-2', docType: 'workCenter', data: { name: 'CNC Machine 1' } },
  { docId: 'wc-3', docType: 'workCenter', data: { name: 'Assembly Station' } },
  { docId: 'wc-4', docType: 'workCenter', data: { name: 'Quality Control' } },
  { docId: 'wc-5', docType: 'workCenter', data: { name: 'Packaging Line' } },
];

export const SAMPLE_WORK_ORDERS: WorkOrderDocument[] = [
  // Extrusion Line A — 3 non-overlapping orders
  {
    docId: 'wo-1', docType: 'workOrder',
    data: { name: 'EXT-Batch-001', workCenterId: 'wc-1', status: 'complete', startDate: d(-14), endDate: d(-9) }
  },
  {
    docId: 'wo-2', docType: 'workOrder',
    data: { name: 'EXT-Batch-002', workCenterId: 'wc-1', status: 'in-progress', startDate: d(-3), endDate: d(4) }
  },
  {
    docId: 'wo-3', docType: 'workOrder',
    data: { name: 'EXT-Batch-003', workCenterId: 'wc-1', status: 'open', startDate: d(7), endDate: d(14) }
  },
  // CNC Machine 1 — 2 non-overlapping orders
  {
    docId: 'wo-4', docType: 'workOrder',
    data: { name: 'CNC-Run-Alpha', workCenterId: 'wc-2', status: 'in-progress', startDate: d(-5), endDate: d(2) }
  },
  {
    docId: 'wo-5', docType: 'workOrder',
    data: { name: 'CNC-Run-Beta', workCenterId: 'wc-2', status: 'open', startDate: d(5), endDate: d(12) }
  },
  // Assembly Station
  {
    docId: 'wo-6', docType: 'workOrder',
    data: { name: 'ASSY-Phase-1', workCenterId: 'wc-3', status: 'blocked', startDate: d(-7), endDate: d(1) }
  },
  // Quality Control
  {
    docId: 'wo-7', docType: 'workOrder',
    data: { name: 'QC-Inspection-A', workCenterId: 'wc-4', status: 'complete', startDate: d(-10), endDate: d(-6) }
  },
  // Packaging Line
  {
    docId: 'wo-8', docType: 'workOrder',
    data: { name: 'PKG-Run-Final', workCenterId: 'wc-5', status: 'open', startDate: d(2), endDate: d(9) }
  },
];
