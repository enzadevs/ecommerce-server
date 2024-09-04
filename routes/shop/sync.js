import express from "express";
import { asyncHandler } from "../../utils.js";
import { prisma } from "../../exportprisma.js";

const router = express.Router();

const insertProducts = asyncHandler(async (req, res) => {
  const { products } = req.body;
  const BATCH_SIZE = 1000;

  try {
    let insertedCount = 0;
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(
        i,
        Math.min(i + BATCH_SIZE, products.length)
      );
      const mappedProducts = batch.map((product) => ({
        id: String(product.product_id),
        barcode: product.barcode,
        nameTm: product.name_tm,
        nameRu: product.name_ru,
        unitPrice: 0,
        sellPrice: product.price,
        stock: product.stock,
        images: [product.img],
        descriptionTm: product.note_tm,
        descriptionRu: product.note_ru,
      }));
      await prisma.product.createMany({
        data: mappedProducts,
        skipDuplicates: true,
      });
      insertedCount += mappedProducts.length;
    }

    res.status(200).send(`Успешно добавлено ${insertedCount} товаров!`);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

const exportProducts = asyncHandler(async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        barcode: true,
        stock: true,
        sellPrice: true,
      },
    });

    res.status(200).json(products);
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

function flattenArray(arr) {
  return arr.reduce(
    (flat, toFlatten) =>
      flat.concat(
        Array.isArray(toFlatten) ? flattenArray(toFlatten) : toFlatten
      ),
    []
  );
}

const BATCH_SIZE = 250;

const updateStock = asyncHandler(async (req, res) => {
  const nestedArr = req.body.productsList;
  const arr = flattenArray(nestedArr);

  try {
    const updatedProducts = [];

    for (let i = 0; i < arr.length; i += BATCH_SIZE) {
      const batch = arr.slice(i, i + BATCH_SIZE);
      const updatePromises = batch.map(async (newProduct) => {
        const barcode = newProduct["BAR KOD"];
        const stock = newProduct["Mukdary"];
        const sellPrice = newProduct["Satyş bahasy"];

        if (barcode === undefined) {
          // console.log(`Skipping product with missing barcode: ${newProduct}`);
          return null;
        }

        const parsedStock = isNaN(parseFloat(stock)) ? 0 : parseFloat(stock);
        const parsedSellPrice = isNaN(parseFloat(sellPrice))
          ? 0
          : parseFloat(sellPrice);

        return prisma.product.updateMany({
          where: { barcode },
          data: {
            stock: parsedStock,
            sellPrice: parsedSellPrice,
          },
        });
      });

      const batchUpdates = await Promise.all(updatePromises.filter(Boolean));
      updatedProducts.push(...batchUpdates);
    }

    if (!updatedProducts.length) {
      return res.status(200).json({
        message: "Ничего не было изменено.",
        updatedProducts: [],
      });
    } else {
      res.status(200).json({
        message: "Синхронизация прошла успешно.",
        updatedProducts,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Ошибка при синхронизации данных.");
  }
});

const currentToken =
  "mxtmIEpgVe0BxOFAwcyvMXjoqpRVLdrUjcKli6HjjJEqi08dsMEqDILRaWI5auyB";

const syncProducts = asyncHandler(async (req, res) => {
  const { token, products } = req.body;
  const BATCH_SIZE = 1000;

  try {
    if (token !== currentToken) {
      return res.status(200).send({ message: `Вы не авторизированы.` });
    }

    const productBarcodes = products.map((product) => product.barcode);
    const existingProducts = await prisma.product.findMany({
      where: {
        barcode: { in: productBarcodes },
      },
    });

    const existingBarcodes = new Set(
      existingProducts.map((product) => product.barcode)
    );
    const productsToCreate = [];
    const productsToUpdate = [];
    const productsToDelete = [];

    for (const product of products) {
      if (existingBarcodes.has(product.barcode)) {
        productsToUpdate.push(product);
      } else {
        productsToCreate.push(product);
      }
    }

    const barcodesToKeep = new Set(products.map((product) => product.barcode));
    for (const existingProduct of existingProducts) {
      if (!barcodesToKeep.has(existingProduct.barcode)) {
        productsToDelete.push(existingProduct.id);
      }
    }

    for (let i = 0; i < productsToCreate.length; i += BATCH_SIZE) {
      const batch = productsToCreate.slice(i, i + BATCH_SIZE);
      const mappedProducts = batch.map((product) => ({
        id: String(product.id),
        barcode: product.barcode,
        nameTm: product.name,
        nameRu: " ",
        unitPrice: product.unitPrice,
        sellPrice: product.sellingPrice,
        stock: product.quantity,
        unitId: product.unitId,
      }));
      await prisma.product.createMany({
        data: mappedProducts,
        skipDuplicates: true,
      });
    }

    for (let i = 0; i < productsToUpdate.length; i += BATCH_SIZE) {
      const batch = productsToUpdate.slice(i, i + BATCH_SIZE);
      const updatePromises = batch.map((product) => {
        return prisma.product.update({
          where: { barcode: product.barcode },
          data: {
            nameTm: product.name,
            stock: product.quantity,
            unitId: product.unitId,
          },
        });
      });
      await Promise.all(updatePromises);
    }

    for (let i = 0; i < productsToDelete.length; i += BATCH_SIZE) {
      const batch = productsToDelete.slice(i, i + BATCH_SIZE);
      await prisma.product.deleteMany({
        where: {
          id: { in: batch },
        },
      });
    }

    res.status(200).send({
      message: `Синхронизация завершена: ${productsToCreate.length} добавлено, ${productsToUpdate.length} обновлено, ${productsToDelete.length} удалено.`,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Ошибка при синхронизации данных.");
  }
});

router.post("/insert/", insertProducts);
router.get("/export/", exportProducts);
router.post("/updatestock/", updateStock);
router.put("/products", syncProducts);

export default router;
