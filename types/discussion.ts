export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  booking_id: string | null;
  invoice_id: string | null;
  package_id: string | null;
  attachment_url: string | null;
  attachment_type: "image" | "file" | null;
  attachment_name: string | null;
  is_read: boolean;
  created_at: string;
  sender?: { full_name: string | null } | null;
}

export interface Conversation {
  id: string;
  client_id: string;
  created_at?: string;
  updated_at?: string;
  last_message_at: string;
  client?: { id: string; full_name: string | null } | null;
}

export interface OnlineUser {
  user_id: string;
  role: "client" | "admin";
  full_name: string | null;
}

export interface TagState {
  bookingId: string | null;
  invoiceId: string | null;
  packageId: string | null;
}

export interface AttachmentState {
  uri: string;
  type: "image" | "file";
  mimeType: string;
  name: string;
}
