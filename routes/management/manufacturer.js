import express from "express";
import { extname } from "path";
import { prisma } from "../../exportprisma.js";
import { multerStorage } from "../../utils.js";
import { asyncHandler, timeFormat } from "../../utils.js";

const router = express.Router();
const storage = multerStorage.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/manufacturers/");
  },
  filename: (req, file, cb) => {
    const fileExtension = extname(file.originalname);
    cb(null, `${Date.now()}${fileExtension}`);
  },
});
const upload = multerStorage({ storage: storage });

const fetchManufacturers = asyncHandler(async (req, res) => {
  const { page, limit } = req.body;

  try {
    const manufacturerCount = await prisma.manufacturer.count();
    const totalPages = Math.ceil(manufacturerCount / limit);
    const currentPage = Math.max(1, Math.min(page, totalPages));

    const manufacturers = await prisma.manufacturer.findMany({
      skip: (currentPage - 1) * limit,
      take: limit,
      orderBy: { updatedAt: "desc" },
    });

    const formattedManufacturers = manufacturers.map((manufacturer) => {
      const formattedCreatedAt = new Date(
        manufacturer.createdAt
      ).toLocaleString("en-US", timeFormat);

      const formattedUpdatedAt = new Date(
        manufacturer.updatedAt
      ).toLocaleString("en-US", timeFormat);

      return {
        ...manufacturer,
        createdAt: formattedCreatedAt,
        updatedAt: formattedUpdatedAt,
      };
    });

    res.status(200).json({
      manufacturers: formattedManufacturers,
      pagination: {
        currentPage,
        totalPages,
      },
    });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const fetchAllManufacturers = asyncHandler(async (req, res) => {
  try {
    const manufacturers = await prisma.manufacturer.findMany({
      orderBy: { updatedAt: "desc" },
    });

    const formattedManufacturers = manufacturers.map((manufacturer) => {
      const formattedCreatedAt = new Date(
        manufacturer.createdAt
      ).toLocaleString("en-US", timeFormat);

      const formattedUpdatedAt = new Date(
        manufacturer.updatedAt
      ).toLocaleString("en-US", timeFormat);

      return {
        ...manufacturer,
        createdAt: formattedCreatedAt,
        updatedAt: formattedUpdatedAt,
      };
    });

    res.status(200).json({
      manufacturers: formattedManufacturers,
    });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const sendManufacturersToClient = asyncHandler(async (req, res) => {
  try {
    const manufacturers = await prisma.manufacturer.findMany({
      select: {
        id: true,
        name: true,
        logo: true,
      },
    });
    res.status(200).json({ manufacturers: manufacturers });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const fetchById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const manufacturer = await prisma.manufacturer.findUnique({
      where: { id },
      include: {
        Products: {
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

    if (!manufacturer) {
      return res.status(404).json({ message: "Бренд не найден." });
    }

    const formattedCreatedAt = new Date(manufacturer.createdAt).toLocaleString(
      "en-US",
      timeFormat
    );
    const formattedUpdatedAt = new Date(manufacturer.updatedAt).toLocaleString(
      "en-US",
      timeFormat
    );

    const formattedManufacturer = {
      ...manufacturer,
      createdAt: formattedCreatedAt,
      updatedAt: formattedUpdatedAt,
    };

    res.status(200).json(formattedManufacturer);
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const newManufacturer = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const logo = req.file?.path?.replace(/\\/g, "/");

  try {
    if (!name || typeof name !== "string") {
      return res.status(400).send("Ошибка запроса.");
    }

    await prisma.manufacturer.create({
      data: {
        name,
        logo: logo || "",
      },
    });

    res.status(201).json({ message: "Бренд успешно создан." });
  } catch (err) {
    console.log(err);
    res.status(500).send("Ошибка при создании бренда.");
  }
});

const updateManufacturer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  const logo = req.file?.path?.replace(/\\/g, "/");

  try {
    if (!name || typeof name !== "string") {
      return res.status(400).send("Ошибка запроса.");
    }

    const existingManufacturer = await prisma.manufacturer.findUnique({
      where: { id },
    });

    if (!existingManufacturer) {
      return res.status(404).json({ message: "Бренд не найден." });
    }

    const updatedManufacturerData = {
      name: name || existingManufacturer.name,
      logo: logo || existingManufacturer.logo,
    };

    await prisma.manufacturer.update({
      where: { id },
      data: updatedManufacturerData,
    });

    return res.status(201).json({ message: "Бренд обновлен." });
  } catch (err) {
    res.status(500).send("Ошибка при обновлении бренда.");
  }
});

const deleteManufacturer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const brand = await prisma.manufacturer.delete({
      where: { id },
    });
    return brand
      ? res.json({ message: "Бренд удален." })
      : res.status(404).json({ message: "Бренд не найден." });
  } catch (err) {
    res.status(500).send("Ошибка при создании бренда.");
  }
});

router.post("/fetch/admin/", fetchManufacturers);
router.get("/fetch/all/", fetchAllManufacturers);
router.get("/fetch/client/", sendManufacturersToClient);
router.get("/fetch/single/:id", fetchById);
router.post("/new/", upload.single("logo"), newManufacturer);
router.patch("/update/:id", upload.single("logo"), updateManufacturer);
router.delete("/delete/:id", deleteManufacturer);

export default router;
