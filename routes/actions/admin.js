import express from "express";
import { prisma } from "../../exportprisma.js";
import { asyncHandler, timeFormat } from "../../utils.js";

const router = express.Router();

const fetchAllOrders = asyncHandler(async (req, res) => {
  const { page, limit } = req.body;

  try {
    const ordersCount = await prisma.order.count();
    const totalPages = Math.ceil(ordersCount / limit);
    const currentPage = Math.max(1, Math.min(page, totalPages));

    const orders = await prisma.order.findMany({
      skip: (currentPage - 1) * limit,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        Customer: {
          select: {
            firstName: true,
            phoneNumber: true,
            address: true,
          },
        },
        OrderItems: true,
        PaymentType: true,
        DeliveryType: true,
        OrderStatus: true,
      },
    });

    const formattedOrders = orders.map((order) => {
      const formattedCreatedAt = new Date(order.createdAt).toLocaleString(
        "en-US",
        timeFormat
      );

      const formattedUpdatedAt = new Date(order.updatedAt).toLocaleString(
        "en-US",
        timeFormat
      );

      return {
        ...order,
        createdAt: formattedCreatedAt,
        updatedAt: formattedUpdatedAt,
      };
    });
    res.status(200).json({
      orders: formattedOrders,
      pagination: {
        currentPage,
        totalPages,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Ошибка при получении данных." });
  }
});

const fetchActiveOrders = asyncHandler(async (req, res) => {
  const { page, limit } = req.body;

  try {
    const ordersCount = await prisma.order.count();
    const totalPages = Math.ceil(ordersCount / limit);
    const currentPage = Math.max(1, Math.min(page, totalPages));

    const orders = await prisma.order.findMany({
      where: {
        OrderStatus: {
          id: Number(!3),
        },
      },
      skip: (currentPage - 1) * limit,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        Customer: {
          select: {
            firstName: true,
            phoneNumber: true,
            address: true,
          },
        },
        OrderItems: true,
        PaymentType: true,
        DeliveryType: true,
        OrderStatus: true,
      },
    });

    const formattedOrders = orders.map((order) => {
      const formattedCreatedAt = new Date(order.createdAt).toLocaleString(
        "en-US",
        timeFormat
      );

      const formattedUpdatedAt = new Date(order.updatedAt).toLocaleString(
        "en-US",
        timeFormat
      );

      return {
        ...order,
        createdAt: formattedCreatedAt,
        updatedAt: formattedUpdatedAt,
      };
    });
    res.status(200).json({
      orders: formattedOrders,
      pagination: {
        currentPage,
        totalPages,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Ошибка при получении данных." });
  }
});

const newOrder = asyncHandler(async (req, res) => {
  const {
    customerId,
    phoneNumber,
    address,
    comment,
    sum,
    orderItems,
    paymentTypeId,
    deliveryTypeId,
    orderStatusId,
    shoppingCartId,
  } = req.body;

  try {
    if (!phoneNumber || typeof phoneNumber !== "string") {
      return res.status(400).json({
        message: "Ошибка запроса.",
      });
    }

    const productsArray = orderItems.map((product) => ({
      barcode: product.barcode ? product.barcode : undefined,
      quantity: product.quantity || 1,
    }));

    const prisma$ = prisma.$transaction([
      prisma.order.create({
        data: {
          Customer: { connect: { id: customerId } },
          phoneNumber,
          address,
          comment,
          sum,
          PaymentType: { connect: { id: Number(paymentTypeId) } },
          DeliveryType: { connect: { id: Number(deliveryTypeId) } },
          OrderStatus: { connect: { id: Number(orderStatusId) } },
          OrderItems: {
            create: productsArray,
          },
        },
      }),
      ...productsArray.map((product) =>
        prisma.product.update({
          where: { barcode: product.barcode },
          data: {
            stock: {
              decrement: product.quantity,
            },
          },
        })
      ),
    ]);

    const [order] = await prisma$;

    await prisma.shoppingCart.update({
      where: { id: Number(shoppingCartId) },
      data: {
        ProductsList: { deleteMany: {} },
      },
    });

    res.status(201).json({ message: "Заказ был сделан.", order });
  } catch (error) {
    res.status(500).json({ message: "Ошибка при создании заказа." });
  }
});

const fetchOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: {
        Customer: {
          select: {
            phoneNumber: true,
            firstName: true,
            address: true,
          },
        },
        OrderItems: {
          include: {
            Product: {
              select: {
                barcode: true,
                nameTm: true,
                nameRu: true,
                sellPrice: true,
                images: true,
              },
            },
          },
        },
        PaymentType: true,
        DeliveryType: true,
        OrderStatus: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Заказ не был найден." });
    }

    const formattedOrder = {
      ...order,
      createdAt: new Date(order.createdAt).toLocaleString("en-US", timeFormat),
      updatedAt: new Date(order.updatedAt).toLocaleString("en-US", timeFormat),
    };

    res.status(200).json({ order: formattedOrder });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Ошибка при получении данных." });
  }
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orderStatusId } = req.body;

  try {
    await prisma.order.update({
      where: { id: Number(id) },
      data: {
        OrderStatus: {
          connect: { id: orderStatusId },
        },
      },
    });

    res.status(201).json({ message: "Статус заказа успешно обновлен." });
  } catch (err) {
    res.status(500).json({ message: "Ошибка при изменении статуса заказа." });
  }
});

