import express from "express";
import { prisma } from "../../exportprisma.js";
import { asyncHandler } from "../../utils.js";

const router = express.Router();

const fetchCategories = asyncHandler(async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        SubCategories: true,
      },
    });

    res.status(200).json({ categories: categories });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const fetchProductsFromCategories = asyncHandler(async (req, res) => {
  const { page, limit } = req.body;

  try {
    const categories = await prisma.category.findMany({
      skip: (page - 1) * limit,
      take: limit,
      include: {
        Products: {
          where: { stock: { gt: 0 } },
          select: {
            barcode: true,
            nameTm: true,
            nameRu: true,
            Status: true,
            sellPrice: true,
            images: true,
            categoryId: true,
          },
        },
      },
    });

    res.status(200).json({
      categories,
      pagination: {
        currentPage: page,
        totalPages:
          categories.length === 0 ? 1 : Math.ceil(categories.length / limit),
      },
    });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const fetchById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        SubCategories: true,
        Products: {
          where: { stock: { gt: 0 } },
          select: {
            barcode: true,
            nameTm: true,
            nameRu: true,
            Status: true,
            sellPrice: true,
            images: true,
          },
        },
      },
    });

    return category
      ? res.status(200).send(category)
      : res.status(404).json({ message: "Категория не найдена." });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const newCategory = asyncHandler(async (req, res) => {
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

    await prisma.category.create({
      data: { nameTm, nameRu },
    });

    res.status(201).json({ message: "Категория создана." });
  } catch (err) {
    res.status(500).send("Ошибка при создания категории.");
  }
});

const updateCategory = asyncHandler(async (req, res) => {
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

    await prisma.category.update({
      where: { id },
      data: { nameTm, nameRu },
    });
    res.status(201).json({ message: "Категория обновлена." });
  } catch (err) {
    res.status(500).send("Ошибка при обновления категории.");
  }
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.category.delete({
      where: { id },
    });

    res.status(200).json({ message: "Категория удалена." });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(409).json({
        message: "Категория не найдена.",
      });
    } else {
      res.status(500).send("Ошибка при удалении категории.");
    }
  }
});

router.get("/fetch/all", fetchCategories);
router.post("/fetch/withproducts", fetchProductsFromCategories);
router.get("/fetch/single/:id", fetchById);
router.post("/new/", newCategory);
router.patch("/update/:id", updateCategory);
router.delete("/delete/:id", deleteCategory);

export default router;
