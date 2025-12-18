const { User } = require("../models");
const bcrypt = require("bcrypt");
const { sign, verify } = require("../utils/generateToken");
const redis = require("../config/redis");
const { Op } = require("sequelize");

// ==================== HELPER FUNCTIONS ====================

function genOtp() {
  return 123456;
}

function generateTokens(user) {
  const payload = {
    id: user.id,
    role: user.role,
    name: user.name,
  };

  const accessToken = sign(payload, process.env.JWT_EXPIRES_IN || "15m");
  const refreshToken = sign(
    payload,
    process.env.JWT_REFRESH_EXPIRES_IN || "7d"
  );

  return { accessToken, refreshToken };
}

function getUserResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    is_verified: user.is_verified,
    state: user.state,
    city: user.city,
  };
}

// ==================== SIGNUP ====================

exports.signup = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      password,
      state,
      city,
      address,
      device_id,
      fcm_token,
      platform,
      appVersion,
    } = req.body;

    // Validation
    if (!email && !mobile) {
      return res.status(400).json({
        error:
          "Please provide either an email address or mobile number to create your account",
      });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Please enter your name" });
    }

    if (password && password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long",
      });
    }

    // Email validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res
        .status(400)
        .json({ error: "Please enter a valid email address" });
    }

    // Mobile validation
    if (mobile && !/^\d{10}$/.test(mobile)) {
      return res
        .status(400)
        .json({ error: "Please enter a valid 10-digit mobile number" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [email ? { email } : null, mobile ? { mobile } : null].filter(
          Boolean
        ),
      },
    });

    if (existingUser) {
      if (existingUser.email === email && existingUser.mobile === mobile) {
        return res.status(409).json({
          error:
            "This email and mobile number are already registered. Please login.",
        });
      } else if (existingUser.email === email) {
        return res.status(409).json({
          error:
            "This email is already registered. Please login or use a different email.",
        });
      } else if (existingUser.mobile === mobile) {
        return res.status(409).json({
          error:
            "This mobile number is already registered. Please login or use a different number.",
        });
      }
    }

    // Hash password
    const hashed = password ? await bcrypt.hash(password, 10) : null;

    // Create user
    const user = await User.create({
      name: name.trim(),
      email,
      mobile,
      password: hashed,
      state,
      city,
      address,
      device_id,
      fcm_token,
      fcm_update_at: fcm_token ? new Date() : "",
      platform,
      appVersion,   
    });

    // Generate OTP
    const otp = 123456;
    await redis.set(`otp:${user.id}`, otp, "EX", 600); // 10 mins
    await user.update({
      otp,
      otp_expiry: new Date(Date.now() + 10 * 60 * 1000),
    });

    // TODO: Send OTP via SMS/Email
    console.log(`📧 OTP for user ${user.id}: ${otp}`);

    return res.status(201).json({
      status: "success",
      message:
        "Account created successfully! Please verify your OTP to continue.",
      user: getUserResponse(user),
      otp_sent: true,
    });
  } catch (err) {
    console.error("Signup Error:", err);
    return res.status(500).json({
      error: "Unable to create account. Please try again later.",
    });
  }
};

// ==================== REQUEST OTP ====================

exports.requestOtp = async (req, res) => {
  try {
    const { mobile, email } = req.body;

    if (!mobile && !email) {
      return res.status(400).json({
        error: "Please provide your mobile number or email address",
      });
    }

    const user = await User.findOne({
      where: mobile ? { mobile } : { email },
    });

    if (!user) {
      return res.status(404).json({
        error: "No account found with this information. Please sign up first.",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: "Your account has been deactivated. Please contact support.",
      });
    }

    const otp = genOtp();
    await redis.set(`otp:${user.id}`, otp, "EX", 600); // 10 mins

    await user.update({
      otp,
      otp_expiry: new Date(Date.now() + 10 * 60 * 1000),
    });

    // TODO: Send OTP via SMS/Email
    console.log(`📧 OTP for user ${user.id}: ${otp}`);

    res.json({
      success: true,
      message: "OTP sent successfully! Please check your messages.",
      user_id: user.id,
      expires_in: "10 minutes",
    });
  } catch (err) {
    console.error("Request OTP Error:", err);
    res.status(500).json({
      error: "Unable to send OTP. Please try again.",
    });
  }
};

// ==================== VERIFY OTP ====================

exports.verifyOtp = async (req, res) => {
  try {
    const { user_id, otp } = req.body;

    if (!user_id || !otp) {
      return res.status(400).json({
        error: "Please provide both user ID and OTP",
      });
    }

    const user = await User.findByPk(user_id);

    if (!user) {
      return res.status(404).json({
        error: "User not found. Please try again.",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: "Your account has been deactivated. Please contact support.",
      });
    }

    // Check OTP from Redis or DB
    const storedOtp = await redis.get(`otp:${user.id}`);
    const isValid =
      (storedOtp && storedOtp === otp) ||
      (user.otp === otp && user.otp_expiry > new Date());

    if (!isValid) {
      return res.status(400).json({
        error: "Invalid or expired OTP. Please request a new one.",
      });
    }

    // Clear OTP
    await redis.del(`otp:${user.id}`);
    user.otp = null;
    user.otp_expiry = null;
    user.is_verified = true;

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    user.refresh_token = refreshToken;
    await user.save();

    res.json({
      status: "success",
      message: "OTP verified successfully!",
      token: accessToken,
      refresh_token: refreshToken,
      user: getUserResponse(user),
    });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({
      error: "Unable to verify OTP. Please try again.",
    });
  }
};

