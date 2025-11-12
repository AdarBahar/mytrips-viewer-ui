/**
 * Timestamp Utility Functions
 * 
 * All timestamps from API endpoints are in UTC format.
 * These utilities handle conversion to local timezone for display.
 */

/**
 * Format UTC timestamp to local time string
 * @param {string|Date|number} timestamp - UTC timestamp (ISO 8601 string, Date object, or milliseconds)
 * @param {string} timeZone - Timezone (default: user's local timezone)
 * @returns {string} Formatted time string (e.g., "2:30:45 PM")
 */
export const formatUTCToLocalTime = (timestamp, timeZone = null) => {
  if (!timestamp) return '';

  try {
    const date = new Date(timestamp);
    
    // If no timezone specified, use user's local timezone
    if (!timeZone) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    }

    // Convert to specified timezone
    return date.toLocaleString('en-US', {
      timeZone: timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '';
  }
};

/**
 * Format UTC timestamp to local date and time string
 * @param {string|Date|number} timestamp - UTC timestamp
 * @param {string} timeZone - Timezone (default: user's local timezone)
 * @returns {string} Formatted date and time (e.g., "11/3/2025, 2:30:45 PM")
 */
export const formatUTCToLocalDateTime = (timestamp, timeZone = null) => {
  if (!timestamp) return '';

  try {
    const date = new Date(timestamp);
    
    if (!timeZone) {
      return date.toLocaleString('en-US');
    }

    return date.toLocaleString('en-US', {
      timeZone: timeZone
    });
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '';
  }
};

/**
 * Format UTC timestamp to ISO date string (YYYY-MM-DD)
 * @param {string|Date|number} timestamp - UTC timestamp
 * @param {string} timeZone - Timezone (default: user's local timezone)
 * @returns {string} Formatted date (e.g., "2025-11-03")
 */
export const formatUTCToLocalDate = (timestamp, timeZone = null) => {
  if (!timestamp) return '';

  try {
    const date = new Date(timestamp);
    
    if (!timeZone) {
      return date.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format
    }

    const formatted = date.toLocaleString('en-US', {
      timeZone: timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    // Convert MM/DD/YYYY to YYYY-MM-DD
    const [month, day, year] = formatted.split('/');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '';
  }
};

/**
 * Calculate time difference from now
 * @param {string|Date|number} timestamp - UTC timestamp
 * @returns {string} Human-readable time difference (e.g., "5 minutes ago")
 */
export const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';

  try {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}:${minutes.toString().padStart(2, '0')} hours ago`;
    }
  } catch (error) {
    console.error('Error calculating time ago:', error);
    return '';
  }
};

/**
 * Get current user's timezone
 * @returns {string} Timezone identifier (e.g., "Asia/Jerusalem")
 */
export const getUserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Error getting user timezone:', error);
    return 'UTC';
  }
};

/**
 * Convert UTC timestamp to specific timezone
 * @param {string|Date|number} timestamp - UTC timestamp
 * @param {string} timeZone - Target timezone
 * @returns {Date} Date object in the specified timezone
 */
export const convertUTCToTimezone = (timestamp, timeZone) => {
  if (!timestamp) return null;

  try {
    const date = new Date(timestamp);
    return date; // JavaScript Date objects are always in UTC internally
  } catch (error) {
    console.error('Error converting timestamp:', error);
    return null;
  }
};

/**
 * Parse UTC timestamp and return Date object
 * @param {string|Date|number} timestamp - UTC timestamp (ISO 8601 string, Date object, or milliseconds)
 * @returns {Date|null} Date object or null if invalid
 */
export const parseUTCTimestamp = (timestamp) => {
  if (!timestamp) return null;

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      console.error('Invalid timestamp:', timestamp);
      return null;
    }
    return date;
  } catch (error) {
    console.error('Error parsing timestamp:', error);
    return null;
  }
};

/**
 * Check if timestamp is in UTC format
 * @param {string} timestamp - Timestamp string
 * @returns {boolean} True if timestamp ends with 'Z' (UTC indicator)
 */
export const isUTCTimestamp = (timestamp) => {
  if (typeof timestamp !== 'string') return false;
  return timestamp.endsWith('Z');
};

/**
 * Get timezone offset in hours
 * @returns {number} Timezone offset in hours (e.g., 2 for UTC+2)
 */
export const getTimezoneOffset = () => {
  const now = new Date();
  const utcTime = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const localTime = new Date(now.toLocaleString('en-US'));
  return (localTime - utcTime) / (1000 * 60 * 60);
};

/**
 * Format timestamp with timezone info
 * @param {string|Date|number} timestamp - UTC timestamp
 * @param {string} timeZone - Timezone (default: user's local timezone)
 * @returns {string} Formatted string with timezone (e.g., "2:30:45 PM IST")
 */
export const formatUTCWithTimezone = (timestamp, timeZone = null) => {
  if (!timestamp) return '';

  try {
    const date = new Date(timestamp);
    const tz = timeZone || getUserTimezone();
    
    const timeStr = date.toLocaleString('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    // Get timezone abbreviation
    const tzAbbr = date.toLocaleString('en-US', {
      timeZone: tz,
      timeZoneName: 'short'
    }).split(' ').pop();

    return `${timeStr} ${tzAbbr}`;
  } catch (error) {
    console.error('Error formatting timestamp with timezone:', error);
    return '';
  }
};

/**
 * Calculate latency between recorded_at and server_time
 * @param {string|Date|number} recordedAt - Device timestamp (UTC)
 * @param {string|Date|number} serverTime - Server timestamp (UTC)
 * @returns {number} Latency in seconds
 */
export const calculateLatency = (recordedAt, serverTime) => {
  try {
    const recorded = new Date(recordedAt);
    const server = new Date(serverTime);
    return Math.round((server - recorded) / 1000);
  } catch (error) {
    console.error('Error calculating latency:', error);
    return 0;
  }
};

export default {
  formatUTCToLocalTime,
  formatUTCToLocalDateTime,
  formatUTCToLocalDate,
  formatTimeAgo,
  getUserTimezone,
  convertUTCToTimezone,
  parseUTCTimestamp,
  isUTCTimestamp,
  getTimezoneOffset,
  formatUTCWithTimezone,
  calculateLatency
};

