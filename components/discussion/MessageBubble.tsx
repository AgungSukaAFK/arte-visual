import React from "react";
import { Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { appThemePalette } from "@/constants/theme";
import TaggedContext from "@/components/discussion/TaggedContext";
import AttachmentPreview from "@/components/discussion/AttachmentPreview";
import type { Message } from "@/types/discussion";

type Props = {
  message: Message;
  isOwnMessage: boolean;
};

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessageBubble({ message, isOwnMessage }: Props) {
  const { colorScheme } = useColorScheme();
  const palette = appThemePalette[colorScheme === "dark" ? "dark" : "light"];

  return (
    <View
      style={{
        alignSelf: isOwnMessage ? "flex-end" : "flex-start",
        width: "100%",
        marginBottom: 12,
      }}
    >
      <View
        style={{
          alignSelf: isOwnMessage ? "flex-end" : "flex-start",
          maxWidth: "84%",
          borderRadius: 14,
          paddingVertical: 10,
          paddingHorizontal: 12,
          backgroundColor: isOwnMessage ? palette.accent : palette.surface,
          borderWidth: isOwnMessage ? 0 : 1,
          borderColor: isOwnMessage ? "transparent" : palette.borderSubtle,
        }}
      >
        {message.content ? (
          <Text
            style={{
              color: isOwnMessage ? palette.accentContrast : palette.textStrong,
              lineHeight: 20,
            }}
          >
            {message.content}
          </Text>
        ) : null}

        {message.booking_id || message.invoice_id || message.package_id ? (
          <TaggedContext
            bookingId={message.booking_id}
            invoiceId={message.invoice_id}
            packageId={message.package_id}
          />
        ) : null}

        {message.attachment_url && message.attachment_type ? (
          <AttachmentPreview
            url={message.attachment_url}
            type={message.attachment_type}
            name={message.attachment_name}
          />
        ) : null}

        <Text
          style={{
            marginTop: 8,
            fontSize: 11,
            color: isOwnMessage ? palette.accentContrast : palette.textSoft,
            textAlign: "right",
          }}
        >
          {formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}
