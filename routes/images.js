import path from "path";
import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

const productsPath = path.join(__dirname, "../uploads/products");
const adsPath = path.join(__dirname, "../uploads/ads");
const manufacturersPath = path.join(__dirname, "../uploads/manufacturers");
const notificationsPath = path.join(__dirname, "../uploads/notification");

router.use("/products/", express.static(productsPath));
router.use("/ads/", express.static(adsPath));
router.use("/manufacturers/", express.static(manufacturersPath));
router.use("/notifications/", express.static(notificationsPath));

export default router;
