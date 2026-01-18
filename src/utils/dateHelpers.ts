import {
  formatDistanceToNow,
  format,
  isToday,
  isYesterday,
  isThisWeek,
} from "date-fns";

/**
 * Format a date as relative time (e.g., "5 minutes ago")
 */
export const formatTimeAgo = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
};

/**
 * Format a date as a readable date string (e.g., "Dec 27, 2025")
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "MMM d, yyyy");
};

/**
 * Format a date as a readable date and time string (e.g., "Dec 27, 2025 at 2:30 PM")
 */
export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "MMM d, yyyy 'at' h:mm a");
};

/**
 * Format a date as time only (e.g., "2:30 PM")
 */
export const formatTime = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "h:mm a");
};

/**
 * Get a smart date label (Today, Yesterday, or date)
 */
export const getSmartDateLabel = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isToday(dateObj)) {
    return "Today";
  }
  if (isYesterday(dateObj)) {
    return "Yesterday";
  }
  if (isThisWeek(dateObj)) {
    return format(dateObj, "EEEE"); // Day name
  }
  return formatDate(dateObj);
};
