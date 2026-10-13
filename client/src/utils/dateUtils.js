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
