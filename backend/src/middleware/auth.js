const { verify } = require("../utils/generateToken");
const { User } = require("../models");

module.exports = async (req, res, next) => {
  try {
    console.log("====== AUTH MIDDLEWARE START ======");

    const header = req.headers.authorization;
    console.log("Authorization Header:", header);

    if (!header) {
      console.log("❌ No Authorization header");
      return res.status(401).json({
        error: "Missing token",
      });
    }

    const token = header.replace("Bearer ", "");
    console.log("Extracted Token:", token);

    const payload = verify(token);
    console.log("Decoded Payload:", payload);

    const user = await User.findByPk(payload.id);

    console.log("User Found:", user ? user.id : "No user");

    if (!user) {
      console.log("❌ User not found in DB");
      return res.status(401).json({
        error: "User not found",
      });
    }

    console.log("User Role:", user.role);

    // 🔹 ADMIN → Skip DB token check
    if (user.role !== "admin") {
      console.log("Normal user → Checking DB token");

      console.log("DB Active Token:", user.active_token);
      console.log("Request Token:", token);

      if (!user.active_token || user.active_token !== token) {
        console.log("❌ Token mismatch or expired");

        // user.active_token = null;
        // user.refresh_token = null;

        // await user.save();
req.user = user;
  next();
        // return res.status(401).json({
        //   error: "Session expired. Please login again.",
        // });
      }

      console.log("✅ Token valid for user");
    } else {
      console.log("👑 Admin detected → Skipping DB token check");
    }

    req.user = user;

    console.log("✅ Auth success → Passing to next middleware");
    console.log("====== AUTH MIDDLEWARE END ======");

    next();
  } catch (err) {
    console.error("❌ Auth Middleware Error:", err);

    return res.status(401).json({
      error: "Invalid token",
    });
  }
};