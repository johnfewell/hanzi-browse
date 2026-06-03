/**
 * License Manager (Extension)
 *
 * BYOM mode is free and unlimited — no license enforcement.
 *
 * Kept for backwards compatibility (service-worker.js imports it).
 */

export async function checkAndIncrementUsage() {
  return { allowed: true, remaining: null, message: 'Free — unlimited tasks' };
}

export async function getLicenseStatus() {
  return {
    isPro: true,
    key: null,
    tasksUsed: 0,
    taskLimit: null,
    message: 'Free — unlimited tasks',
  };
}

export async function activateLicense(_key) {
  return { success: true, message: 'License system removed. BYOM is free.' };
}

export async function deactivateLicense() {
  return { success: true, message: 'No license to deactivate.' };
}
