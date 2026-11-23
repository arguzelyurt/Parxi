import type { PlannedNotification } from '../core/notifyPlan';
export async function notificationsGranted(): Promise<boolean> {
  return false;
}
export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}
export async function reschedule(_plan: PlannedNotification[]): Promise<void> {}
