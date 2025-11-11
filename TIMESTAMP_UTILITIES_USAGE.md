# Timestamp Utilities Usage Guide

## 📁 File Location

```
frontend/src/utils/timestampUtils.js
```

---

## 🚀 Quick Start

### Import the utilities
```javascript
import {
  formatUTCToLocalTime,
  formatUTCToLocalDateTime,
  formatTimeAgo,
  getUserTimezone,
  calculateLatency
} from '../utils/timestampUtils';
```

---

## 📚 Available Functions

### 1. `formatUTCToLocalTime(timestamp, timeZone)`
Convert UTC timestamp to local time string.

**Parameters:**
- `timestamp` - UTC timestamp (ISO 8601 string, Date object, or milliseconds)
- `timeZone` - (Optional) Timezone identifier (default: user's local timezone)

**Returns:** Formatted time string (e.g., "02:30:45 PM")

**Example:**
```javascript
const utcTime = "2025-11-03T14:30:45Z";
const localTime = formatUTCToLocalTime(utcTime);
console.log(localTime); // "02:30:45 PM"

// With specific timezone
const jerusalemTime = formatUTCToLocalTime(utcTime, 'Asia/Jerusalem');
console.log(jerusalemTime); // "04:30:45 PM"
```

---

### 2. `formatUTCToLocalDateTime(timestamp, timeZone)`
Convert UTC timestamp to local date and time string.

**Returns:** Formatted date and time (e.g., "11/3/2025, 02:30:45 PM")

**Example:**
```javascript
const utcTime = "2025-11-03T14:30:45Z";
const localDateTime = formatUTCToLocalDateTime(utcTime);
console.log(localDateTime); // "11/3/2025, 02:30:45 PM"
```

---

### 3. `formatUTCToLocalDate(timestamp, timeZone)`
Convert UTC timestamp to local date string.

**Returns:** Formatted date (e.g., "2025-11-03")

**Example:**
```javascript
const utcTime = "2025-11-03T14:30:45Z";
const localDate = formatUTCToLocalDate(utcTime);
console.log(localDate); // "2025-11-03"
```

---

### 4. `formatTimeAgo(timestamp)`
Calculate human-readable time difference from now.

**Returns:** Time difference string (e.g., "5 minutes ago")

**Example:**
```javascript
const utcTime = "2025-11-03T14:25:00Z";
const timeAgo = formatTimeAgo(utcTime);
console.log(timeAgo); // "5 minutes ago"
```

---

### 5. `getUserTimezone()`
Get current user's timezone.

**Returns:** Timezone identifier (e.g., "Asia/Jerusalem")

**Example:**
```javascript
const userTz = getUserTimezone();
console.log(userTz); // "Asia/Jerusalem"
```

---

### 6. `parseUTCTimestamp(timestamp)`
Parse UTC timestamp and return Date object.

**Returns:** Date object or null if invalid

**Example:**
```javascript
const utcTime = "2025-11-03T14:30:45Z";
const dateObj = parseUTCTimestamp(utcTime);
console.log(dateObj); // Date object
```

---

### 7. `isUTCTimestamp(timestamp)`
Check if timestamp is in UTC format.

**Returns:** Boolean (true if ends with 'Z')

**Example:**
```javascript
const utcTime = "2025-11-03T14:30:45Z";
const isUTC = isUTCTimestamp(utcTime);
console.log(isUTC); // true
```

---

### 8. `getTimezoneOffset()`
Get timezone offset in hours.

**Returns:** Offset in hours (e.g., 2 for UTC+2)

**Example:**
```javascript
const offset = getTimezoneOffset();
console.log(offset); // 2 (for UTC+2)
```

---

### 9. `formatUTCWithTimezone(timestamp, timeZone)`
Format timestamp with timezone abbreviation.

**Returns:** Formatted string with timezone (e.g., "02:30:45 PM IST")

**Example:**
```javascript
const utcTime = "2025-11-03T14:30:45Z";
const formatted = formatUTCWithTimezone(utcTime, 'Asia/Jerusalem');
console.log(formatted); // "04:30:45 PM IST"
```

---

### 10. `calculateLatency(recordedAt, serverTime)`
Calculate latency between device and server timestamps.

**Returns:** Latency in seconds

**Example:**
```javascript
const recorded = "2025-11-03T14:30:45Z";
const server = "2025-11-03T14:30:50Z";
const latency = calculateLatency(recorded, server);
console.log(latency); // 5 (seconds)
```

---

## 💡 Usage Examples

### Example 1: Display Location Update Time
```javascript
import { formatUTCToLocalTime, formatTimeAgo } from '../utils/timestampUtils';

function LocationDisplay({ location }) {
  return (
    <div>
      <p>Time: {formatUTCToLocalTime(location.server_time)}</p>
      <p>Updated: {formatTimeAgo(location.server_time)}</p>
    </div>
  );
}
```

### Example 2: Display Full DateTime with Timezone
```javascript
import { formatUTCWithTimezone } from '../utils/timestampUtils';

function LocationInfo({ location }) {
  return (
    <div>
      <p>Recorded: {formatUTCWithTimezone(location.recorded_at, 'Asia/Jerusalem')}</p>
      <p>Server: {formatUTCWithTimezone(location.server_time, 'Asia/Jerusalem')}</p>
    </div>
  );
}
```

### Example 3: Calculate and Display Latency
```javascript
import { calculateLatency } from '../utils/timestampUtils';

function LatencyInfo({ location }) {
  const latency = calculateLatency(location.recorded_at, location.server_time);
  return <p>Network Latency: {latency}s</p>;
}
```

### Example 4: Format Date Range
```javascript
import { formatUTCToLocalDate } from '../utils/timestampUtils';

function DateRange({ startTime, endTime }) {
  return (
    <div>
      <p>From: {formatUTCToLocalDate(startTime)}</p>
      <p>To: {formatUTCToLocalDate(endTime)}</p>
    </div>
  );
}
```

### Example 5: React Component with Timestamps
```javascript
import { 
  formatUTCToLocalTime, 
  formatTimeAgo,
  calculateLatency 
} from '../utils/timestampUtils';

function LocationCard({ location }) {
  return (
    <div className="card">
      <h3>{location.username}</h3>
      <p>Location: {location.latitude}, {location.longitude}</p>
      <p>Time: {formatUTCToLocalTime(location.server_time)}</p>
      <p>Updated: {formatTimeAgo(location.server_time)}</p>
      <p>Latency: {calculateLatency(location.recorded_at, location.server_time)}s</p>
    </div>
  );
}
```

---

## 🔄 Migration Guide

### Before (Without Utilities)
```javascript
// Old way - may not handle timezones correctly
const time = new Date(timestamp).toLocaleTimeString();
```

### After (With Utilities)
```javascript
// New way - proper UTC to local conversion
import { formatUTCToLocalTime } from '../utils/timestampUtils';
const time = formatUTCToLocalTime(timestamp);
```

---

## ⚠️ Important Notes

### Always Use UTC Timestamps
```javascript
// ✅ CORRECT - UTC timestamp
const timestamp = "2025-11-03T14:30:45Z";

// ❌ WRONG - Ambiguous timestamp
const timestamp = "2025-11-03T14:30:45";
```

### Convert Only for Display
```javascript
// ✅ CORRECT - Store as UTC, convert for display
const utcTime = "2025-11-03T14:30:45Z";
const displayTime = formatUTCToLocalTime(utcTime);

// ❌ WRONG - Converting for storage
const localTime = new Date().toLocaleString();
// Don't store this!
```

### Handle Null/Undefined
```javascript
// ✅ CORRECT - Functions handle null gracefully
const time = formatUTCToLocalTime(null); // Returns ''

// ❌ WRONG - May throw error
const time = new Date(null).toLocaleTimeString();
```

---

## 🎯 Common Patterns

### Pattern 1: Display Current Location Time
```javascript
<span>{formatUTCToLocalTime(currentLocation.server_time)}</span>
<span className="text-gray-500">({formatTimeAgo(currentLocation.server_time)})</span>
```

### Pattern 2: Display Location History
```javascript
{locations.map(loc => (
  <div key={loc.id}>
    <p>{formatUTCToLocalDateTime(loc.server_time)}</p>
    <p>{loc.latitude}, {loc.longitude}</p>
  </div>
))}
```

### Pattern 3: Display Date Range Filter
```javascript
<input 
  type="date" 
  value={formatUTCToLocalDate(startDate)}
/>
<input 
  type="date" 
  value={formatUTCToLocalDate(endDate)}
/>
```

---

## 🧪 Testing

### Test UTC Conversion
```javascript
import { formatUTCToLocalTime, isUTCTimestamp } from '../utils/timestampUtils';

const utcTime = "2025-11-03T14:30:45Z";
console.assert(isUTCTimestamp(utcTime) === true);
console.assert(formatUTCToLocalTime(utcTime) !== '');
```

### Test Timezone Handling
```javascript
import { formatUTCToLocalTime, getUserTimezone } from '../utils/timestampUtils';

const utcTime = "2025-11-03T14:30:45Z";
const userTz = getUserTimezone();
const formatted = formatUTCToLocalTime(utcTime, userTz);
console.assert(formatted !== '');
```

---

## 📊 Summary

✅ **Proper UTC handling** - All timestamps are UTC
✅ **Timezone conversion** - Convert to user's local timezone
✅ **Error handling** - Graceful error handling
✅ **Reusable functions** - Use across components
✅ **Type safe** - Handles various input types
✅ **Well documented** - Clear function descriptions

---

**Version:** 1.0
**Last Updated:** November 3, 2025
**Status:** ✅ READY TO USE

