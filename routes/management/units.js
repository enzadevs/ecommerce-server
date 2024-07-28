import express from "express";
import { prisma } from "../../exportprisma.js";
import { asyncHandler } from "../../utils.js";

const router = express.Router();

const fetchUnits = asyncHandler(async (req, res) => {
  try {
    const units = await prisma.unit.findMany();

    res.status(200).json({ units: units });
  } catch (err) {
    res.unit(500).send("Ошибка при получении данных.");
  }
});

const newUnit = asyncHandler(async (req, res) => {
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

    await prisma.unit.create({
      data: { nameTm, nameRu },
    });

    res.status(201).json({ message: "Ед. измерения создана." });
  } catch (err) {
    res.status(500).send("Ошибка при создании ед. измерения.");
  }
});

const updateUnit = asyncHandler(async (req, res) => {
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

    await prisma.unit.update({
      where: { id: Number(id) },
      data: { nameTm, nameRu },
    });
    res.status(201).json({ message: "Ед. измерения обновлена." });
  } catch (err) {
    res.status(500).send("Ошибка при обновлении ед. измерения.");
  }
});

const deleteUnit = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.unit.delete({
      where: { id: Number(id) },
    });

    res.status(200).json({ message: "Ед. измерения удален." });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(409).json({
        message: "Статус не найден.",
      });
    } else {
      res.status(500).send("Ошибка при удалении ед. измерения.");
    }
  }
});

router.get("/fetch/all", fetchUnits);
router.post("/new/", newUnit);
router.patch("/update/:id", updateUnit);
router.delete("/delete/:id", deleteUnit);

export default router;
