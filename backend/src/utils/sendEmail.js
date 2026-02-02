const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

const sendEmail = async (html, options) => {
  try {
    const info = await transporter.sendMail({
      from: `"Dikshant Ias" <${process.env.SMTP_EMAIL}>`,
      to: options.receiver_email,
      subject: options.subject,
      html,
    });

    if (info.accepted && info.accepted.length > 0) {
      return {
        status: true,
        message: "Email sent successfully",
        messageId: info.messageId,
      };
    }

    return {
      status: false,
      message: "Email rejected",
    };

  } catch (error) {
    console.error("Email Error:", error);

    return {
      status: false,
      message: "Failed to send email",
      error: error.message,
    };
  }
};

module.exports = sendEmail;



