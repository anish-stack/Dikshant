const { verify } = require("../utils/generateToken");
const { User } = require("../models");

const optionalProtect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    // No token → continue as guest
    if (!header) {
      req.user = null;
      return next();
    }

    const token = header.replace("Bearer ", "");

    const payload = verify(token);

    const user = await User.findByPk(payload.id);

    // Invalid user → continue as guest
    if (!user) {
      req.user = null;
      return next();
    }

    // Optional token validation
    if (
      user.active_token &&
      user.active_token !== token
    ) {
      req.user = null;
      return next();
    }

    req.user = user;

    next();
  } catch (err) {
    console.error("Optional Auth Error:", err);

    // Never block request
    req.user = null;

    next();
  }
};

module.exports = optionalProtect;