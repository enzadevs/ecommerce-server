import express from "express";
import { extname } from "path";
import { prisma } from "../../exportprisma.js";
import { multerStorage } from "../../utils.js";
import { asyncHandler, timeFormat } from "../../utils.js";

const router = express.Router();
const storage = multerStorage.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/ads/");
  },
  filename: (req, file, cb) => {
    const fileExtension = extname(file.originalname);
    cb(null, `${Date.now()}${fileExtension}`);
  },
});
const upload = multerStorage({ storage: storage });

const fetchAllAds = asyncHandler(async (req, res) => {
  try {
    const ads = await prisma.advertisement.findMany({
      orderBy: { updatedAt: "desc" },
    });

    const formattedAds = ads.map((ad) => {
      const formattedStartDate = new Date(ad.startDate).toLocaleString(
        "en-Us",
        timeFormat
      );
      const formattedEndDate = new Date(ad.endDate).toLocaleString(
        "en-Us",
        timeFormat
      );
      const formattedCreatedAt = new Date(ad.createdAt).toLocaleString(
        "en-Us",
        timeFormat
      );
      const formattedUpdatedAt = new Date(ad.updatedAt).toLocaleString(
        "en-Us",
        timeFormat
      );

      return {
        ...ad,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        createdAt: formattedCreatedAt,
        updatedAt: formattedUpdatedAt,
      };
    });

    res.status(200).json({ ads: formattedAds });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const fetchActiveAds = asyncHandler(async (req, res) => {
  const today = new Date();

  try {
    const ads = await prisma.advertisement.findMany({
      where: {
        AND: [{ startDate: { lte: today } }, { endDate: { gte: today } }],
      },
      orderBy: { updatedAt: "desc" },
    });

    const formattedAds = ads.map((ad) => {
      const formattedStartDate = new Date(ad.startDate).toLocaleString(
        "en-Us",
        timeFormat
      );
      const formattedEndDate = new Date(ad.endDate).toLocaleString(
        "en-Us",
        timeFormat
      );
      const formattedCreatedAt = new Date(ad.createdAt).toLocaleString(
        "en-Us",
        timeFormat
      );
      const formattedUpdatedAt = new Date(ad.updatedAt).toLocaleString(
        "en-Us",
        timeFormat
      );

      return {
        ...ad,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        createdAt: formattedCreatedAt,
        updatedAt: formattedUpdatedAt,
      };
    });

    res.status(200).json({ ads: formattedAds });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const fetchAdById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const ad = await prisma.advertisement.findUnique({
      where: { id: Number(id) },
    });

    if (!ad) {
      return res.status(404).json({ message: "Реклама не найдена." });
    }

    res.status(200).json(ad);
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const newAd = asyncHandler(async (req, res) => {
  const { description, incomeValue, startDate, endDate } = req.body;

  try {
    if (!description || !incomeValue || !startDate || !endDate) {
      return res
        .status(400)
        .send("Ошибка запроса. Неправильный формат запроса.");
    }

    await prisma.advertisement.create({
      data: {
        description,
        incomeValue: Number(incomeValue),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        posterImage: req.file?.path.replace(/\\/g, "/"),
      },
    });

    res.status(201).json({ message: "Реклама успешно создана." });
  } catch (err) {
    res.status(500).send("Ошибка при создании рекламы.");
  }
});

const updateAd = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { description, incomeValue, startDate, endDate } = req.body;

  try {
    const existingAd = await prisma.advertisement.findUnique({
      where: { id: Number(id) },
    });

    const newAdData = {
      description: description || existingAd.description,
      incomeValue: incomeValue || existingAd.incomeValue,
      startDate: new Date(startDate) || existingAd.startDate,
      endDate: new Date(endDate) || existingAd.endDate,
    };

    if (req.file) {
      newAdData.posterImage = req.file.path.replace(/\\/g, "/");
    } else {
      newAdData.posterImage = existingAd.posterImage;
    }

    await prisma.advertisement.update({
      where: { id: Number(id) },
      data: newAdData,
    });

    res.status(201).json({ message: "Реклама успешно обновлена." });
  } catch (err) {
    console.log(err);
    res.status(500).send("Ошибка при обновлении рекламы.");
  }
});

const deleteAd = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const ad = await prisma.advertisement.delete({
      where: { id: Number(id) },
    });
    return ad
      ? res.json({ message: "Реклама удалена." })
      : res.status(404).json({ message: "Реклама не найдена." });
  } catch (err) {
    res.status(500).send("Ошибка при удалении рекламы.");
  }
});

router.get("/all", fetchAllAds);
router.get("/active", fetchActiveAds);
router.get("/fetch/:id", fetchAdById);
router.post("/new", upload.single("posterImage"), newAd);
router.patch("/update/:id", upload.single("posterImage"), updateAd);
router.delete("/delete/:id", deleteAd);

export default router;
