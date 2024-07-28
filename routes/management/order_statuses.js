import express from "express";
import { prisma } from "../../exportprisma.js";
import { asyncHandler } from "../../utils.js";

const router = express.Router();

const fetchOrderStatuses = asyncHandler(async (req, res) => {
  try {
    const orderStatuses = await prisma.orderStatus.findMany();

    res.status(200).json({ orderStatuses: orderStatuses });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const newOrderStatus = asyncHandler(async (req, res) => {
  const { nameTm, nameRu } = req.body;

  try {
    if (
      !nameTm ||
      typeof nameTm !== "string" ||
      !nameRu ||
      typeof nameRu !== "string"
    ) {
      return res.status(400).json({
        message: "Ошибка запроса.",
      });
    }

    await prisma.orderStatus.create({
      data: { nameTm, nameRu },
    });

    res.status(201).json({ message: "Статус заказа создана." });
  } catch (err) {
    res.status(500).send("Ошибка при создании статуса заказа.");
  }
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nameTm, nameRu } = req.body;

  try {
    if (
      !nameTm ||
      typeof nameTm !== "string" ||
      !nameRu ||
      typeof nameRu !== "string"
    ) {
      return res.status(400).json({
        message: "Ошибка запроса.",
      });
    }

    await prisma.orderStatus.update({
      where: { id: Number(id) },
      data: { nameTm, nameRu },
    });
    res.status(201).json({ message: "Статус заказа обновлена." });
  } catch (err) {
    res.status(500).send("Ошибка при обновлении статус заказа.");
  }
});

const deleteDeliveryType = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.orderStatus.delete({
      where: { id: Number(id) },
    });

    res.status(200).json({ message: "Статус заказа удален." });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(409).json({
        message: "Статус заказа не найдена.",
      });
    } else {
      res.status(500).send("Ошибка при удалении статуса заказа.");
    }
  }
});

router.get("/fetch/all", fetchOrderStatuses);
router.post("/new/", newOrderStatus);
router.patch("/update/:id", updateOrderStatus);
router.delete("/delete/:id", deleteDeliveryType);

export default router;
