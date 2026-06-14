# Task: Fix SalonFlow ERP Issues (3 Fixes)

## Summary

Fixed three issues in the SalonFlow ERP application:

### Issue 1: Attendance hardcoded branchId
- **File**: `src/components/salon/attendance.tsx`
- **Problem**: `handleClockIn` used hardcoded `branchId: 'default'` on line 136
- **Fix**: Replaced with dynamic lookup from records:
  1. First tries `staffRecord?.staff?.branch?.id` (branch from staff relation)
  2. Falls back to `staffRecord?.branchId` (branchId from the attendance record itself)
  3. Falls back to first branch found in any record's staff data
  4. Final fallback to `'default'`

### Issue 2: Attendance API - hoursWorked calculation on clock-out
- **File**: `src/app/api/attendance/route.ts`
- **Problem**: PATCH handler set `clockOut` but didn't calculate hours worked or update status
- **Fix**: Added logic after setting `clockOut`:
  1. Calculate `hoursWorked` = (clockOut - clockIn) in hours
  2. If hoursWorked < 4 → status = `half_day`
  3. If clockIn was after 10:00 AM (configurable `LATE_HOUR` constant) → status = `late`
  4. Otherwise → status = `present`
  5. Note: half_day takes priority over late (shorter work day is more impactful)

### Issue 3: Create Waitlist API Route
- **Files Created**:
  - `src/app/api/waitlist/route.ts` (GET + POST)
  - `src/app/api/waitlist/[id]/route.ts` (PATCH)
- **Problem**: Waitlist model existed in Prisma but had no API route; frontend component called `/api/waitlist`
- **Fix**: Created full API with:
  - **GET**: Fetch waitlist entries with status/branchId filters, batch-fetch Customer/Service/Branch data (since no direct relations), merge into frontend-expected format
  - **POST**: Find or create customer by phone, create waitlist entry with `status: 'waiting'`, resolve branchId (use provided or first active branch)
  - **PATCH** (`/api/waitlist/[id]`): Validate status (waiting/notified/booked/cancelled), update entry, return enriched data with customer/service/branch names

## Lint Status
All modified/created files pass ESLint checks.
