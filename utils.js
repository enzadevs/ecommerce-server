import multer from "multer";
import rateLimit from "express-rate-limit";

export const multerStorage = multer;

export const asyncHandler = (fn) => (req, res, next) => {
  fn(req, res, next).catch((error) => {
    console.error(error.stack);
    res.status(error.statusCode || 500).json({ message: error.message });
  });
};

export const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message,
    statusCode: 429,
  });
};

export const timeFormat = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};
