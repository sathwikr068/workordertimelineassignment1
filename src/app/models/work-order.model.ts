export type WorkOrderStatus = 'open' | 'in-progress' | 'complete' | 'blocked';

export interface WorkOrderDocument {
  docId: string;
  docType: 'workOrder';
  data: {
    name: string;
    workCenterId: string;
    status: WorkOrderStatus;
    startDate: string;
    endDate: string;
  };
}

export type ZoomLevel = 'day' | 'week' | 'month';

export interface PanelMode {
  type: 'create' | 'edit';
  workCenterId?: string;
  clickedDate?: string;
  workOrder?: WorkOrderDocument;
}

export interface TimelineSegment {
  label: string;
  date: Date;
  isToday: boolean;
  isCurrentMonth: boolean;
  width: number;
  left: number;
}

export interface BarPosition {
  left: number;
  width: number;
  visible: boolean;
}
