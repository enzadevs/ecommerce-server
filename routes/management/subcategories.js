import express from "express";
import { prisma } from "../../exportprisma.js";
import { asyncHandler } from "../../utils.js";

const router = express.Router();

const fetchSubCategories = asyncHandler(async (req, res) => {
  try {
    const subCategories = await prisma.subCategory.findMany();

    res.status(200).json({ subCategories: subCategories });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const fetchProductsFromSubCategories = asyncHandler(async (req, res) => {
  const { page, limit } = req.body;

  try {
    const products = await prisma.subCategory.findMany({
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
          },
        },
      },
    });

    res.status(200).json({
      products,
      pagination: {
        currentPage: page,
        totalPages:
          products.length === 0 ? 1 : Math.ceil(products.length / limit),
      },
    });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const fetchById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const subCategory = await prisma.subCategory.findUnique({
      where: { id },
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
          },
        },
      },
    });

    return subCategory
      ? res.status(200).send({ result: subCategory })
      : res.status(404).json({ message: "Подкатегория не найдена." });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const newSubCategory = asyncHandler(async (req, res) => {
  const { nameTm, nameRu, categoryId } = req.body;

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

    await prisma.subCategory.create({
      data: {
        nameTm,
        nameRu,
        Category: {
          connect: {
            id: categoryId,
          },
        },
      },
    });

    res.status(201).json({ message: "Подкатегория создана." });
  } catch (err) {
    res.status(500).send("Ошибка при создания подкатегории.");
  }
});

const updateSubCategory = asyncHandler(async (req, res) => {
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

    await prisma.subCategory.update({
      where: { id },
      data: { nameTm, nameRu },
    });
    res.status(201).json({ message: "Подкатегория обновлена." });
  } catch (err) {
    res.status(500).send("Ошибка при обновления подкатегории.");
  }
});

const deleteSubCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.subCategory.delete({
      where: { id },
    });

    res.status(200).json({ message: "Подкатегория удалена." });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(409).json({
        message: "Подкатегория не найдена.",
      });
    } else {
      res.status(500).send("Ошибка при удалении подкатегории.");
    }
  }
});

router.get("/fetch/all", fetchSubCategories);
router.post("/fetch/withproducts", fetchProductsFromSubCategories);
router.get("/fetch/single/:id", fetchById);
router.post("/new/", newSubCategory);
router.patch("/update/:id", updateSubCategory);
router.delete("/delete/:id", deleteSubCategory);

export default router;
