import express from "express";
import { prisma } from "../../exportprisma.js";
import { asyncHandler } from "../../utils.js";

const router = express.Router();

const fetchDeliveryTypes = asyncHandler(async (req, res) => {
  try {
    const deliveryTypes = await prisma.deliveryType.findMany();

    res.status(200).json({ deliveryTypes: deliveryTypes });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const newDeliveryType = asyncHandler(async (req, res) => {
  const { nameTm, nameRu, price } = req.body;

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

    await prisma.deliveryType.create({
      data: { nameTm, nameRu, price: Number(price) },
    });

    res.status(201).json({ message: "Способ доставки создано." });
  } catch (err) {
    res.status(500).send("Ошибка при создании способа доставки.");
  }
});

const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nameTm, nameRu, price } = req.body;

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

    await prisma.deliveryType.update({
      where: { id: Number(id) },
      data: { nameTm, nameRu, price: Number(price) },
    });
    res.status(201).json({ message: "Способ доставки обновлен." });
  } catch (err) {
    res.status(500).send("Ошибка при обновлении способа доставки.");
  }
});

const deleteDeliveryType = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.deliveryType.delete({
      where: { id: Number(id) },
    });

    res.status(200).json({ message: "Способ доставки удален." });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(409).json({
        message: "Способ доставки не найден.",
      });
    } else {
      res.status(500).send("Ошибка при удалении способа доставки.");
    }
  }
});

router.get("/fetch/all", fetchDeliveryTypes);
router.post("/new/", newDeliveryType);
router.patch("/update/:id", updateStatus);
router.delete("/delete/:id", deleteDeliveryType);

export default router;