// ==================== LOGIN ====================

exports.login = async (req, res) => {
  try {
    const {
      mobile,
      password,
      otp,
      device_id,
      fcm_token,
      platform,
      appVersion,
    } = req.body;

    console.log("Login Request Body:", req.body);

    // -------------------------------------------------
    // 1️⃣ MOBILE REQUIRED
    // -------------------------------------------------
    if (!mobile) {
      return res.status(400).json({ error: "Please enter your mobile number" });
    }

    if (!/^\d{10}$/.test(mobile)) {
      return res
        .status(400)
        .json({ error: "Please enter a valid 10-digit mobile number" });
    }

    // Fetch user
    const user = await User.findOne({ where: { mobile } });

    if (!user) {
      return res.status(404).json({
        error:
          "No account found with this mobile number. Please sign up first.",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: "Your account has been deactivated. Please contact support.",
      });
    }

    // -------------------------------------------------
    // Update device & app info for all requests
    // -------------------------------------------------
    let shouldSave = false;
    if (device_id && device_id !== user.device_id) {
      user.device_id = device_id;
      shouldSave = true;
    }

    if (appVersion && appVersion !== user.appVersion) {
      user.appVersion = appVersion;
      shouldSave = true;
    }

    if (fcm_token && fcm_token !== user.fcm_token) {
      user.fcm_token = fcm_token;
      user.fcm_update_at = new Date();
      shouldSave = true;
    }

    if (platform && platform !== user.platform) {
      user.platform = platform;
      shouldSave = true;
    }

    if (shouldSave) await user.save();

    // -------------------------------------------------
    // 2️⃣ PASSWORD LOGIN
    // -------------------------------------------------
    if (password && password.trim() !== "") {
      if (!user.password) {
        return res.status(400).json({
          error: "No password set for this account. Please login with OTP.",
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: "Incorrect mobile number or password. Please try again.",
        });
      }

      const { accessToken, refreshToken } = generateTokens(user);
      user.refresh_token = refreshToken;
      await user.save();

      return res.json({
        status: "success",
        message: "Logged in successfully!",
        token: accessToken,
        refresh_token: refreshToken,
        user: getUserResponse(user),
      });
    }

    // -------------------------------------------------
    // 3️⃣ OTP VERIFICATION
    // -------------------------------------------------
    if (otp && otp.trim() !== "") {
      const storedOtp = await redis.get(`otp:${user.id}`);
      const isValid =
        (storedOtp && storedOtp === otp) ||
        (user.otp === otp && user.otp_expiry > new Date());

      if (!isValid) {
        return res.status(400).json({
          error: "Invalid or expired OTP. Please request a new one.",
        });
      }

      // Clear OTP
      await redis.del(`otp:${user.id}`);
      user.otp = null;
      user.otp_expiry = null;
      user.is_verified = true;

      const { accessToken, refreshToken } = generateTokens(user);
      user.refresh_token = refreshToken;
      await user.save();

      return res.json({
        status: "success",
        message: "OTP verified successfully!",
        token: accessToken,
        refresh_token: refreshToken,
        user: getUserResponse(user),
      });
    }

    // -------------------------------------------------
    // 4️⃣ SEND OTP
    // -------------------------------------------------
    const generatedOtp = genOtp();
    await redis.set(`otp:${user.id}`, generatedOtp, "EX", 300); // 5 mins

    user.otp = generatedOtp;
    await user.save();

    // TODO: Send OTP via SMS
    console.log(`📧 OTP for user ${user.id}: ${generatedOtp}`);

    return res.json({
      success: true,
      message: "OTP sent successfully! Please check your messages.",
      user_id: user.id,
      expires_in: "5 minutes",
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({
      error: "Unable to process login. Please try again later.",
    });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required.",
      });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        error: "User not found.",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied. Admin access required.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Incorrect email or password. Please try again.",
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    user.refresh_token = refreshToken;
    await user.save();

    return res.json({
      status: "success",
      message: "Admin logged in successfully!",
      token: accessToken,
      refresh_token: refreshToken,
      user: getUserResponse(user),
    });
  } catch (error) {
    console.log("Internal server error", error)
    return res.status(500).json({ error: "Internal server error" });
  }
};
// ==================== REFRESH TOKEN ====================

