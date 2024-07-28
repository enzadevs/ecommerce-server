import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../exportprisma.js";
import { asyncHandler, createRateLimiter, timeFormat } from "../../utils.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const generateToken = (user) => {
  const payload = {
    id: user.phoneNumber,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "14d" });
};

const limiter = createRateLimiter(24 * 60 * 60 * 1000, 8, {
  message:
    "Слишком много попыток с одного устройства. Попробуйте через 24 часа.",
});

const userSignUp = asyncHandler(async (req, res) => {
  const { phoneNumber, firstName, password, address, role } = req.body;

  if (
    !phoneNumber ||
    typeof phoneNumber !== "string" ||
    !firstName ||
    typeof firstName !== "string" ||
    !password
  ) {
    return res.status(400).json({
      message: "Ошибка запроса.",
    });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  try {
    const user = await prisma.user.create({
      data: {
        firstName,
        phoneNumber,
        address,
        password: hashedPassword,
        Role: role,
      },
      select: {
        id: true,
        phoneNumber: true,
        wishlist: true,
      },
    });

    const token = generateToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({
        message:
          "Этот номер уже используется. Пожалуйста, попробуйте с другим номером.",
      });
    } else {
      res.status(500).json({ message: "Ошибка при регистрации." });
    }
  }
});

const userSignIn = asyncHandler(async (req, res) => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || typeof phoneNumber !== "string" || !password) {
    return res.status(400).json({
      message: "Ошибка запроса.",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        phoneNumber: true,
        password: true,
        wishlist: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Пользователья не существует.",
      });
    }

    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Неправильные данные. Пожалуйста повторите попытку.",
      });
    }

    delete user.password;

    const token = generateToken(user);
    res.status(200).json({ user, token });
  } catch (err) {
    res.status(500).json({ message: "Ошибка при входе в аккаунт." });
  }
});

const adminSignIn = asyncHandler(async (req, res) => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || typeof phoneNumber !== "string" || !password) {
    return res.status(400).json({
      message: "Ошибка запроса.",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        password: true,
        Role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Пользователья не существует.",
      });
    }

    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Неправильные данные. Пожалуйста повторите попытку.",
      });
    }

    if (user.Role !== "ADMIN") {
      return res.status(403).json({
        message: "У вас нет прав администратора.",
      });
    }

    delete user.password;

    const token = generateToken(user);
    res.status(200).json({ user, token });
  } catch (err) {
    res.status(500).send("Ошибка при входе.");
  }
});

const updateUserData = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { phoneNumber, firstName, password, address } = req.body;

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = password ? await bcrypt.hash(password, salt) : null;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "Пользователь не найден." });
    }

    const updatedUserData = {
      phoneNumber: phoneNumber !== "" ? phoneNumber : existingUser.phoneNumber,
      firstName: firstName || existingUser.firstName,
      address: address || existingUser.address,
      password: password ? hashedPassword : existingUser.password,
    };

    const user = await prisma.user.update({
      where: { id },
      data: updatedUserData,
      select: {
        id: true,
        phoneNumber: true,
        wishlist: true,
      },
    });

    const token = generateToken(user);
    res.status(200).json({ user, token });
  } catch (err) {
    res.status(500).send("Ошибка при обновлении данных.");
  }
});

router.post("/signup", limiter, userSignUp);
router.post("/signin", limiter, userSignIn);
router.post("/signin/admin", adminSignIn);
router.patch("/update/:id", updateUserData);

export default router;
