import type { RequestHandler } from "express";
import { sendSuccess } from "../lib/http.js";
import { parsePositiveId } from "../lib/validation.js";
import { currentSession } from "../middlewares/authMiddleware.js";
import { addBook, cancelBook, editBook, getBook, listBooks } from "../services/bookService.js";

export const index: RequestHandler = async (req, res) => {
  const books = await listBooks(currentSession(res.locals).userId, req.query);
  sendSuccess(res, books);
};

export const show: RequestHandler = async (req, res) => {
  sendSuccess(res, await getBook(parsePositiveId(req.params.id, "bookId")));
};

export const create: RequestHandler = async (req, res) => {
  const book = await addBook(currentSession(res.locals).userId, req.body);
  sendSuccess(res, book, "教科書を出品しました", 201);
};

export const update: RequestHandler = async (req, res) => {
  const book = await editBook(
    currentSession(res.locals).userId,
    parsePositiveId(req.params.id, "bookId"),
    req.body,
  );
  sendSuccess(res, book, "教科書を更新しました");
};

export const remove: RequestHandler = async (req, res) => {
  const book = await cancelBook(
    currentSession(res.locals).userId,
    parsePositiveId(req.params.id, "bookId"),
  );
  sendSuccess(res, book, "出品を取り消しました");
};
