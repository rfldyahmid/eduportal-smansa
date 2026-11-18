import type { ScheduleItem } from '../types';

export interface ActiveScheduleNotification {
  key: string;
  schedule: ScheduleItem;
}

const DAYS_BY_NUMBER: Record<number, ScheduleItem['day']> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu'
};

const toMinutes = (value: string) => {
  const match = value.match(/^(\d{1,2})[.:](\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

export function getActiveScheduleNotifications(
  schedules: ScheduleItem[],
  now: Date = new Date()
): ActiveScheduleNotification[] {
  const currentDay = DAYS_BY_NUMBER[now.getDay()];
  if (!currentDay) return [];

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');

  return schedules.flatMap(schedule => {
    if (schedule.day !== currentDay) return [];
    const start = toMinutes(schedule.startTime);
    const end = toMinutes(schedule.endTime);
    if (start === null || end === null || currentMinutes < start || currentMinutes >= end) return [];

    const version = JSON.stringify({
      day: schedule.day,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      subject: schedule.subject,
      classId: schedule.classId,
      updatedAt: schedule.updatedAt || ''
    });
    return [{ key: `active-schedule:${schedule.id}:${date}:${version}`, schedule }];
  });
}