const fetchTodaysOrders = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const todaysOrders = await prisma.order.findMany({
      where: {
        AND: [
          {
            createdAt: {
              gte: today,
            },
          },
        ],
      },
      include: {
        OrderItems: {
          include: {
            Product: true,
          },
        },
      },
    });

    const ordersCount = todaysOrders.length;
    let overallSum = 0;

    todaysOrders.forEach((order) => {
      order.OrderItems.forEach((item) => {
        if (item.Product) {
          overallSum += Number(item.quantity) * Number(item.Product.sellPrice);
        }
      });
    });

    res.status(200).json({ ordersCount, overallSum });
  } catch (err) {
    res.status(500).json({ message: "Ошибка при получении данных." });
  }
});

const fetchTodaysRevenue = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const todaysOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: today,
        },
      },
      include: {
        OrderItems: {
          include: {
            Product: true,
          },
        },
      },
    });

    const totalRevenue = todaysOrders.reduce((acc, order) => {
      return (
        acc +
        order.OrderItems.reduce((subAcc, orderItem) => {
          if (
            orderItem.Product &&
            typeof orderItem.Product.sellPrice !== "undefined" &&
            typeof orderItem.Product.unitPrice !== "undefined"
          ) {
            const revenueDifference =
              (orderItem.Product.sellPrice - orderItem.Product.unitPrice) *
              orderItem.quantity;
            return subAcc + revenueDifference;
          } else {
            console.error(
              "Sell price or arrival price is undefined for a product."
            );
            return subAcc;
          }
        }, 0)
      );
    }, 0);

    res.status(200).json({ revenue: totalRevenue });
  } catch (err) {
    res.status(500).json({ message: "Ошибка при получении данных." });
  }
});

