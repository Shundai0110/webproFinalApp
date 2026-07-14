import type { RequestHandler } from "express";
import { sendSuccess } from "../lib/http.js";
import { parsePositiveId } from "../lib/validation.js";
import { currentSession } from "../middlewares/authMiddleware.js";
import { addComment, listComments } from "../services/commentService.js";

export const index: RequestHandler = async (req, res) => {
  sendSuccess(res, await listComments(currentSession(res.locals).userId, req.query));
};

export const indexForBook: RequestHandler = async (req, res) => {
  sendSuccess(
    res,
    await listComments(
      currentSession(res.locals).userId,
      req.query,
      parsePositiveId(req.params.id, "bookId"),
    ),
  );
};

export const createForBook: RequestHandler = async (req, res) => {
  const comment = await addComment(
    currentSession(res.locals).userId,
    parsePositiveId(req.params.id, "bookId"),
    req.body,
  );
  sendSuccess(res, comment, "コメントを投稿しました", 201);
};
