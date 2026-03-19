const nodemailer = require("nodemailer");

console.log("Initializing mail transporter...");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

const sendEmail = async (html, options) => {
  console.log("sendEmail called with:", {
    to: options.receiver_email,
    subject: options.subject,
  });

  try {
    console.log("Sending email...");

    const info = await transporter.sendMail({
      from: `"Dikshant Ias" <${process.env.SMTP_EMAIL}>`,
      to: options.receiver_email,
      subject: options.subject,
      html,
    });

    console.log("Raw response from nodemailer:", info);

    if (info.accepted && info.accepted.length > 0) {
      console.log("Email accepted:", info.accepted);

      return {
        status: true,
        message: "Email sent successfully",
        messageId: info.messageId,
      };
    }

    console.warn("Email rejected:", info.rejected);

    return {
      status: false,
      message: "Email rejected",
    };

  } catch (error) {
    console.error("Email Error:", error);
    console.error("Error message:", error.message);
    console.error("Stack:", error.stack);

    return {
      status: false,
      message: "Failed to send email",
      error: error.message,
    };
  }
};

module.exports = sendEmail;