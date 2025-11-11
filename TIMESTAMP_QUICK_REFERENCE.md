# Timestamp Quick Reference Card

## 🚀 Import
```javascript
import {
  formatUTCToLocalTime,
  formatUTCToLocalDateTime,
  formatUTCToLocalDate,
  formatTimeAgo,
  getUserTimezone,
  calculateLatency,
  formatUTCWithTimezone
} from '../utils/timestampUtils';
```

---

## 📋 Functions at a Glance

### Time Formatting
```javascript
// Time only
formatUTCToLocalTime("2025-11-03T14:30:45Z")
// → "02:30:45 PM"

// Date and time
formatUTCToLocalDateTime("2025-11-03T14:30:45Z")
// → "11/3/2025, 02:30:45 PM"

// Date only
formatUTCToLocalDate("2025-11-03T14:30:45Z")
// → "2025-11-03"

// With timezone
formatUTCWithTimezone("2025-11-03T14:30:45Z", 'Asia/Jerusalem')
// → "04:30:45 PM IST"
```

### Time Calculations
```javascript
// Time ago
formatTimeAgo("2025-11-03T14:25:00Z")
// → "5 minutes ago"

// Latency
calculateLatency("2025-11-03T14:30:45Z", "2025-11-03T14:30:50Z")
// → 5 (seconds)
```

### Timezone Info
```javascript
// Get user timezone
getUserTimezone()
// → "Asia/Jerusalem"

// Get offset
getTimezoneOffset()
// → 2 (hours)
```

### Validation
```javascript
// Check if UTC
isUTCTimestamp("2025-11-03T14:30:45Z")
// → true

// Parse timestamp
parseUTCTimestamp("2025-11-03T14:30:45Z")
// → Date object
```

---

## 💻 React Component Examples

### Example 1: Simple Time Display
```javascript
<span>{formatUTCToLocalTime(location.server_time)}</span>
```

### Example 2: Time with "ago"
```javascript
<div>
  <span>{formatUTCToLocalTime(location.server_time)}</span>
  <span className="text-gray-500">
    ({formatTimeAgo(location.server_time)})
  </span>
</div>
```

### Example 3: Full DateTime
```javascript
<p>{formatUTCToLocalDateTime(location.server_time)}</p>
```

### Example 4: With Timezone
```javascript
<p>{formatUTCWithTimezone(location.server_time, 'Asia/Jerusalem')}</p>
```

### Example 5: Latency Display
```javascript
<p>
  Latency: {calculateLatency(location.recorded_at, location.server_time)}s
</p>
```

### Example 6: Complete Location Card
```javascript
function LocationCard({ location }) {
  return (
    <div>
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

## 🔄 Before & After

### Before (Without Utilities)
```javascript
// May not handle timezones correctly
const time = new Date(timestamp).toLocaleTimeString();
```

### After (With Utilities)
```javascript
// Proper UTC to local conversion
import { formatUTCToLocalTime } from '../utils/timestampUtils';
const time = formatUTCToLocalTime(timestamp);
```

---

## ⚠️ Important Rules

| Rule | Example |
|------|---------|
| **All timestamps are UTC** | `"2025-11-03T14:30:45Z"` |
| **Always ends with Z** | ✅ `"...Z"` ❌ `"..."` |
| **Convert for display only** | Display: local, Store: UTC |
| **Handle null gracefully** | Returns empty string |
| **Use utility functions** | Don't use native Date methods |

---

## 🎯 Common Patterns

### Pattern 1: Current Location
```javascript
<p>Last update: {formatTimeAgo(currentLocation.server_time)}</p>
```

### Pattern 2: Location History
```javascript
{locations.map(loc => (
  <div key={loc.id}>
    <p>{formatUTCToLocalDateTime(loc.server_time)}</p>
    <p>{loc.latitude}, {loc.longitude}</p>
  </div>
))}
```

### Pattern 3: Date Range
```javascript
<input type="date" value={formatUTCToLocalDate(startDate)} />
<input type="date" value={formatUTCToLocalDate(endDate)} />
```

### Pattern 4: Recorded vs Server Time
```javascript
<p>Recorded: {formatUTCToLocalTime(location.recorded_at)}</p>
<p>Server: {formatUTCToLocalTime(location.server_time)}</p>
<p>Latency: {calculateLatency(location.recorded_at, location.server_time)}s</p>
```

---

## 🧪 Quick Tests

### Test 1: UTC Validation
```javascript
const utcTime = "2025-11-03T14:30:45Z";
console.assert(isUTCTimestamp(utcTime) === true);
```

### Test 2: Formatting
```javascript
const formatted = formatUTCToLocalTime("2025-11-03T14:30:45Z");
console.assert(formatted !== '');
```

### Test 3: Null Handling
```javascript
const result = formatUTCToLocalTime(null);
console.assert(result === '');
```

---

## 📁 File Location
```
frontend/src/utils/timestampUtils.js
```

---

## 📚 Full Documentation
- `TIMESTAMP_HANDLING_GUIDE.md` - Complete reference
- `TIMESTAMP_UTILITIES_USAGE.md` - Detailed examples
- `TIMESTAMP_IMPLEMENTATION_SUMMARY.md` - Implementation guide

---

## ✨ Key Takeaways

✅ Import utilities from `frontend/src/utils/timestampUtils.js`
✅ All timestamps from API are UTC
✅ Convert to local timezone for display
✅ Use utility functions for consistency
✅ Handle null/undefined gracefully
✅ Store timestamps as UTC, never convert for storage

---

**Version:** 1.0
**Last Updated:** November 3, 2025
**Status:** ✅ READY TO USE

