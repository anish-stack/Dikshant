const { verify } = require("../utils/generateToken");
const { User } = require("../models");

module.exports = async (req, res, next) => {
  try {
    console.log("====== AUTH MIDDLEWARE START ======");

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

    console.log("User ID:", user.id);
    console.log("User Role:", user.role);

    // 👑 ADMIN → Skip DB token check
    if (user.role === "admin") {
      console.log("Admin detected → skipping token DB check");
      req.user = user;
      return next();
    }

    console.log("DB Active Token:", user.active_token);
    console.log("Request Token:", token);

    // 🟢 CASE 1 → First login (DB token null)
    if (!user.active_token) {
      console.log("Active token NULL → Saving current token");

      user.active_token = token;
      await user.save();

      req.user = user;
      return next();
    }

    // 🔴 CASE 2 → Token mismatch
    if (user.active_token !== token) {
      console.log("Token mismatch → Session expired");

      user.active_token = null;
      user.refresh_token = null;
      await user.save();

      return res.status(401).json({
        error: "Session expired. Please login again.",
      });
    }

    // 🟢 CASE 3 → Valid session
    console.log("Token valid → session active");

    req.user = user;

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);

    return res.status(401).json({
      error: "Invalid token",
    });
  }
};