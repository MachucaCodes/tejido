// Admin pages are rendered on the server (UTC), so a bare toLocaleString()
// shows server time. Pin every admin time to the community's zone and label
// it, so "3 AM" means 3 AM where the people are.
export const COMMUNITY_TIME_ZONE = "America/Costa_Rica";

const dateTime = new Intl.DateTimeFormat("en-US", {
  timeZone: COMMUNITY_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

const timeOnly = new Intl.DateTimeFormat("en-US", {
  timeZone: COMMUNITY_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  timeZoneName: "short",
});

/** e.g. "Nov 11, 2026, 8:14 PM CST" in the community's zone. */
export function formatDateTime(at: string | Date): string {
  return dateTime.format(new Date(at));
}

/** e.g. "8:14:46 PM CST" in the community's zone. */
export function formatTime(at: string | Date): string {
  return timeOnly.format(new Date(at));
}
