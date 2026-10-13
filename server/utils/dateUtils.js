/**
 * Date utility helpers for consistent timezone and date-string handling.
 * Avoids UTC ISO string drift by formatting local date/time in YYYY-MM-DD and HH:MM.
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

/**
 * Calculates a comparable numeric millisecond timestamp for a transaction
 * combining its date string, time string, and createdAt/transactionDate.
 */
export const getTransactionTimestamp = (t) => {
  if (!t) return 0;
  let baseTs = 0;

  if (t.date && typeof t.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.date.trim())) {
    const [y, m, d] = t.date.trim().split('-').map(Number);
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    if (t.time && typeof t.time === 'string') {
      const match = t.time.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        if (match[3]) seconds = parseInt(match[3], 10);
        const meridiem = match[4];
        if (meridiem) {
          if (meridiem.toUpperCase() === 'PM' && hours < 12) hours += 12;
          if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;
        }
      }
    }
    const dObj = new Date(y, m - 1, d, hours, minutes, seconds);
    if (!isNaN(dObj.getTime())) {
      baseTs = dObj.getTime();
    }
  } else if (t.transactionDate) {
    const ts = new Date(t.transactionDate).getTime();
    if (!isNaN(ts)) baseTs = ts;
  } else if (t.createdAt) {
    const ts = new Date(t.createdAt).getTime();
    if (!isNaN(ts)) baseTs = ts;
  }

  // Fractional tie-breaker from createdAt milliseconds or ObjectId timestamp
  let tieBreaker = 0;
  if (t.createdAt) {
    tieBreaker = (new Date(t.createdAt).getTime() % 1000) / 1000;
  } else if (t._id && typeof t._id.getTimestamp === 'function') {
    tieBreaker = (t._id.getTimestamp().getTime() % 1000) / 1000;
  }

  return baseTs + tieBreaker;
};

