import express from "express";
import { prisma } from "../../exportprisma.js";
import { asyncHandler, timeFormat } from "../../utils.js";

const router = express.Router();

const fetchAllUsers = asyncHandler(async (req, res) => {
  const { page, limit } = req.body;

  try {
    const users = await prisma.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: "desc" },
    });

    const formattedUsers = users.map((user) => {
      const formattedCreatedAt = new Date(user.createdAt).toLocaleString(
        "en-US",
        timeFormat
      );
      const formattedUpdatedAt = new Date(user.updatedAt).toLocaleString(
        "en-US",
        timeFormat
      );

      return {
        ...user,
        createdAt: formattedCreatedAt,
        updatedAt: formattedUpdatedAt,
      };
    });

    res.status(200).json({
      users: formattedUsers,
      pagination: {
        currentPage: page,
        totalPages: users.length === 0 ? 1 : Math.ceil(users.length / limit),
      },
    });
  } catch (err) {
    res.status(500).send("Ошибка при получении данных.");
  }
});

const fetchBasicInfo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        address: true,
        Role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден." });
    }

    const formattedCreatedAt = new Date(user.createdAt).toLocaleString(
      "en-US",
      timeFormat
    );
    const formattedUpdatedAt = new Date(user.updatedAt).toLocaleString(
      "en-US",
      timeFormat
    );

    const formattedUser = {
      ...user,
      createdAt: formattedCreatedAt,
      updatedAt: formattedUpdatedAt,
    };

    res.status(200).json(formattedUser);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

const fetchDetailedInfo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        ShoppingCart: {
          include: {
            ProductsList: {
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
          },
        },
        Orders: {
          include: {
            OrderStatus: true,
          },
        },
        SentMessages: true,
        ReceivedMessages: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден." });
    }

    delete user.password;

    const formattedCreatedAt = new Date(user.createdAt).toLocaleString(
      "en-US",
      timeFormat
    );
    const formattedUpdatedAt = new Date(user.updatedAt).toLocaleString(
      "en-US",
      timeFormat
    );

    const formattedUser = {
      ...user,
      createdAt: formattedCreatedAt,
      updatedAt: formattedUpdatedAt,
    };

    res.status(200).json(formattedUser);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

const fetchWishlistProducts = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        wishlist: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден." });
    }

    const wishlistProducts = await Promise.all(
      user.wishlist.map(async (barcode) => {
        const product = await prisma.product.findUnique({
          where: { barcode: barcode },
          select: {
            barcode: true,
            nameTm: true,
            nameRu: true,
            sellPrice: true,
            images: true,
          },
        });

        return product;
      })
    );

    res.status(200).json({ wishlistProducts: wishlistProducts });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.post("/all", fetchAllUsers);
router.get("/fetch/:id", fetchBasicInfo);
router.get("/fetch/details/:id", fetchDetailedInfo);
router.get("/fetch/wishlist/:id", fetchWishlistProducts);

export default router;
