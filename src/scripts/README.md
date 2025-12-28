# Notification Testing Scripts

This directory contains scripts to test the notification system and verify that user preferences are working correctly.

## Prerequisites

1. **MongoDB** must be running and accessible
2. **Environment variables** must be configured (`.env` file)
3. **User must have a push token** - the user needs to have logged in on a mobile device at least once

## Getting a User ID

You have several options to get a user ID for testing:

### Option 1: From Server Logs

When a user logs in, check the server logs for the user ID.

### Option 2: From MongoDB

```bash
# Using MongoDB CLI
mongosh
use mukhalis
db.users.findOne({ "individualProfile.fullName": "Your Name" })

# Or get any user
db.users.findOne({}, { _id: 1, "individualProfile.fullName": 1, pushToken: 1 })
```

### Option 3: From MongoDB Compass

1. Open MongoDB Compass
2. Connect to your database
3. Browse the `users` collection
4. Copy the `_id` field of any user

## Scripts

### 0. `getUserIds.ts` - Get User IDs for Testing

This script lists all users in your database with their IDs and push token status. Use this to find a user ID for testing.

**Usage:**

```bash
cd server
npx ts-node src/scripts/getUserIds.ts
```

**Output:**

```
================================================================================
📋 USER LIST
================================================================================

Found 3 user(s):

1. سلطان السبيعي
   User ID: 676a8b4c1234567890abcdef
   Role: individual
   Has Push Token: ✅ Yes
   Push Enabled: ✅ Yes
   Offices Pref: followed
   Push Token: ExponentPushToken[xxxxxxxxxxxxxx]...

2. مكتب الخليج
   User ID: 676a8b4c1234567890abcd00
   Role: company
   Has Push Token: ❌ No
   Push Enabled: ✅ Yes
   Offices Pref: followed

================================================================================
💡 USAGE TIPS
================================================================================

✅ Users with push tokens found! You can test with:

Quick test:
   npx ts-node src/scripts/sendTestNotification.ts 676a8b4c1234567890abcdef

Full test suite:
   npx ts-node src/scripts/testNotifications.ts 676a8b4c1234567890abcdef

================================================================================
```

### 1. `testNotifications.ts` - Comprehensive Test Suite

This script runs a complete test suite including:

- ✅ User and push token verification
- ✅ Office update notifications
- ✅ System notifications
- ✅ Announcements
- ✅ Service update notifications
- ✅ Testing with push disabled
- ✅ Testing with offices preference set to 'none'

**Usage:**

```bash
cd server
npx ts-node src/scripts/testNotifications.ts <userId>
```

**Example:**

```bash
npx ts-node src/scripts/testNotifications.ts 507f1f77bcf86cd799439011
```

**Output:**

```
============================================================
🚀 NOTIFICATION SYSTEM TEST
============================================================

📱 Testing for user: 507f1f77bcf86cd799439011

🧪 Testing notification preferences...

✅ User Check: Found user: سلطان السبيعي

📋 Current Notification Preferences:
   Push Enabled: true
   Email Enabled: false
   WhatsApp Enabled: false
   SMS Enabled: false
   Offices: followed
   Push Token: ✅ Set

✅ Push Token Check: Push token exists: ExponentPushToken[xxxxxx]...

🧪 Test 1: Office Update Notification...
✅ Office Notification: Office notification sent successfully

... (more tests)

============================================================
📊 TEST SUMMARY
============================================================

✅ User Check
✅ Push Token Check
✅ Office Notification
✅ System Notification
✅ Announcement Notification
✅ Service Update Notification
✅ Push Disabled Test
✅ Offices None Test

📈 Results: 8/8 tests passed

🎉 All tests passed! Notification system is working correctly.
============================================================
```

### 2. `sendTestNotification.ts` - Quick Single Notification Test

Send a single notification quickly to test specific scenarios.

**Usage:**

```bash
cd server
npx ts-node src/scripts/sendTestNotification.ts <userId> [type]
```

**Available Notification Types:**

- `office_update` - Office information updated
- `system` - System notification (default)
- `announcement` - Important announcement
- `service_update` - New service added
- `review` - New review received
- `verification_status` - Verification status changed
- `milestone` - Achievement milestone reached
- `info` - General information

**Examples:**

```bash
# Send a system notification (default)
npx ts-node src/scripts/sendTestNotification.ts 507f1f77bcf86cd799439011

# Send an office update notification
npx ts-node src/scripts/sendTestNotification.ts 507f1f77bcf86cd799439011 office_update

# Send an announcement
npx ts-node src/scripts/sendTestNotification.ts 507f1f77bcf86cd799439011 announcement

# Send a service update
npx ts-node src/scripts/sendTestNotification.ts 507f1f77bcf86cd799439011 service_update
```

**Output:**

```
============================================================
📤 SENDING TEST NOTIFICATION
============================================================

📱 User ID: 507f1f77bcf86cd799439011
📋 Type: system

📝 Payload:
   Arabic Title: ⚙️ إشعار النظام
   Arabic Message: هذا إشعار اختبار من نظام مخلص
   English Title: ⚙️ System Notification
   English Message: This is a test notification from Mukhalis system

🚀 Sending notification...

============================================================
✅ SUCCESS: Notification sent successfully!
📱 Check your mobile device for the push notification
============================================================
```

## Testing Notification Preferences

### Test Push Notifications Enabled/Disabled

The comprehensive test script automatically tests both scenarios:

```bash
npx ts-node src/scripts/testNotifications.ts <userId>
```

The script will:

1. Send notifications with push enabled (should succeed)
2. Temporarily disable push and try to send (should be blocked)
3. Restore the original preference

### Test Office Preference (all/followed/none)

The script also tests the offices preference:

