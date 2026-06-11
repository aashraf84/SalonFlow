# Task 2-c: Coupons/Promos, Audit Log, Attendance, Tips Modules

## Summary
Created 4 smaller salon management modules with frontend components and API routes.

## Files Created

### API Routes (5 new)
1. `/src/app/api/coupons/route.ts` - GET (list with filters + stats), POST (create with auto-code)
2. `/src/app/api/coupons/[id]/route.ts` - GET, PUT, DELETE
3. `/src/app/api/attendance/[id]/route.ts` - PUT (update attendance record)
4. `/src/app/api/tips/[id]/route.ts` - PUT, DELETE

### Frontend Components (4 new)
1. `/src/components/salon/coupons.tsx` - CouponsModule
2. `/src/components/salon/audit-log.tsx` - AuditLogModule
3. `/src/components/salon/attendance.tsx` - AttendanceModule
4. `/src/components/salon/tips.tsx` - TipsModule

### Files Modified
- `/src/app/page.tsx` - Added dynamic imports, moduleConfig entries, and switch cases for all 4 modules

## Existing API Routes Reused
- `/src/app/api/audit-logs/route.ts` - Already functional with filters and pagination
- `/src/app/api/attendance/route.ts` - Already functional with GET, POST (clock-in), PATCH (clock-out)
- `/src/app/api/tips/route.ts` - Already functional with GET (stats), POST (create)

## Key Design Decisions
- Rose/pink color scheme throughout, no indigo/blue
- All modules use GlassCard, AnimatedMetricCard, StaggerContainer from glass-card.tsx
- Framer Motion animations on table rows, metric cards, and tab transitions
- Toast notifications via sonner
- Responsive layout with mobile-first design
- Audit Log is read-only (no create/edit/delete)
- Attendance has 3 tabs: Today view, History, Calendar heatmap
- Tips includes staff/payment method breakdown cards and batch pay feature
- Coupons support 3 discount types: percentage, fixed_amount, free_service
