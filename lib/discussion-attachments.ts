import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { Platform } from "react-native";
import { supabase, supabaseAnonKey, supabaseUrl } from "@/lib/supabase";
import type { AttachmentState } from "@/types/discussion";

const DISCUSSION_BUCKET = "discussion-attachments";

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getReadableErrorMessage(error: unknown) {
  if (!error) return "Unknown error";

  if (typeof error === "string") return error;

  if (typeof error === "object") {
    const maybeError = error as {
      message?: string;
      error_description?: string;
      details?: string;
      code?: string;
    };
    return (
      maybeError.message ||
      maybeError.error_description ||
      maybeError.details ||
      maybeError.code ||
      "Unknown error"
    );
  }

  return "Unknown error";
}

async function readFileAsArrayBuffer(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  let readableUri = uri;

  if (!info.exists) {
    const fallbackUri = `${FileSystem.cacheDirectory}discussion_${Date.now()}`;
    await FileSystem.copyAsync({ from: uri, to: fallbackUri });
    readableUri = fallbackUri;
  }

  const base64 = await FileSystem.readAsStringAsync(readableUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return decode(base64);
}

async function ensureLocalReadableUri(uri: string, fileName: string) {
  const info = await FileSystem.getInfoAsync(uri);

  if (info.exists && uri.startsWith("file://")) {
    return uri;
  }

  const target = `${FileSystem.cacheDirectory}discussion_${Date.now()}_${sanitizeName(fileName)}`;
  await FileSystem.copyAsync({ from: uri, to: target });
  return target;
}

async function uploadViaStorageRest(path: string, file: AttachmentState) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error("Session login tidak ditemukan");
  }

  const localUri = await ensureLocalReadableUri(file.uri, file.name);
  const endpoint = `${supabaseUrl}/storage/v1/object/${DISCUSSION_BUCKET}/${path}`;

  const result = await FileSystem.uploadAsync(endpoint, localUri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
      "Content-Type": file.mimeType,
      "x-upsert": "false",
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      `Upload storage gagal [${result.status}] ${result.body || "No response body"}`,
    );
  }
}

export async function uploadDiscussionAttachment(
  userId: string,
  file: AttachmentState,
) {
  const safeName = sanitizeName(file.name || `file_${Date.now()}.bin`);
  const randomPart = Math.random().toString(36).slice(2);
  const path = `${userId}/${Date.now()}_${randomPart}_${safeName}`;

  if (Platform.OS !== "web") {
    await uploadViaStorageRest(path, file);
  } else {
    let uploadPayload: ArrayBuffer | Blob;

    try {
      uploadPayload = await readFileAsArrayBuffer(file.uri);
    } catch (primaryError) {
      try {
        const response = await fetch(file.uri);
        uploadPayload = await response.blob();
      } catch (fallbackError) {
        throw new Error(
          `Gagal membaca file lampiran (${getReadableErrorMessage(primaryError)} | ${getReadableErrorMessage(fallbackError)})`,
        );
      }
    }

    const { error } = await supabase.storage
      .from(DISCUSSION_BUCKET)
      .upload(path, uploadPayload, {
        contentType: file.mimeType,
        upsert: false,
      });

    if (error) throw error;
  }

  const { data } = supabase.storage.from(DISCUSSION_BUCKET).getPublicUrl(path);

  return {
    path,
    publicUrl: data.publicUrl,
  };
}
