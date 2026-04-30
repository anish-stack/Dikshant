const axios = require("axios");
require("dotenv").config();

const sendDltOtp = async (phone, otp) => {
  try {
    if (!phone) {
      throw new Error("Please provide a valid mobile number");
    }

    // Normalize phone
    phone = phone.toString().trim();
    if (phone.startsWith("+91")) {
      phone = phone.slice(3);
    }

    // Validate Indian number
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(phone)) {
      throw new Error("Invalid Indian mobile number");
    }

    // Validate OTP
    otp = otp.toString().trim();
    if (!/^\d{6}$/.test(otp)) {
      throw new Error("OTP must be 6 digits");
    }

    const url = "https://www.fast2sms.com/dev/bulkV2";

    const headers = {
      authorization: process.env.FAST2SMS,
      "Content-Type": "application/json",
    };

    const body = {
      route: "dlt", // IMPORTANT for DLT
      sender_id: process.env.DLT_SENDER_ID, 
      message: process.env.DLT_TEMPLATE_ID,
      variables_values: otp,
      numbers: phone,
    };

    const response = await axios.post(url, body, { headers });

    console.log("✅ DLT OTP sent:", otp, response.data);
    return response.data;

  } catch (error) {
    console.error(
      "❌ DLT OTP Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

module.exports = sendDltOtp;