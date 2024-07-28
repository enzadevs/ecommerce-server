import express from "express";
import { extname } from "path";
import { prisma } from "../../exportprisma.js";
import { multerStorage } from "../../utils.js";
import { asyncHandler, timeFormat } from "../../utils.js";

const router = express.Router();
const storage = multerStorage.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/products/");
  },
  filename: (req, file, cb) => {
    const fileExtension = extname(file.originalname);
    cb(null, `${Date.now()}${fileExtension}`);
  },
});
const upload = multerStorage({ storage: storage });

const fetchProducts = asyncHandler(async (req, res) => {
  const { page, limit } = req.body;

  try {
    const productCount = await prisma.product.count();
    const totalPages = Math.ceil(productCount / limit);
    const currentPage = Math.max(1, Math.min(page, totalPages));

    const products = await prisma.product.findMany({
      skip: (currentPage - 1) * limit,
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        barcode: true,
        nameRu: true,
        unitPrice: true,
        sellPrice: true,
        stock: true,
        images: true,
        createdAt: true,
        Manufacturer: {
          select: {
            name: true,
          },
        },
        Category: {
          select: {
            nameRu: true,
          },
        },
        SubCategory: {
          select: {
            nameRu: true,
          },
        },
        Unit: {
          select: {
            nameRu: true,
          },
        },
        Status: {
          select: {
            nameRu: true,
          },
        },
      },
    });

    const formattedProducts = products.map((product) => {
      const formattedCreatedAt = new Date(product.createdAt).toLocaleString(
        "en-US",
        timeFormat
      );

      return {
        ...product,
        createdAt: formattedCreatedAt,
      };
    });

    res.status(200).json({
      products: formattedProducts,
      pagination: {
        currentPage,
        totalPages,
      },
    });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const sendProductsToClient = asyncHandler(async (req, res) => {
  const { limit } = req.body;

  try {
    const products = await prisma.product.findMany({
      where: {
        stock: { gt: 0 },
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        barcode: true,
        nameTm: true,
        nameRu: true,
        sellPrice: true,
        images: true,
        Status: true,
      },
    });

    res.status(200).json({ products: products });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const sendProductsFromCategories = asyncHandler(async (req, res) => {
  const { limit } = req.body;

  try {
    const products = await prisma.category.findMany({
      include: {
        Products: {
          where: { stock: { gt: 0 } },
          take: limit,
          select: {
            barcode: true,
            nameTm: true,
            nameRu: true,
            sellPrice: true,
            images: true,
            Status: true,
          },
        },
      },
    });

    res.status(200).json({ products: products });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const fetchBasicInfo = asyncHandler(async (req, res) => {
  const { barcode } = req.params;

  try {
    if (!barcode || typeof barcode !== "string") {
      return res.status(400).send("Ошибка запроса.");
    }

    const product = await prisma.product.findUnique({
      where: { barcode },
      select: {
        id: true,
        barcode: true,
        nameTm: true,
        nameRu: true,
        sellPrice: true,
        stock: true,
        images: true,
        Manufacturer: true,
        Category: true,
        SubCategory: true,
        Unit: true,
        Status: true,
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Товар не найден." });
    }

    res.status(200).json(product);
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const fetchDetailedInfo = asyncHandler(async (req, res) => {
  const { barcode } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { barcode },
      include: {
        Manufacturer: true,
        Category: true,
        SubCategory: true,
        Unit: true,
        Status: true,
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Товар не найден." });
    }

    const formattedCreatedAt = new Date(product.createdAt).toLocaleString(
      "en-US",
      timeFormat
    );
    const formattedUpdatedAt = new Date(product.updatedAt).toLocaleString(
      "en-US",
      timeFormat
    );

    const formattedProduct = {
      ...product,
      createdAt: formattedCreatedAt,
      updatedAt: formattedUpdatedAt,
    };

    res.status(200).json(formattedProduct);
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const searchProductByName = asyncHandler(async (req, res) => {
  const { query } = req.params;

  try {
    if (!query || typeof query !== "string") {
      return res.status(400).send("Ошибка запроса.");
    }

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { nameTm: { contains: query, mode: "insensitive" } },
          { nameRu: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        barcode: true,
        nameTm: true,
        nameRu: true,
        sellPrice: true,
        images: true,
      },
    });

    if (products.length === 0) {
      return res.status(404).json({ message: "Товары не были найдены." });
    }

    res.status(200).json({ results: products });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const newProduct = asyncHandler(async (req, res) => {
  const {
    barcode,
    nameTm,
    nameRu,
    unitPrice,
    sellPrice,
    stock,
    descriptionTm,
    descriptionRu,
    statusId,
    manufacturerId,
    categoryId,
    subCategoryId,
    unitId,
  } = req.body;

  try {
    if (
      !barcode ||
      typeof barcode !== "string" ||
      !nameTm ||
      typeof nameTm !== "string" ||
      !nameRu ||
      typeof nameRu !== "string"
    ) {
      return res.status(400).json({
        message: "Ошибка запроса.",
      });
    }

    const images = req.files?.map((file) => file.path.replace(/\\/g, "/"));

    await prisma.product.create({
      data: {
        barcode,
        nameTm,
        nameRu,
        unitPrice: parseFloat(unitPrice),
        sellPrice: parseFloat(sellPrice),
        stock: parseFloat(stock),
        descriptionTm,
        descriptionRu,
        Manufacturer: {
          connect: { id: manufacturerId },
        },
        Category: {
          connect: { id: categoryId },
        },
        SubCategory: {
          connect: { id: subCategoryId },
        },
        Unit: {
          connect: { id: Number(unitId) },
        },
        Status: {
          connect: { id: Number(statusId) },
        },
        images: images || [],
      },
    });

    res.status(201).json({
      message: "Товар успешно создан.",
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({
        message: "Товар с таким баркодом уже существует.",
      });
    } else {
      res.status(500).json({ message: "Ошибка при добавлении товара." });
    }
  }
});

const updateProduct = asyncHandler(async (req, res) => {
  const { barcode } = req.params;

  const {
    newBarcode,
    nameTm,
    nameRu,
    unitPrice,
    sellPrice,
    stock,
    descriptionTm,
    descriptionRu,
    statusId,
    manufacturerId,
    categoryId,
    subCategoryId,
    unitId,
  } = req.body;

  try {
    if (!newBarcode || typeof newBarcode !== "string") {
      return res.status(400).json({
        message: "Ошибка запроса.",
      });
    }
    const existingProduct = await prisma.product.findUnique({
      where: { barcode },
      include: {
        Manufacturer: true,
        Category: true,
        SubCategory: true,
        Unit: true,
        Status: true,
      },
    });

    const updatedProductData = {
      barcode: newBarcode || existingProduct.barcode,
      nameRu: nameRu || existingProduct.nameRu,
      nameTm: nameTm || existingProduct.nameTm,
      unitPrice: parseFloat(unitPrice) || existingProduct.unitPrice,
      sellPrice: parseFloat(sellPrice) || existingProduct.sellPrice,
      stock: parseFloat(stock) || existingProduct.stock,
      Manufacturer: {
        connect: { id: manufacturerId || existingProduct.manufacturerId },
      },
      descriptionTm: descriptionTm || existingProduct.descriptionTm,
      descriptionRu: descriptionRu || existingProduct.descriptionRu,
      images:
        req.files && req.files.length > 0
          ? req.files.map((file) => file.path.replace(/\\/g, "/"))
          : existingProduct.images,
      Category: {
        connect: { id: categoryId || existingProduct.categoryId },
      },
      SubCategory: {
        connect: {
          id: subCategoryId || existingProduct.subCategoryId,
        },
      },
      Unit: {
        connect: { id: Number(unitId) || existingProduct.unitType.id },
      },
      Status: {
        connect: { id: parseFloat(statusId) || existingProduct.statusId },
      },
    };

    await prisma.product.update({
      where: { barcode },
      data: updatedProductData,
    });

    res.status(201).json({
      message: "Товар успешно обновлен.",
    });
  } catch (err) {
    res.status(500).json({ message: "Ошибка при обнолении товара." });
  }
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.product.delete({
      where: { id },
    });

    res.status(200).json({ message: "Товар удален." });
  } catch (error) {
    if (error.code === "P2025") {
      res.status(404).json({ message: "Товар не найден." });
    } else {
      res
        .status(500)
        .json({ message: "Произошла ошибка при удалении товара." });
    }
  }
});

router.post("/fetch/admin/", fetchProducts);
router.post("/fetch/client/", sendProductsToClient);
router.post("/fetch/client/categories/", sendProductsFromCategories);
router.get("/fetch/:barcode", fetchBasicInfo);
router.get("/fetch/details/:barcode", fetchDetailedInfo);
router.get("/search/:query", searchProductByName);
router.post("/new/", upload.array("productImages", 5), newProduct);
router.patch(
  "/update/:barcode",
  upload.array("productImages", 5),
  updateProduct
);
router.delete("/delete/:id", deleteProduct);

export default router;
