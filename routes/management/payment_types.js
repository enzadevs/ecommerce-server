import express from "express";
import { prisma } from "../../exportprisma.js";
import { asyncHandler } from "../../utils.js";

const router = express.Router();

const fetchPaymentTypes = asyncHandler(async (req, res) => {
  try {
    const paymentTypes = await prisma.paymentType.findMany();

    res.status(200).json({ paymentTypes: paymentTypes });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const newPaymentType = asyncHandler(async (req, res) => {
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

    await prisma.paymentType.create({
      data: { nameTm, nameRu },
    });

    res.status(201).json({ message: "Способ оплаты создано." });
  } catch (err) {
    res.status(500).send("Ошибка при создании способа оплаты.");
  }
});

const updatePaymentType = asyncHandler(async (req, res) => {
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

    await prisma.paymentType.update({
      where: { id: Number(id) },
      data: { nameTm, nameRu },
    });
    res.status(201).json({ message: "Способ оплаты обновлен." });
  } catch (err) {
    res.status(500).send("Ошибка при обновлении способа оплаты.");
  }
});

const deletePaymentType = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.paymentType.delete({
      where: { id: Number(id) },
    });

    res.status(200).json({ message: "Способ оплаты удален." });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(409).json({
        message: "Способ оплаты не найден.",
      });
    } else {
      res.status(500).send("Ошибка при удалении способа оплаты.");
    }
  }
});

router.get("/fetch/all", fetchPaymentTypes);
router.post("/new/", newPaymentType);
router.patch("/update/:id", updatePaymentType);
router.delete("/delete/:id", deletePaymentType);

export default router;
