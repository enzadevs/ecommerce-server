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

router.post("/insert/", insertProducts);
router.get("/export/", exportProducts);
router.post("/updatestock/", updateStock);

export default router;
