export interface ClassTime {
  name: string;
  start: string;
  end: string;
}

export interface DaySchedule {
  day: number; // 1-7 (周一到周日)
  classes: ClassTime[];
}

export interface ScheduleData {
  schedule: DaySchedule[];
}

export interface NearestEvent {
  name: string;
  type: 'start' | 'end';
  time: number;
  originalTime: number;
}