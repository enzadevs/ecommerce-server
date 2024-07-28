import express from "express";
import { prisma } from "../../exportprisma.js";
import { asyncHandler } from "../../utils.js";

const router = express.Router();

const fetchStatuses = asyncHandler(async (req, res) => {
  try {
    const statuses = await prisma.status.findMany();

    res.status(200).json({ statuses: statuses });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const newStatus = asyncHandler(async (req, res) => {
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

    await prisma.status.create({
      data: { nameTm, nameRu },
    });

    res.status(201).json({ message: "Статус создан." });
  } catch (err) {
    res.status(500).send("Ошибка при создания статуса.");
  }
});

const updateStatus = asyncHandler(async (req, res) => {
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

    await prisma.status.update({
      where: { id: Number(id) },
      data: { nameTm, nameRu },
    });
    res.status(201).json({ message: "Статус обновлена." });
  } catch (err) {
    res.status(500).send("Ошибка при обновления статуса.");
  }
});

const deleteStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.status.delete({
      where: { id: Number(id) },
    });

    res.status(200).json({ message: "Статус удален." });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(409).json({
        message: "Статус не найден.",
      });
    } else {
      res.status(500).send("Ошибка при удалении статуса.");
    }
  }
});

router.get("/fetch/all", fetchStatuses);
router.post("/new/", newStatus);
router.patch("/update/:id", updateStatus);
router.delete("/delete/:id", deleteStatus);

export default router;
