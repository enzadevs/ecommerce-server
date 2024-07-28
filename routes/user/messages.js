import express from "express";
import { prisma } from "../../exportprisma.js";
import { asyncHandler, timeFormat } from "../../utils.js";

const router = express.Router();

const sendMessage = asyncHandler(async (req, res) => {
  const { text, senderId, receiverId } = req.body;

  try {
    if (!text || !senderId || !receiverId) {
      return res.status(400).send("Ошибка запроса.");
    }

    await prisma.message.create({
      data: {
        text,
        senderId,
        receiverId,
      },
    });

    res.status(201).json({
      message: "Сообщение отправлено.",
    });
  } catch (err) {
    res.status(500).send("Ошибка при отправлении сообщения.");
  }
});

const getMessages = asyncHandler(async (req, res) => {
  const { receiverId } = req.body;

  try {
    if (!receiverId) {
      return res.status(400).send("Ошибка запроса.");
    }

    const recievedMessages = await prisma.message.findMany({
      where: { receiverId },
      include: {
        Sender: {
          select: {
            id: true,
            phoneNumber: true,
            firstName: true,
          },
        },
      },
    });

    const formattedMessages = recievedMessages.map((message) => {
      const formattedCreatedAt = new Date(message.createdAt).toLocaleString(
        "en-US",
        timeFormat
      );

      return {
        ...message,
        createdAt: formattedCreatedAt,
      };
    });

    res.status(200).json({ messages: formattedMessages });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

const deleteMessage = asyncHandler(async (req, res) => {
  const { id, senderId } = req.params;

  try {
    if (!id || !senderId) {
      return res.status(400).send("Ошибка запроса.");
    }

    const deletedMessage = await prisma.message.delete({
      where: { id: parseFloat(id), senderId },
    });

    if (!deletedMessage) {
      return res.status(404).send("Сообщение не найдено.");
    }

    res.status(200).json({ message: "Сообщение удалено." });
  } catch (err) {
    res.status(500).send("Ошибка при удалении сообщения.");
  }
});

router.post("/messages/send", sendMessage);
router.post("/messages/check", getMessages);
router.delete("/messages/delete/:senderId/:id", deleteMessage);

export default router;
