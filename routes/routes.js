import express from "express";
const router = express.Router();

import authRouter from "./user/auth.js";
import usersRouter from "./user/users.js";
import visitorsRouter from "./user/visitors.js";
import messagesRouter from "./user/messages.js";
router.use("/user", authRouter);
router.use("/user", usersRouter);
router.use("/user", visitorsRouter);
router.use("/user", messagesRouter);

import productsRouter from "./shop/products.js";
import syncProductsRouter from "./shop/sync.js";
import adsRouter from "./shop/ads.js";
import notificationsRouter from "./shop/notification.js";
router.use("/shop/products", productsRouter);
router.use("/shop/products/sync", syncProductsRouter);
router.use("/shop/ads", adsRouter);
router.use("/shop/notifications", notificationsRouter);

import manufacturersRouter from "./management/manufacturer.js";
import categoriesRouter from "./management/categories.js";
import subCategoriesRouter from "./management/subcategories.js";
import statusesRouter from "./management/statuses.js";
import unitsRouter from "./management/units.js";
router.use("/management/manufacturers", manufacturersRouter);
router.use("/management/categories", categoriesRouter);
router.use("/management/subcategories", subCategoriesRouter);
router.use("/management/statuses", statusesRouter);
router.use("/management/units", unitsRouter);

import deliveryTypesRouter from "./management/delivery_types.js";
import paymentTypesRouter from "./management/payment_types.js";
import orderStatusesRouter from "./management/order_statuses.js";
router.use("/management/deliverytypes", deliveryTypesRouter);
router.use("/management/paymenttypes", paymentTypesRouter);
router.use("/management/orderstatuses", orderStatusesRouter);

import adminRouter from "./actions/admin.js";
import shopActionsRouter from "./actions/shopping.js";
import imagesRouter from "./images.js";
router.use("/actions/admin", adminRouter);
router.use("/actions/shop", shopActionsRouter);
router.use("/uploads/", imagesRouter);

router.get("/", (req, res) => {
  res.send("API root");
});

router.get("*", (req, res) => {
  res.status(404).json({ message: "Путь не найден." });
});

export default router;
