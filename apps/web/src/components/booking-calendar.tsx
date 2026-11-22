"use client";

// Cal.com's inline booker (cal.com/rjrjensen), synced with Ryan's calendar. It renders in an iframe, so it's styled
// through Cal's UI config: it follows the visitor's light/dark setting like the rest of the site, in the site's accent.
// Clicks inside the iframe can't be seen by the analytics click listener, so a finished booking is reported with a
// cal:booked event instead (README.md → Analytics).
import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

const NAMESPACE = "contact";
const CAL_LINK = "rjrjensen";

export function BookingCalendar() {
  useEffect(() => {
    let cancelled = false;
    getCalApi({ namespace: NAMESPACE }).then((cal) => {
      if (cancelled) return;
      cal("ui", {
        theme: "auto",
        hideEventTypeDetails: false,
        layout: "month_view",
        // Same values as --accent / --accent-ink in globals.css.
        cssVarsPerTheme: {
          light: { "cal-brand": "#0d5a61", "cal-brand-text": "#ffffff" },
          dark: { "cal-brand": "#63d2c8", "cal-brand-text": "#062a2d" },
        },
      });
      cal("on", {
        action: "bookingSuccessfulV2",
        // No booking details: Cal's title includes the visitor's name.
        callback: () => document.dispatchEvent(new CustomEvent("cal:booked")),
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Cal
      namespace={NAMESPACE}
      calLink={CAL_LINK}
      config={{ layout: "month_view", theme: "auto" }}
      className="min-h-[640px] w-full overflow-auto"
    />
  );
}
