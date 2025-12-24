import { Expo, ExpoPushMessage } from "expo-server-sdk";
import logger from "../utils/logger";

// Create a new Expo SDK client
// optionally providing an access token if you have enabled push security
const expo = new Expo();

export const sendPushNotification = async (
  pushTokens: string[],
  title: string,
  body: string,
  data?: any
) => {
  const messages: ExpoPushMessage[] = [];

  for (const pushToken of pushTokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      logger.error(`Push token ${pushToken} is not a valid Expo push token`);
      continue;
    }

    messages.push({
      to: pushToken,
      sound: "default",
      title,
      body,
      data,
      channelId: "default",
    });
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets: any[] = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      logger.error("Error sending push notification chunks:", error);
    }
  }

  // Handle errors
  const errors: any[] = [];
  tickets.forEach((ticket) => {
    if (ticket.status === "error") {
      errors.push(ticket);
      if (ticket.details && ticket.details.error === "DeviceNotRegistered") {
        // TODO: Remove the invalid token from the user's record
        // This will be handled by a cleanup job or separate function
      }
    }
  });

  if (errors.length > 0) {
    logger.error("Error sending push notifications:", errors);
  }

  return {
    success: errors.length === 0,
    tickets,
    errors,
  };
};

export const sendBusinessStatusNotification = async (
  pushToken: string,
  status: "approved" | "rejected" | "pending",
  businessName: string,
  reviewNotes?: string
) => {
  let title = "تحديث بخصوص طلب توثيق حسابك";
  let body = "";

  switch (status) {
    case "approved":
      title = "تم توثيق حسابك بنجاح! 🎉";
      body = `تمت الموافقة على طلب توثيق "${businessName}" بنجاح. يمكنك الآن البدء في استخدام جميع المميزات.`;
      break;
    case "rejected":
      body = `عذراً، تم رفض طلب توثيق "${businessName}". يرجى مراجعة الملاحظات وتحديث البيانات.`;
      break;
    case "pending":
      body = `تم إعادة حالة طلب توثيق "${businessName}" للمراجعة.`;
      break;
  }

  const data = {
    type: "business_status",
    status,
    businessName,
    reviewNotes,
  };

  return sendPushNotification([pushToken], title, body, data);
};
