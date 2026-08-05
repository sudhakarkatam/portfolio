import { useState, useEffect } from "react";

/**
 * Live IST clock hook — returns a formatted time string
 * that updates every second. Shared between Hero and Contact.
 */
export function useISTClock(format: "12h" | "24h" = "12h") {
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        hour: format === "24h" ? "2-digit" : "numeric",
        minute: "2-digit",
        ...(format === "24h" && { second: "2-digit" }),
        hour12: format === "12h",
      });
      setTimeStr(formatter.format(now));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [format]);

  return timeStr;
}
