import express from "express";
import { prisma } from "../../exportprisma.js";
import { multerStorage } from "../../utils.js";
import { asyncHandler, timeFormat } from "../../utils.js";

const router = express.Router();
const storage = multerStorage.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/notification/");
  },
  filename: (req, file, cb) => {
    const fileExtension = extname(file.originalname);
    cb(null, `${Date.now()}${fileExtension}`);
  },
});
const upload = multerStorage({ storage: storage });

const newNotification = asyncHandler(async (req, res) => {
  const { type, text, productUrl } = req.body;

  try {
    if (!type || !text || !productUrl) {
      return res
        .status(400)
        .send("Ошибка запроса. Неправильный формат запроса.");
    }

    await prisma.notification.create({
      data: {
        type,
        text,
        productUrl,
        imageUrl: req.file.path.replace(/\\/g, "/"),
      },
    });

    res.status(201).json({ message: "Объявление успещно создано." });
  } catch (err) {
    res.status(500).send("Ошибка при создании объявлении.");
  }
});

const updateNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type, text, productUrl } = req.body;

  try {
    if (!type || !text || !productUrl) {
      return res
        .status(400)
        .send("Ошибка запроса. Неправильный формат запроса.");
    }

    const existingNotification = await prisma.notification.findUnique({
      where: { id: Number(id) },
    });

    const updatedNotificationData = {
      type: type || existingNotification.type,
      text: text || existingNotification.text,
      productUrl: productUrl || existingNotification.productUrl,
    };

    if (req.file) {
      updatedNotificationData.imageUrl = req.file.path.replace(/\\/g, "/");
    } else {
      updatedNotificationData.imageUrl = existingNotification.imageUrl;
    }

    await prisma.notification.create({
      where: { id: Number(id) },
      data: updatedNotificationData,
    });

    res.status(201).json({ message: "Объявление успешно обновлено." });
  } catch (err) {
    res.status(500).send("Ошибка при обновлении.");
  }
});

router.post("/new", upload.single("posterImage"), newNotification);
router.patch("/update/:id", upload.single("posterImage"), updateNotification);

export default router;
