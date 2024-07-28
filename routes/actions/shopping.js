import express from "express";
import { prisma } from "../../exportprisma.js";
import { asyncHandler } from "../../utils.js";

const router = express.Router();

const addProductToWishlist = asyncHandler(async (req, res) => {
  const { phoneNumber, barcode } = req.body;

  try {
    if (
      !phoneNumber ||
      typeof phoneNumber !== "string" ||
      !barcode ||
      typeof barcode !== "string"
    ) {
      return res.status(400).json({
        message: "Ошибка запроса.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      return res.status(400).json({ message: "Пользователь не найден." });
    }

    const existingProduct = user.wishlist.find((item) => item === barcode);

    if (existingProduct) {
      user.wishlist = user.wishlist.filter((item) => item !== barcode);
      await prisma.user.update({
        where: { phoneNumber },
        data: { wishlist: user.wishlist },
      });
      return res.status(200).json({ message: "Товар удален из избранных." });
    }

    user.wishlist.push(barcode);
    await prisma.user.update({
      where: { phoneNumber },
      data: { wishlist: user.wishlist },
    });
    return res.status(200).json({ message: "Товар добавлен в избранное." });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Ошибка при добавлении товара в избранное." });
  }
});

const addProductToCart = asyncHandler(async (req, res) => {
  const { phoneNumber, barcode } = req.body;
  let quantity = req.body.quantity || 1;

  try {
    if (
      !phoneNumber ||
      typeof phoneNumber !== "string" ||
      !barcode ||
      typeof barcode !== "string"
    ) {
      return res.status(400).json({
        message: "Ошибка запроса.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        ShoppingCart: true,
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Пользователь не найден." });
    }

    if (!user.ShoppingCart) {
      const newCart = await prisma.shoppingCart.create();
      await prisma.user.update({
        where: { phoneNumber },
        data: { ShoppingCart: { connect: { id: newCart.id } } },
      });
      user.ShoppingCart = newCart;
    }

    const existingItem = await prisma.shoppingCartItem.findFirst({
      where: {
        shoppingCartId: user.ShoppingCart.id,
        barcode: { equals: barcode },
      },
    });

    if (existingItem) {
      quantity = Number(existingItem.quantity) + (req.body.quantity || 1);
      await prisma.shoppingCartItem.update({
        where: { id: existingItem.id },
        data: { quantity },
      });

      res.json({ message: "Товар добавлен в корзину." });
    } else {
      await prisma.shoppingCartItem.create({
        data: {
          ShoppingCart: { connect: { id: user.ShoppingCart.id } },
          Product: { connect: { barcode: barcode } },
          quantity,
        },
      });
      res.json({ message: "Товар добавлен в корзину." });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Ошибка при добавлении товара в избранное." });
  }
});

const deleteFromCart = asyncHandler(async (req, res) => {
  const { shoppingCartItemId } = req.body;

  try {
    await prisma.shoppingCartItem.delete({
      where: {
        id: shoppingCartItemId,
      },
    });

    res.status(200).json({ message: "Товар удален." });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(409).json({
        message: "Товар не найден.",
      });
    } else {
      res
        .status(500)
        .send({ message: "Ошибка при удалении товара с корзины." });
    }
  }
});

const handleQuantityChange = asyncHandler(async (req, res) => {
  const { shoppingCartId, barcode, quantity } = req.body;

  try {
    const cart = await prisma.shoppingCart.findUnique({
      where: { id: Number(shoppingCartId) },
      include: { ProductsList: true },
    });

    if (!cart) {
      return res.status(404).json({ message: "Корзина не найдена." });
    }

    const cartItem = cart.ProductsList.find((item) => item.barcode === barcode);

    if (!cartItem) {
      return res.status(404).json({ message: "Продукт не найден в корзине." });
    }

    const updatedQuantity = quantity > 0 ? quantity : 1;

    await prisma.shoppingCartItem.update({
      where: { id: cartItem.id },
      data: { quantity: updatedQuantity },
    });

    res.status(200).json({ message: "Количество изменено." });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Ошибка при изменении количества." });
  }
});

router.post("/addtowishlist", addProductToWishlist);
router.post("/addtocart", addProductToCart);
router.patch("/quantity", handleQuantityChange);
router.delete("/deletefromcart", deleteFromCart);

export default router;
