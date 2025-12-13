const Razorpay = require("razorpay");
require('dotenv').config();

module.exports = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET
});