const fetchCurrentMonthSales = asyncHandler(async (req, res) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const year = today.getFullYear();
  const daysInCurrentMonth = new Date(year, currentMonth + 1, 0).getDate();

  const dailySales = Array.from({ length: daysInCurrentMonth }, () => 0);
  const dailyProfits = Array.from({ length: daysInCurrentMonth }, () => 0);
  const currentDatePlusOne = today.getDate() + 1;

  try {
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date(year, currentMonth, 1),
          lt: new Date(year, currentMonth, currentDatePlusOne),
        },
      },
      include: {
        OrderItems: {
          select: {
            id: true,
            Product: {
              select: {
                unitPrice: true,
                sellPrice: true,
              },
            },
            quantity: true,
          },
        },
      },
    });

    for (const order of orders) {
      const orderDate = order.createdAt;
      const orderDay = orderDate.getDate() - 1;

      let dailySalesForOrder = 0;
      let dailyProfitForOrder = 0;

      for (const orderItem of order.OrderItems) {
        dailySalesForOrder += orderItem.Product.sellPrice * orderItem.quantity;

        const profitPerItem =
          (orderItem.Product.sellPrice - orderItem.Product.unitPrice) *
          orderItem.quantity;
        dailyProfitForOrder += profitPerItem;
      }

      dailySales[orderDay] += dailySalesForOrder;
      dailyProfits[orderDay] += dailyProfitForOrder;
    }

    const formattedDailySales = dailySales.map((value) =>
      typeof value === "number" ? parseFloat(value.toFixed(2)) : value
    );
    const formattedDailyProfits = dailyProfits.map((value) =>
      typeof value === "number" ? parseFloat(value.toFixed(2)) : value
    );

    res.status(200).json({
      daysOfMonth: Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1),
      series: [
        {
          name: "Сумма",
          data: formattedDailySales,
        },
        {
          name: "Прибыль",
          data: formattedDailyProfits,
        },
      ],
    });
  } catch (error) {
    res.status(500).json({ message: "Ошибка при получении данных о продажах" });
  }
});

// const fetchCurrentMonthSales = asyncHandler(async (req, res) => {
//   const today = new Date();
//   const currentMonth = today.getMonth();
//   const year = today.getFullYear();
//   const currentDate = today.getDate();
//   const daysInCurrentMonth = currentDate;

//   const dailySales = Array.from({ length: daysInCurrentMonth }, () => 0);
//   const dailyProfits = Array.from({ length: daysInCurrentMonth }, () => 0);

//   try {
//     const orders = await prisma.order.findMany({
//       where: {
//         createdAt: {
//           gte: new Date(year, currentMonth, 1),
//           lt: new Date(year, currentMonth, currentDate + 1),
//         },
//       },
//       include: {
//         OrderItems: {
//           select: {
//             id: true,
//             Product: {
//               select: {
//                 unitPrice: true,
//                 sellPrice: true,
//               },
//             },
//             quantity: true,
//           },
//         },
//       },
//     });

//     for (const order of orders) {
//       const orderDate = order.createdAt;
//       const orderDay = orderDate.getDate() - 1;

//       let dailySalesForOrder = 0;
//       let dailyProfitForOrder = 0;

//       for (const orderItem of order.OrderItems) {
//         dailySalesForOrder += orderItem.Product.sellPrice * orderItem.quantity;

//         const profitPerItem =
//           (orderItem.Product.sellPrice - orderItem.Product.unitPrice) *
//           orderItem.quantity;
//         dailyProfitForOrder += profitPerItem;
//       }

//       dailySales[orderDay] += dailySalesForOrder;
//       dailyProfits[orderDay] += dailyProfitForOrder;
//     }

//     const formattedDailySales = dailySales.map((value) =>
//       typeof value === "number" ? parseFloat(value.toFixed(2)) : value
//     );
//     const formattedDailyProfits = dailyProfits.map((value) =>
//       typeof value === "number" ? parseFloat(value.toFixed(2)) : value
//     );

//     res.status(200).json({
//       daysOfMonth: Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1),
//       series: [
//         {
//           name: "Сумма",
//           data: formattedDailySales,
//         },
//         {
//           name: "Прибыль",
//           data: formattedDailyProfits,
//         },
//       ],
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Ошибка при получении данных о продажах" });
//   }
// });

router.post("/orders/all", fetchAllOrders);
router.post("/orders/active", fetchActiveOrders);
router.get("/orders/today", fetchTodaysOrders);
router.post("/orders/new", newOrder);
router.patch("/orders/status/:id", updateOrderStatus);
router.get("/orders/fetch/:id", fetchOrderById);
router.get("/revenue/today", fetchTodaysRevenue);
router.get("/revenue/currentmonth", fetchCurrentMonthSales);

export default router;