1. Send office notifications with normal preference (should succeed)
2. Temporarily set offices to 'none' and try to send (should be blocked)
3. Restore the original preference

### Manual Testing

You can manually update user preferences in MongoDB and test:

```javascript
// In MongoDB
db.users.updateOne(
  { _id: ObjectId("507f1f77bcf86cd799439011") },
  {
    $set: {
      "notificationPreferences.enablePush": false,
      "notificationPreferences.offices": "none",
    },
  }
);
```

Then send a notification:

```bash
npx ts-node src/scripts/sendTestNotification.ts 507f1f77bcf86cd799439011 office_update
```

It should be blocked according to preferences.

## Troubleshooting

### ❌ User not found

- Make sure the user ID is correct
- Check that the user exists in the database

### ❌ No push token

- The user needs to log in on a mobile device first
- Check that the app is properly requesting and saving push tokens
- Verify `user.pushToken` exists in the database

### ❌ Notification not received on mobile

1. **Check Expo Go app** - Make sure you're using Expo Go or a development build
2. **Check network** - Ensure the mobile device has internet connection
3. **Check preferences** - Verify user has push enabled
4. **Check Expo status** - Visit https://status.expo.dev/ to check if push service is operational
5. **Check push token format** - Must start with `ExponentPushToken[`

### ❌ "DeviceNotRegistered" error

- The push token is no longer valid
- User needs to log in again on the mobile device
- The token should be automatically refreshed

## How Preferences Work

The notification system respects user preferences as follows:

### `enablePush` (boolean)

- `true`: User receives push notifications
- `false`: **All push notifications are blocked**

### `offices` (string: "all" | "followed" | "none")

- `all`: Receive notifications from all offices
- `followed`: Only receive notifications from followed offices (default)
- `none`: **Block all office-related notifications** (office_update, service_update, review)

### Other Channels (Email, WhatsApp, SMS)

- Currently configured but not yet implemented
- `enableEmail`: Future email notifications
- `enableWhatsApp`: Future WhatsApp notifications
- `enableSMS`: Future SMS notifications

## Notification Types and Preferences

| Notification Type   | Affected by `offices` | Affected by `enablePush` |
| ------------------- | --------------------- | ------------------------ |
| office_update       | ✅ Yes                | ✅ Yes                   |
| service_update      | ✅ Yes                | ✅ Yes                   |
| review              | ✅ Yes                | ✅ Yes                   |
| new_business        | ✅ Yes                | ✅ Yes                   |
| system              | ❌ No                 | ✅ Yes                   |
| announcement        | ❌ No                 | ✅ Yes                   |
| maintenance         | ❌ No                 | ✅ Yes                   |
| info                | ❌ No                 | ✅ Yes                   |
| verification_status | ❌ No                 | ✅ Yes                   |
| milestone           | ❌ No                 | ✅ Yes                   |
| booking             | ❌ No                 | ✅ Yes                   |
| low_rating          | ❌ No                 | ✅ Yes                   |

## Integration with App

### Frontend (React Native)

The app should:

1. **Request push token** on login/startup
2. **Send token to backend** via `/api/users/push-token` endpoint
3. **Handle incoming notifications** using Expo Notifications API
4. **Allow users to manage preferences** in settings screen

Example frontend code:

```typescript
import * as Notifications from "expo-notifications";
import { updatePushToken } from "./services/userService";

// Get push token
const token = await Notifications.getExpoPushTokenAsync();

// Send to backend
await updatePushToken(token.data);

// Listen for notifications
Notifications.addNotificationReceivedListener((notification) => {
  console.log("Notification received:", notification);
});
```

### Backend Integration

To send notifications from your code:

```typescript
import * as notificationService from "./services/notificationService";
import { NotificationType } from "./types";

// Send to a specific user
await notificationService.sendToUser(userId, {
  type: NotificationType.OFFICE_UPDATE,
  title: {
    ar: "تحديث مكتب",
    en: "Office Update",
  },
  message: {
    ar: "تم تحديث معلومات المكتب",
    en: "Office information has been updated",
  },
  data: {
    officeId: "123",
    action: "view_office",
  },
});

// Send to all users with a specific role
await notificationService.sendToRole(UserRole.BUSINESS_OWNER, {
  type: NotificationType.ANNOUNCEMENT,
  title: { ar: "إعلان", en: "Announcement" },
  message: { ar: "رسالة", en: "Message" },
});

// Send to all users
await notificationService.sendToAll({
  type: NotificationType.MAINTENANCE,
  title: { ar: "صيانة", en: "Maintenance" },
  message: { ar: "الصيانة قريباً", en: "Maintenance soon" },
});
```

## Best Practices

1. **Always test notifications** before deploying to production
2. **Respect user preferences** - never force notifications
3. **Use appropriate notification types** - helps with filtering and analytics
4. **Provide meaningful data** - include action types and IDs for deep linking
5. **Handle errors gracefully** - invalid tokens, network issues, etc.
6. **Monitor notification delivery** - check logs for failed notifications
7. **Clean up invalid tokens** - remove tokens that return "DeviceNotRegistered"

## Production Considerations

1. **Rate Limiting**: Expo has rate limits for push notifications
2. **Batching**: Send notifications in batches to avoid overwhelming users
3. **Scheduling**: Consider user timezones for scheduled notifications
4. **Analytics**: Track notification delivery and engagement rates
5. **A/B Testing**: Test different notification messages for effectiveness
6. **Compliance**: Ensure GDPR/privacy compliance for notification data

## Support

For issues or questions:

1. Check the logs in `server/logs/`
2. Review the notification service code in `server/src/services/notificationService.ts`
3. Check Expo documentation: https://docs.expo.dev/push-notifications/overview/
