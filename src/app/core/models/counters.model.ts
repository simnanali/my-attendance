export type EntityIdType = 'user' | 'attendanceDay' | 'session' | 'holiday';

export interface Counters {
  nextUserId: number;
  nextAttendanceDayId: number;
  nextSessionId: number;
  nextHolidayId: number;
}