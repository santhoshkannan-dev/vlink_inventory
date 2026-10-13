/**
 * Client Date Utility Helpers
 * Ensures consistent local timezone date (YYYY-MM-DD) and time (HH:MM)
 * preventing UTC ISO conversion off-by-one errors.
 */

export const getLocalDateString = (d = new Date()) => {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getLocalTimeString = (d = new Date()) => {
  const date = new Date(d);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Formats a transaction date and time into readable format, e.g., "13 Oct 2026, 10:30 AM".
 * Returns null if no valid date is provided (never returns current date fallback).
 */
export const formatTransactionDateTime = (dateStr, timeStr, fallbackDate) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (dateStr && typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    const [yearStr, monthStr, dayStr] = dateStr.trim().split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const month = months[monthIndex] || monthStr;

    let formattedTime = '12:00 AM';
    if (timeStr && typeof timeStr === 'string') {
      const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = match[2];
        const meridiem = match[3];
        if (meridiem) {
          formattedTime = `${hours}:${minutes} ${meridiem.toUpperCase()}`;
        } else {
          const isPM = hours >= 12;
          const displayH = hours % 12 === 0 ? 12 : hours % 12;
          formattedTime = `${displayH}:${minutes} ${isPM ? 'PM' : 'AM'}`;
        }
      } else {
        formattedTime = timeStr.trim();
      }
    }

    return `${day} ${month} ${year}, ${formattedTime}`;
  }

  if (fallbackDate) {
    const d = new Date(fallbackDate);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const isPM = hours >= 12;
      const displayH = hours % 12 === 0 ? 12 : hours % 12;
      return `${day} ${month} ${year}, ${displayH}:${minutes} ${isPM ? 'PM' : 'AM'}`;
    }
  }

  return null;
};

