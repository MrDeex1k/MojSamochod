# Vehicle Records

Shared domain vocabulary for vehicle records and reminders. Detailed phase decisions remain in
the documents under `docs/`.

## Language

**History entry**:
A record of an inspection, replacement, or repair that has already occurred for a vehicle.
_Avoid_: Reminder, upcoming service.

**Vehicle deadline**:
The calendar date through which a vehicle's insurance or technical inspection remains valid.
_Avoid_: Notification time, history event time.

**Reminder**:
A vehicle's current insurance or technical-inspection deadline together with its retained time
zone and notification preferences.
_Avoid_: Notification, history entry.

**Reminder time zone**:
The device time zone captured when a reminder is created and retained when the device changes
time zones; its seasonal clock changes still apply.
_Avoid_: Current device time zone, fixed UTC offset.

**Reminder notification**:
A device alert for a reminder at a selected calendar-day offset from its deadline.
_Avoid_: Deadline, reminder status.
