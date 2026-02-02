const { User, Order, Batch, Program, Subject, Sequelize, sequelize, Notification } = require("../models");
const bcrypt = require("bcrypt");
const { sign, verify } = require("../utils/generateToken");
const redis = require("../config/redis");
const { Op } = require("sequelize");
const sendEmail = require("../utils/sendEmail");

// ==================== HELPER FUNCTIONS ====================

function genOtp() {
  return Math.floor(100000 + Math.random() * 900000);
}



const otpEmailTemplate = (title = "Verify Your Account", otp, user = {}, logoUrl = "https://i.ibb.co/V0rVWKYm/image.png") => {
  const userName = user.name?.trim() || "there";
  const safeOtp = String(otp).padStart(6, '0'); // ensure 6 digits

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="format-detection" content="telephone=no"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-scheme" content="light dark">
  <title>${title} - Dikshant IAS</title>
  <style type="text/css">
    body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background:#f6f6f6; }
    table,td { border-collapse:collapse; }
    a { color:#E74C3C; text-decoration:none; }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      body { background:#121212 !important; color:#e0e0e0 !important; }
      .container { background:#1e1e1e !important; }
      .content { color:#e0e0e0 !important; }
      .otp-box { background:#2d2d2d !important; border-color:#E74C3C !important; color:#ffffff !important; }
      .footer { color:#aaaaaa !important; background:#181818 !important; }
    }

    .wrapper { width:100%; background:#f6f6f6; padding:40px 10px; }
    .container { max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.1); }
    .header { background:linear-gradient(135deg, #E74C3C 0%, #c0392b 100%); padding:48px 30px 36px; text-align:center; }
    .logo { max-width:220px; height:auto; margin-bottom:16px; }
    .title { color:#ffffff; font-size:30px; font-weight:700; margin:0; letter-spacing:-0.5px; }
    .content { padding:40px 36px 32px; color:#2d2d2d; font-size:16px; line-height:1.65; }
    .greeting { margin:0 0 20px; }
    .otp-container { text-align:center; margin:32px 0 24px; }
    .otp-box {
      display:inline-block;
      font-size:40px;
      font-weight:800;
      letter-spacing:14px;
      padding:20px 36px;
      background:#fff5f5;
      border:3px dashed #E74C3C;
      border-radius:16px;
      color:#E74C3C;
      font-family:monospace;
      box-shadow:0 2px 10px rgba(231,76,60,0.15);
    }
    .validity { font-size:15px; color:#555; text-align:center; margin:0 0 28px; }
    .security-note {
      font-size:14px;
      color:#666;
      text-align:center;
      margin:0 0 32px;
      line-height:1.5;
    }
    .button {
      display:inline-block;
      background:#E74C3C;
      color:white;
      padding:16px 48px;
      border-radius:50px;
      font-size:16px;
      font-weight:600;
      margin:12px 0 32px;
      text-decoration:none;
      box-shadow:0 4px 16px rgba(231,76,60,0.3);
    }
    .footer {
      background:#f9f9f9;
      padding:32px 36px;
      text-align:center;
      font-size:14px;
      color:#666;
      border-top:1px solid #eee;
    }
    .footer a { color:#E74C3C; }
    @media only screen and (max-width:520px) {
      .header { padding:36px 24px 28px; }
      .content { padding:32px 24px 28px; }
      .otp-box { font-size:32px; letter-spacing:10px; padding:16px 28px; }
      .title { font-size:26px; }
    }
  </style>
</head>
<body>
  <table role="presentation" width="100%" class="wrapper">
    <tr>
      <td align="center">
        <table role="presentation" class="container">
          <!-- Header -->
          <tr>
            <td class="header">
              <img src="${logoUrl}" alt="Dikshant IAS" class="logo" />
              <h1 class="title">${title}</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content">
              <p class="greeting">Hello <strong>${userName}</strong>,</p>
              
              <p>Thank you for registering with <strong>Dikshant IAS Education Centre</strong>!</p>
              <p>Use the verification code below to complete your account setup:</p>

              <div class="otp-container">
                <div class="otp-box">${safeOtp}</div>
              </div>

              <p class="validity">This code will expire in <strong>10 minutes</strong>.</p>

              <p class="security-note">
                For your security, please do not share this code with anyone.<br>
                Our team will never ask for your OTP.
              </p>

              <!-- Uncomment if you want a CTA button -->
              <!--
              <div style="text-align:center;">
                <a href="https://your-app.com/verify?token=..." class="button">
                  Verify My Account
                </a>
              </div>
              -->
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer">
              <p><strong>Dikshant IAS Education Centre</strong><br>
              Preparing tomorrow's leaders today • Delhi, India</p>
              <p style="margin:16px 0 0;">
                If you did not request this code, please ignore this email<br>
                or contact support at <a href="mailto:support@dikshantias.com">support@dikshantias.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};


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
console.log(req.body)
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
    const otp = genOtp();
    await redis.set(`otp:${user.id}`, otp, "EX", 600); // 10 mins
    await user.update({
      otp,
      otp_expiry: new Date(Date.now() + 10 * 60 * 1000),
    });

    // TODO: Send OTP via SMS/Email
    console.log(`📧 OTP for user ${user.id}: ${otp}`);
    try {
      const html = otpEmailTemplate(
        "Your OTP Verification Code",
        otp,
        user
      );

      const res = await sendEmail(html, {
        receiver_email: user.email,
        subject: "Your Dikshant IAS OTP Verification Code",
      });
      console.log("Email response", res)
    } catch (error) {
      console.log("Email Error", error)
    }

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
    // console.log("ia m hit",email,password)

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required.",
      });
    }

    const user = await User.findOne({ where: { email } });
    // console.log("user",user);
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

    // console.log("user role",user.role);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Incorrect email or password. Please try again.",
      });
    }
    // console.log("user check");

    const { accessToken, refreshToken } = generateTokens(user);
    // user.refresh_token = refreshToken;
    // await user.save();
    // console.log("user check done");
    return res.status(200).json({
      success: true,
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

    page = Math.max(parseInt(page) || 1, 1);
    limit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { mobile: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    if (role) whereClause.role = role;

    /** 1️⃣ Fetch Users */
    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      limit,
      offset: (page - 1) * limit,
      order: [["createdAt", "DESC"]],
      attributes: { exclude: ["password", "refresh_token", "otp"] },
    });

    const userIds = users.map(u => u.id);

    /** 2️⃣ Fetch Orders of All Users */
    const orders = await Order.findAll({
      where: { userId: userIds },
      order: [["createdAt", "DESC"]],
    });

    /** 3️⃣ Group Orders by userId */
    const orderMap = {};
    for (const order of orders) {
      if (!orderMap[order.userId]) {
        orderMap[order.userId] = [];
      }
      orderMap[order.userId].push(order);
    }

    /** 4️⃣ Fetch Batches + Program + Subjects */
    const batchOrders = orders.filter(o => o.type === "batch");

    const batchIds = batchOrders.map(o => o.itemId);

    const batches = await Batch.findAll({
      where: { id: batchIds },
      include: [
        {
          model: Program,
          as: "program",
          attributes: ["id", "name", "slug"],
        },
      ],
    });

    const batchMap = {};
    batches.forEach(b => (batchMap[b.id] = b));

    /** 5️⃣ Attach Courses to Users */
    const finalUsers = await Promise.all(
      users.map(async (user) => {
        const userOrders = orderMap[user.id] || [];

        const courses = await Promise.all(
          userOrders.map(async (order) => {
            if (order.type !== "batch") return order.toJSON();

            const batch = batchMap[order.itemId];
            if (!batch) return order.toJSON();

            let subjectIds = [];
            try {
              subjectIds = JSON.parse(batch.subjectId || "[]");
            } catch { }

            const subjects = await Subject.findAll({
              where: { id: subjectIds },
              attributes: ["id", "name", "slug"],
            });

            return {
              ...order.toJSON(),
              batch: batch.toJSON(),
              subjects,
            };
          })
        );

        return {
          ...user.toJSON(),
          hasCourse: courses.length > 0,
          courses,
        };
      })
    );

    res.json({
      status: "success",
      message: "Profiles fetched successfully",
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      data: finalUsers,
    });
  } catch (err) {
    console.error("Get All Profiles Error:", err);
    res.status(500).json({
      error: "Unable to fetch profiles",
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


exports.toggleUserActive = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: "User ID is required",
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    // Prevent admin from blocking themselves
    if (req.user && req.user.id === user.id) {
      return res.status(403).json({
        error: "You cannot block/unblock yourself",
      });
    }

    // Prevent blocking other admins (optional security)
    if (user.role === "admin") {
      return res.status(403).json({
        error: "Cannot block/unblock admin users",
      });
    }

    // Toggle active status
    user.is_active = !user.is_active;
    await user.save();

    // Clear user's refresh token if blocking
    if (!user.is_active) {
      user.refresh_token = null;
      user.fcm_token = null;
      await user.save();

      // Clear any cached data
      await redis.del(`user:${userId}`);
      await redis.del(`orders:${userId}`);
    }

    res.json({
      status: "success",
      message: user.is_active
        ? "User activated successfully"
        : "User blocked successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        is_active: user.is_active,
      },
    });
  } catch (err) {
    console.error("Toggle User Active Error:", err);
    res.status(500).json({
      error: "Unable to update user status. Please try again.",
    });
  }
};


exports.deleteUser = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent self delete
    if (req.user && req.user.id === user.id) {
      return res.status(403).json({ error: "You cannot delete yourself" });
    }

    // Prevent admin delete
    if (user.role === "admin") {
      return res.status(403).json({ error: "Cannot delete admin users" });
    }

    // 1️⃣ Delete notifications
    await Notification.destroy({
      where: { userId: user.id },
      transaction,
    });

    // 2️⃣ Delete orders
    const deletedOrders = await Order.destroy({
      where: { userId: user.id },
      transaction,
    });

    // 3️⃣ Delete user
    await user.destroy({ transaction });

    // 4️⃣ Clear Redis cache
    await redis.del(`user:${userId}`);
    await redis.del(`orders:${userId}`);
    await redis.del(`otp:${userId}`);

    await transaction.commit();

    res.json({
      status: "success",
      message: "User deleted successfully",
      deleted: {
        userId: user.id,
        orders: deletedOrders,
      },
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Delete User Error:", err);
    res.status(500).json({
      error: "Unable to delete user",
    });
  }
};
