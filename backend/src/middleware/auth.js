const { verify } = require("../utils/generateToken");
const { User } = require("../models");

module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({
        error: "Missing token",
      });
    }

    const token = header.replace("Bearer ", "");

    const payload = verify(token);

    const user = await User.findByPk(payload.id);

    if (!user) {
      return res.status(401).json({
        error: "User not found",
      });
    }

    // 🔹 ADMIN → Skip DB token check
    if (user.role !== "admin") {
      if (!user.active_token || user.active_token !== token) {
        user.active_token = null;
        user.refresh_token = null;
        await user.save();

        return res.status(401).json({
          error: "Session expired. Please login again.",
        });
      }
    }

    req.user = user;

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);

    return res.status(401).json({
      error: "Invalid token",
    });
  }
};