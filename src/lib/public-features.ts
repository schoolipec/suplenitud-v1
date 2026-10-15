/** Set PRAYER_REQUESTS_PUBLIC_ENABLED=false only for an explicit emergency pause. */
export const publicPrayerRequestsEnabled = process.env.PRAYER_REQUESTS_PUBLIC_ENABLED !== "false";
