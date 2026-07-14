import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import { ephemeralStore } from "../lib/ephemeralStore.js";
import { allowOnly, inputRecord, requiredString } from "../lib/validation.js";
import { getOwnProfile } from "./authService.js";

function requireEphemeralComments() {
  if (env.storageMode !== "ephemeral") {
    throw new AppError(
      503,
      "EPHEMERAL_FEATURE_REQUIRED",
      "コメントAPIは無料公開向け一時DBモードで利用してください",
    );
  }
}

export async function listComments(currentUserId: number, bookId?: number) {
  await getOwnProfile(currentUserId);
  requireEphemeralComments();
  return ephemeralStore.listComments(bookId);
}

export async function addComment(currentUserId: number, bookId: number, input: unknown) {
  await getOwnProfile(currentUserId);
  requireEphemeralComments();
  const body = inputRecord(input);
  allowOnly(body, ["body"]);
  const comment = requiredString(body, "body", 240);
  return ephemeralStore.createComment(bookId, currentUserId, comment);
}
