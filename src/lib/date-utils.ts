/**
 * Utility functions for consistent date formatting across server and client
 * to prevent hydration mismatches
 */

/**
 * Format date consistently across server and client using UTC
 * @param date - Date string or Date object
 * @returns Formatted date string (MM/DD/YYYY, HH:MM AM/PM)
 */
export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  
  // Use explicit formatting to avoid locale/timezone issues
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const hoursStr = String(hours).padStart(2, '0');
  
  return `${month}/${day}/${year}, ${hoursStr}:${minutes} ${ampm}`;
}

/**
 * Format date only (no time) consistently across server and client
 * @param date - Date string or Date object
 * @returns Formatted date string (MM/DD/YYYY)
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${month}/${day}/${year}`;
}

/**
 * Format time only (no date) consistently across server and client
 * @param date - Date string or Date object
 * @returns Formatted time string (HH:MM AM/PM)
 */
export function formatTime(date: string | Date): string {
  const d = new Date(date);
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const hoursStr = String(hours).padStart(2, '0');
  
  return `${hoursStr}:${minutes} ${ampm}`;
}
