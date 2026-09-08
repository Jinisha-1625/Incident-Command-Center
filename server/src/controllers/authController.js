import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { httpError } from "../utils/httpError.js";

function tokenFor(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

export async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name?.trim() || !email?.trim() || !password) {
      throw httpError(400, "Name, email, and password are required");
    }
    if (password.length < 6) {
      throw httpError(400, "Password must be at least 6 characters");
    }
    if (!["commander", "engineer"].includes(role)) {
      throw httpError(400, "Role must be commander or engineer");
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      throw httpError(409, "An account with that email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
    });

    res.status(201).json({ token: tokenFor(user), user: user.toJSON() });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      throw httpError(400, "Email and password are required");
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      throw httpError(401, "Incorrect email or password");
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw httpError(401, "Incorrect email or password");
    }

    res.json({ token: tokenFor(user), user: user.toJSON() });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  res.json({ user: req.user.toJSON() });
}