exports.refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: "Refresh token is required",
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verify(refresh_token);
    } catch (err) {
      return res.status(401).json({
        error: "Invalid or expired refresh token. Please login again.",
      });
    }

    // Find user and verify refresh token
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(404).json({
        error: "User not found. Please login again.",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: "Your account has been deactivated. Please contact support.",
      });
    }

    if (user.refresh_token !== refresh_token) {
      return res.status(401).json({
        error: "Invalid refresh token. Please login again.",
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    user.refresh_token = newRefreshToken;
    await user.save();

    res.json({
      status: "success",
      message: "Token refreshed successfully",
      token: accessToken,
      refresh_token: newRefreshToken,
    });
  } catch (err) {
    console.error("Refresh Token Error:", err);
    res.status(500).json({
      error: "Unable to refresh token. Please login again.",
    });
  }
};

// ==================== LOGOUT ====================

exports.logout = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (user) {
      user.refresh_token = null;
      user.fcm_token = null;
      await user.save();
    }

    res.json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("Logout Error:", err);
    res.status(500).json({
      error: "Unable to logout. Please try again.",
    });
  }
};

// ==================== UPDATE PROFILE ====================

exports.updateProfile = async (req, res) => {
  try {
    const id = req.user.id;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const { name, email, mobile, state, city, address } = req.body;

    // Validate fields
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: "Please enter a valid email address",
      });
    }

    if (mobile && !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({
        error: "Please enter a valid 10-digit mobile number",
      });
    }

    // Update fields
    if (name) user.name = name.trim();
    if (email !== undefined) user.email = email;
    if (mobile !== undefined) user.mobile = mobile;
    if (state !== undefined) user.state = state;
    if (city !== undefined) user.city = city;
    if (address !== undefined) user.address = address;

    await user.save();

    res.json({
      status: "success",
      message: "Profile updated successfully",
      user: getUserResponse(user),
    });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      const field = err.errors[0]?.path;
      const fieldName = field === "email" ? "email address" : "mobile number";
      return res.status(409).json({
        error: `This ${fieldName} is already in use by another account.`,
      });
    }

    console.error("Update Profile Error:", err);
    res.status(500).json({
      error: "Unable to update profile. Please try again.",
    });
  }
};

// ==================== GET PROFILE ====================

exports.getProfile = async (req, res) => {
  try {
    const id = req.user.id;

    if (!id) {
      return res.status(401).json({
        error: "Please login to view your profile",
      });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      status: "success",
      message: "Profile fetched successfully",
      data: getUserResponse(user),
    });
  } catch (err) {
    console.error("Get Profile Error:", err);
    res.status(500).json({
      error: "Unable to fetch profile. Please try again.",
    });
  }
};

// ==================== GET ALL PROFILES (ADMIN) ====================

exports.getAllProfile = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", role } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100; // Max limit

    // Build where clause
    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { mobile: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    if (role) {
      whereClause.role = role;
    }

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      limit,
      offset: (page - 1) * limit,
      order: [["createdAt", "DESC"]],
      attributes: { exclude: ["password", "refresh_token", "otp"] },
    });

    res.json({
      status: "success",
      message: "Profiles fetched successfully",
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      data: rows,
    });
  } catch (err) {
    console.error("Get All Profiles Error:", err);
    res.status(500).json({
      error: "Unable to fetch profiles. Please try again.",
    });
  }
};

// ==================== UPDATE FCM TOKEN ====================

exports.updateFcmToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fcm_token, device_id, platform } = req.body;

    if (!fcm_token) {
      return res.status(400).json({
        error: "FCM token is required",
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    let isUpdated = false;

    // 🔁 Update FCM token only if changed
    if (fcm_token && user.fcm_token !== fcm_token) {
      user.fcm_token = fcm_token;
      user.fcm_update_at = new Date();
      isUpdated = true;
    }

    // 📱 Update device if changed
    if (device_id && user.device_id !== device_id) {
      user.device_id = device_id;
      isUpdated = true;
    }

    // 📦 Update platform if changed
    if (platform && user.platform !== platform) {
      user.platform = platform;
      isUpdated = true;
    }

    // ❌ Nothing changed → skip save
    if (!isUpdated) {
      return res.json({
        status: "success",
        message: "FCM token already up to date",
      });
    }

    await user.save();

    return res.json({
      status: "success",
      message: "FCM token updated successfully",
    });
  } catch (err) {
    console.error("Update FCM Token Error:", err);
    return res.status(500).json({
      error: "Unable to update FCM token. Please try again.",
    });
  }
};


exports.updatePassword = async (req, res) => {
  try {
    const { mobile, newPassword } = req.body;

    if (!mobile || !newPassword) {
      return res.status(400).json({
        error: "Mobile number and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "New password must be at least 6 characters long",
      });
    }

    // Find user by mobile
    const user = await User.findOne({ where: { mobile } });

    if (!user) {
      return res.status(404).json({ error: "User with this mobile not found" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({
      status: "success",
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("Update Password Error:", err);
    res.status(500).json({
      error: "Unable to update password. Please try again",
    });
  }
};