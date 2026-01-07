const Razorpay = require("razorpay");
require('dotenv').config();

module.exports = new Razorpay({
  key_id: process.env.RAZORPAY_KEY || "rzp_live_1SWl87h7M6UCNY",
  key_secret: process.env.RAZORPAY_SECRET || "fgaSKuNHViLq3ZGuuMt0bSWB"
});
