# Timestamp Handling Guide

## 🌍 Important: All Timestamps Are UTC

All timestamps from API endpoints are in **UTC format** (Coordinated Universal Time).

---

## 📋 Timestamp Formats

### ISO 8601 Format (Most Common)
```
"2025-11-03T14:30:45Z"
```
- Ends with `Z` indicating UTC
- Format: `YYYY-MM-DDTHH:mm:ssZ`
- Example: `2025-11-03T14:30:45Z`

### Unix Milliseconds
```
1730641845000
```
- Divide by 1000 to get seconds
- Example: `1730641845000 / 1000 = 1730641845`

---

## 🔄 Conversion Steps

### Step 1: Receive UTC Timestamp
```javascript
const utcTimestamp = "2025-11-03T14:30:45Z";
```

### Step 2: Convert to Local Time
```javascript
// Parse UTC timestamp
const utcTime = new Date("2025-11-03T14:30:45Z");

// Convert to local timezone (Asia/Jerusalem)
const localTime = utcTime.toLocaleString('en-US', {
  timeZone: 'Asia/Jerusalem'
});

console.log(localTime); // "11/3/2025, 4:30:45 PM"
```

---

## 📚 Using Libraries

### Using Moment.js
```javascript
const utcTime = moment("2025-11-03T14:30:45Z");
const localTime = utcTime.tz('Asia/Jerusalem').format('YYYY-MM-DD HH:mm:ss');
console.log(localTime); // "2025-11-03 16:30:45"
```

### Using Day.js
```javascript
const utcTime = dayjs("2025-11-03T14:30:45Z");
const localTime = utcTime.tz('Asia/Jerusalem').format('YYYY-MM-DD HH:mm:ss');
console.log(localTime); // "2025-11-03 16:30:45"
```

### Using date-fns
```javascript
import { utcToZonedTime, format } from 'date-fns-tz';

const utcTime = new Date("2025-11-03T14:30:45Z");
const timeZone = 'Asia/Jerusalem';
const zonedTime = utcToZonedTime(utcTime, timeZone);
const formatted = format(zonedTime, 'yyyy-MM-dd HH:mm:ss zzz', { timeZone });
console.log(formatted); // "2025-11-03 16:30:45 IST"
```

---

## 📍 Timestamp Types in API Responses

### `recorded_at`
- **What:** Client timestamp (when device recorded the location)
- **Format:** ISO 8601 UTC
- **Example:** `"2025-11-03T14:30:45Z"`
- **Use:** When location was actually recorded on device

### `server_time`
- **What:** Server timestamp (when server received/processed it)
- **Format:** ISO 8601 UTC
- **Example:** `"2025-11-03T14:30:50Z"`
- **Use:** When server processed the location update

### Difference
```
recorded_at:  2025-11-03T14:30:45Z  (device time)
server_time:  2025-11-03T14:30:50Z  (server time)
Difference:   5 seconds (network latency)
```

---

## ⚠️ Important Notes

### ❌ Never Assume Local Time
```javascript
// WRONG - Assumes local time
const time = new Date("2025-11-03T14:30:45");

// CORRECT - Explicitly UTC
const time = new Date("2025-11-03T14:30:45Z");
```

### ✅ Always Convert for Display
```javascript
// Always convert UTC to user's local timezone for display
const utcTime = new Date("2025-11-03T14:30:45Z");
const localTime = utcTime.toLocaleString('en-US', {
  timeZone: 'Asia/Jerusalem'
});
```

### 🔢 Unix Milliseconds
```javascript
// When provided as milliseconds
const unixMs = 1730641845000;
const unixSeconds = unixMs / 1000;  // 1730641845
const date = new Date(unixMs);      // Automatically handles ms
```

---

## 🌐 Common Timezones

| Region | Timezone | UTC Offset |
|--------|----------|-----------|
| **Israel** | `Asia/Jerusalem` | UTC+2 (DST) / UTC+3 |
| **UTC** | `UTC` | UTC+0 |
| **US Eastern** | `America/New_York` | UTC-5 / UTC-4 |
| **US Pacific** | `America/Los_Angeles` | UTC-8 / UTC-7 |
| **Europe/London** | `Europe/London` | UTC+0 / UTC+1 |

---

## 💡 Best Practices

### 1. Store as UTC
```javascript
// Always store timestamps as UTC in database
const timestamp = new Date().toISOString(); // "2025-11-03T14:30:45.123Z"
```

### 2. Convert for Display
```javascript
// Convert to local timezone only for display
const displayTime = utcTime.toLocaleString('en-US', {
  timeZone: 'Asia/Jerusalem'
});
```

### 3. Use Consistent Format
```javascript
// Use ISO 8601 format consistently
const iso8601 = "2025-11-03T14:30:45Z";
const date = new Date(iso8601);
```

### 4. Handle Timezone Offset
```javascript
// Get timezone offset
const offset = new Date().getTimezoneOffset(); // in minutes
const offsetHours = offset / 60;
```

---

## 🔍 Debugging Timestamps

### Check if UTC
```javascript
const timestamp = "2025-11-03T14:30:45Z";
const isUTC = timestamp.endsWith('Z');
console.log(isUTC); // true
```

### Convert and Log
```javascript
const utcTime = new Date("2025-11-03T14:30:45Z");
console.log('UTC:', utcTime.toISOString());
console.log('Local:', utcTime.toLocaleString());
console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
```

### Compare Timestamps
```javascript
const recorded = new Date("2025-11-03T14:30:45Z");
const server = new Date("2025-11-03T14:30:50Z");
const latency = (server - recorded) / 1000; // 5 seconds
console.log(`Network latency: ${latency}s`);
```

---

## 📝 Example: Location Event with Timestamps

```javascript
{
  device_id: "device_123",
  username: "john_doe",
  latitude: 31.7683,
  longitude: 35.2137,
  accuracy: 10,
  speed: 5.2,
  bearing: 45,
  battery_level: 85,
  change_reason: "distance_threshold",
  recorded_at: "2025-11-03T14:30:45Z",      // ← Device time (UTC)
  server_time: "2025-11-03T14:30:50Z",      // ← Server time (UTC)
  change_metrics: {
    distance_m: 25,
    time_s: 120,
    speed_kmh: 5.2,
    bearing_deg: 45
  }
}
```

---

## 🎯 Quick Reference

| Task | Code |
|------|------|
| **Get current UTC** | `new Date().toISOString()` |
| **Parse UTC string** | `new Date("2025-11-03T14:30:45Z")` |
| **Convert to local** | `date.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })` |
| **Get timezone** | `Intl.DateTimeFormat().resolvedOptions().timeZone` |
| **Format with moment** | `moment(date).tz('Asia/Jerusalem').format('YYYY-MM-DD HH:mm:ss')` |
| **Unix to Date** | `new Date(unixMs)` |
| **Date to Unix** | `date.getTime()` |

---

## ✨ Summary

✅ **All timestamps are UTC** - Never assume local time
✅ **Always convert for display** - Use user's timezone
✅ **Use ISO 8601 format** - Ends with Z
✅ **Handle both types** - `recorded_at` (device) and `server_time` (server)
✅ **Store as UTC** - Convert only for display
✅ **Use libraries** - Moment.js, Day.js, or date-fns for complex operations

---

**Version:** 1.0
**Last Updated:** November 3, 2025
**Status:** ✅ REFERENCE GUIDE

