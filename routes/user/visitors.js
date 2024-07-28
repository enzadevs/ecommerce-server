import express from "express";
import { prisma } from "../../exportprisma.js";
import { asyncHandler, timeFormat } from "../../utils.js";

const router = express.Router();

const todaysCount = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const todaysVisitorsCount = await prisma.visitor.count({
      where: { createdAt: { gte: today } },
    });

    res.status(200).json(todaysVisitorsCount);
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const fetchAll = asyncHandler(async (req, res) => {
  const visitors = await prisma.visitor.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  try {
    const formattedVisitors = visitors.map((visitor) => {
      const formattedCreatedAt = new Date(visitor.createdAt).toLocaleString(
        "en-US",
        timeFormat
      );

      return {
        ...visitor,
        createdAt: formattedCreatedAt,
      };
    });

    res.status(200).json({ visitors: formattedVisitors });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const currentMonth = asyncHandler(async (req, res) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const year = today.getFullYear();

  const daysInCurrentMonth = new Date(year, currentMonth + 1, 0).getDate();

  const visitorCountsByType = Array.from(
    { length: daysInCurrentMonth },
    () => ({
      day: null,
      true: 0,
      false: 0,
    })
  );

  try {
    const visitors = await prisma.visitor.findMany();
    for (const visitor of visitors) {
      const visitorDate = visitor.createdAt;
      const visitorMonth = visitorDate.getMonth();
      const visitorYear = visitorDate.getFullYear();

      if (visitorMonth === currentMonth && visitorYear === year) {
        const visitorDay = visitorDate.getDate() - 1;
        visitorCountsByType[visitorDay][visitor.type ? "true" : "false"]++;
      }
    }

    visitorCountsByType.forEach((dayData, index) => {
      dayData.day = index + 1;
    });

    const response = {
      daysOfMonth: visitorCountsByType.map((dayData) => dayData.day),
      series: visitorCountsByType.map((dayData) => ({
        true: dayData.true,
        false: dayData.false,
      })),
      formattedVisitors: visitors.map((visitor) => {
        const formattedCreatedAt = new Date(visitor.createdAt).toLocaleString(
          "en-US",
          timeFormat
        );

        return {
          ...visitor,
          createdAt: formattedCreatedAt,
        };
      }),
    };

    res.status(200).json(response);
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const newUserOrVisitor = asyncHandler(async (req, res) => {
  const { boolean } = req.body;

  await prisma.visitor.create({
    data: {
      type: boolean,
    },
  });

  res.status(201).json({ message: "Success" });
});

router.get("/visitors/today", todaysCount);
router.get("/visitors/all", fetchAll);
router.get("/visitors/currentmonth", currentMonth);
router.post("/visitors/new/", newUserOrVisitor);

export default router;
