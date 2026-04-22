"use strict";

const {
  Order,
  Coupon,
  Batch,
  Program,
  Subject,
  QuizesBundle,
  TestSeriesBundle,
  QuizPayments,
  User,
  Quizzes,
  TestSeries,
  SystemLog,
  VideoCourse,
  Sequelize,
  sequelize
} = require("../models");
const redis = require("../config/redis");
const NotificationController = require("./NotificationController");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const { Op } = Sequelize;

// console.log("Chota sequelize instance",sequelize)

const batchPurchaseConfirmationEmail = (order, batch, user) => {
  const userName = user.name?.trim() || user.email?.split('@')[0] || "Student";
  const orderDate = new Date(order.paymentDate || order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const amountPaid = (order.amount / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });

  const validityText = batch.endDate
    ? `Valid until ${new Date(batch.endDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`
    : "12 Months validity (Unlimited Views)";

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-scheme" content="light dark">
  <title>Batch Enrollment Confirmed – Dikshant IAS</title>

  <!--[if gte mso 9]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->

  <style type="text/css">
    :root { color-scheme: light dark; supported-color-scheme: light dark; }
    
    @media (prefers-color-scheme: dark) {
      body, .dark-bg { background-color: #121212 !important; color: #e0e0e0 !important; }
      .dark-bg-white { background-color: #1e1e1e !important; }
      .dark-text-light { color: #ffffff !important; }
      .highlight-box { background-color: #2d1a1a !important; border-color: #ff6b6b !important; }
      .access-info { background-color: #1a2f1f !important; border-left-color: #34d399 !important; }
      a { color: #ff9999 !important; }
    }

    @media only screen and (max-width: 600px) {
      .fluid { width: 100% !important; max-width: 100% !important; }
      .stack { display: block !important; width: 100% !important; }
      .detail-label, .detail-value { text-align: left !important; display: block !important; }
      .detail-value { margin-top: 4px; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#f8f9fa; -webkit-font-smoothing:antialiased; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <center style="width:100%; background:#f8f9fa; padding:20px 10px;">
    <table role="presentation" aria-hidden="true" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:620px; margin:auto; background:#ffffff; border-radius:16px; overflow:hidden;">
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg, #E74C3C 0%, #c0392b 100%); padding:40px 30px 32px; text-align:center; color:white;">
          <img src="https://i.ibb.co/V0rVWKYm/image.png" width="220" alt="Dikshant IAS Logo" style="max-width:220px; height:auto; margin-bottom:20px;" border="0">
          <h1 style="margin:0; font-size:30px; font-weight:700; color:white;">Enrollment Confirmed!</h1>
          <p style="margin:12px 0 0; font-size:18px; opacity:0.95;">Welcome to your learning journey</p>
        </td>
      </tr>

      <!-- Content -->
      <tr>
        <td style="padding:36px 30px 40px; color:#333333; font-size:16px; line-height:1.65;">
          <p style="margin:0 0 24px; font-size:20px; font-weight:600;">Dear ${userName},</p>

          <p style="margin:0 0 28px;">Thank you for choosing <strong>Dikshant IAS Education Centre</strong>!<br>Your payment has been successfully verified and your batch enrollment is now active.</p>

          <table role="presentation" aria-hidden="true" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#fff5f5; border:2px dashed #E74C3C; border-radius:12px; margin:32px 0;">
            <tr>
              <td style="padding:28px 24px;">
                <h2 style="margin:0 0 20px; font-size:24px; font-weight:700; color:#E74C3C;">${batch.name}</h2>
                <p style="margin:0 0 24px; color:#444444; font-size:15px;">${validityText}</p>

                <table role="presentation" aria-hidden="true" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding:10px 0; color:#555555; font-size:15px; width:40%;">Order ID</td>
                    <td style="padding:10px 0; font-weight:600; color:#222222; text-align:left; width:60%;">#${order.id}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0; color:#555555; font-size:15px;">Payment Date</td>
                    <td style="padding:10px 0; font-weight:600; color:#222222; text-align:left;">${orderDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0; color:#555555; font-size:15px;">Amount Paid</td>
                    <td style="padding:10px 0; font-weight:600; color:#222222; text-align:left;">${amountPaid}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0; color:#555555; font-size:15px;">Transaction ID</td>
                    <td style="padding:10px 0; font-weight:600; color:#222222; text-align:left;">${order.razorpayPaymentId || '—'}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table role="presentation" aria-hidden="true" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f0fdf4; border-left:5px solid #10b981; border-radius:8px; margin:32px 0; padding:20px; font-size:15px;">
            <tr>
              <td>
                <strong style="color:#065f46;">Your access is now active!</strong><br><br>
                You can start watching lectures, accessing materials, submitting answers, and joining doubt sessions right away.<br><br>
                <strong>Platform link:</strong> <a href="https://play.google.com/store/apps/details?id=in.kaksya.dikshant&hl=en_IN" style="color:#E74C3C; font-weight:600;">Dikshant IAS App</a><br>
                Login with your registered email / mobile number.
              </td>
            </tr>
          </table>

          <table role="presentation" aria-hidden="true" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:32px auto 40px;">
            <tr>
              <td style="border-radius:50px; background:#E74C3C; text-align:center;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://play.google.com/store/apps/details?id=in.kaksya.dikshant&hl=en_IN" style="height:52px;v-text-anchor:middle;width:240px;" arcsize="50%" stroke="f" fill="t">
                  <v:fill type="tile" color="#E74C3C" />
                  <w:anchorlock/>
                  <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:600;">Open App & Start Learning</center>
                </v:roundrect>
                <![endif]-->
                <a href="https://play.google.com/store/apps/details?id=in.kaksya.dikshant&hl=en_IN" 
                   target="_blank" 
                   style="display:inline-block; padding:16px 48px; background:#E74C3C; color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; border-radius:50px; line-height:1;">
                  Open App & Start Learning →
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 20px;">We wish you the very best in your preparation!<br>
          Stay consistent, keep practicing, and feel free to reach out if you need any support.</p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f1f1f1; padding:32px 30px; text-align:center; font-size:14px; color:#555555; border-top:1px solid #e5e5e5;">
          <p style="margin:0 0 12px;"><strong>Dikshant IAS Education Centre</strong><br>
          Preparing tomorrow's leaders today • Delhi, India</p>
          <p style="margin:0 0 12px;">
            Need help? Contact us at <a href="mailto:info@dikshantias.com" style="color:#E74C3C; font-weight:600;">info@dikshantias.com</a><br>
            or call/WhatsApp: <strong>+91 93125 11015</strong>
          </p>
          <p style="margin:16px 0 0; font-size:13px; color:#777777;">
            This is an automated email. Please do not reply directly.
          </p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
  `.trim();
};


const testSeriesPurchaseConfirmationEmail = (order, testSeries, user) => {
  const userName = user.name?.trim() || user.email?.split('@')[0] || "Student";
  const orderDate = new Date(order.paymentDate || order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const amountPaid = (order.amount / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });

  const expiryDate = testSeries.expirSeries
    ? new Date(testSeries.expirSeries).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    : "Until series ends";

  const durationText = testSeries.timeDurationForTest
    ? `${testSeries.timeDurationForTest} minutes per test`
    : "Standard duration";

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-scheme" content="light dark">
  <title>Test Series Activated – Dikshant IAS</title>

  <!--[if gte mso 9]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->

  <style type="text/css">
    :root { color-scheme: light dark; supported-color-scheme: light dark; }
    
    @media (prefers-color-scheme: dark) {
      body, .dark-bg { background-color: #121212 !important; color: #e0e0e0 !important; }
      .dark-bg-white { background-color: #1e1e1e !important; }
      .dark-text-light { color: #ffffff !important; }
      .highlight-box { background-color: #2d1a1a !important; border-color: #ff6b6b !important; }
      .access-info { background-color: #1a2f1f !important; border-left-color: #34d399 !important; }
      a { color: #ff9999 !important; }
    }

    @media only screen and (max-width: 600px) {
      .fluid { width: 100% !important; max-width: 100% !important; }
      .stack { display: block !important; width: 100% !important; }
      .detail-label, .detail-value { text-align: left !important; display: block !important; }
      .detail-value { margin-top: 4px; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#f8f9fa; -webkit-font-smoothing:antialiased; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <center style="width:100%; background:#f8f9fa; padding:20px 10px;">
    <table role="presentation" aria-hidden="true" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:620px; margin:auto; background:#ffffff; border-radius:16px; overflow:hidden;">
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg, #E74C3C 0%, #c0392b 100%); padding:40px 30px 32px; text-align:center; color:white;">
          <img src="https://i.ibb.co/V0rVWKYm/image.png" width="220" alt="Dikshant IAS Logo" style="max-width:220px; height:auto; margin-bottom:20px;" border="0">
          <h1 style="margin:0; font-size:30px; font-weight:700; color:white;">Test Series Activated!</h1>
          <p style="margin:12px 0 0; font-size:18px; opacity:0.95;">Start your full-length practice now</p>
        </td>
      </tr>

      <!-- Content -->
      <tr>
        <td style="padding:36px 30px 40px; color:#333333; font-size:16px; line-height:1.65;">
          <p style="margin:0 0 24px; font-size:20px; font-weight:600;">Dear ${userName},</p>

          <p style="margin:0 0 28px;">Congratulations! Your payment has been verified and the <strong>${testSeries.title}</strong> test series is now unlocked at Dikshant IAS.</p>

          <table role="presentation" aria-hidden="true" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#fff5f5; border:2px dashed #E74C3C; border-radius:12px; margin:32px 0;">
            <tr>
              <td style="padding:28px 24px;">
                <h2 style="margin:0 0 20px; font-size:24px; font-weight:700; color:#E74C3C;">${testSeries.title}</h2>

                <table role="presentation" aria-hidden="true" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding:10px 0; color:#555555; font-size:15px; width:40%;">Order ID</td>
                    <td style="padding:10px 0; font-weight:600; color:#222222; text-align:left; width:60%;">#${order.id}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0; color:#555555; font-size:15px;">Payment Date</td>
                    <td style="padding:10px 0; font-weight:600; color:#222222; text-align:left;">${orderDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0; color:#555555; font-size:15px;">Amount Paid</td>
                    <td style="padding:10px 0; font-weight:600; color:#222222; text-align:left;">${amountPaid}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0; color:#555555; font-size:15px;">Transaction ID</td>
                    <td style="padding:10px 0; font-weight:600; color:#222222; text-align:left;">${order.razorpayPaymentId || '—'}</td>
                  </tr>
                  <tr><td colspan="2" style="padding:12px 0;"></td></tr>
                  <tr>
                    <td style="padding:10px 0; color:#555555; font-size:15px;">Test Duration</td>
                    <td style="padding:10px 0; font-weight:600; color:#222222; text-align:left;">${durationText}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0; color:#555555; font-size:15px;">Passing Marks</td>
                    <td style="padding:10px 0; font-weight:600; color:#222222; text-align:left;">${testSeries.passing_marks || '—'}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0; color:#555555; font-size:15px;">Access Until</td>
                    <td style="padding:10px 0; font-weight:600; color:#222222; text-align:left;">${expiryDate}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table role="presentation" aria-hidden="true" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f0fdf4; border-left:5px solid #10b981; border-radius:8px; margin:32px 0; padding:20px; font-size:15px;">
            <tr>
              <td>
                <strong style="color:#065f46;">Your test series is ready!</strong><br><br>
                • Full-length mock tests with detailed analysis<br>
                • Question paper & answer submission window active<br>
                • Practice under real exam conditions and track your progress
              </td>
            </tr>
          </table>

          <table role="presentation" aria-hidden="true" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:32px auto 40px;">
            <tr>
              <td style="border-radius:50px; background:#E74C3C; text-align:center;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://app.dikshantias.com/test-series/${testSeries.slug || testSeries.id}" style="height:52px;v-text-anchor:middle;width:240px;" arcsize="50%" stroke="f" fill="t">
                  <v:fill type="tile" color="#E74C3C" />
                  <w:anchorlock/>
                  <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:600;">Start Practicing Now</center>
                </v:roundrect>
                <![endif]-->
                <a href="https://app.dikshantias.com/test-series/${testSeries.slug || testSeries.id}" 
                   target="_blank" 
                   style="display:inline-block; padding:16px 48px; background:#E74C3C; color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; border-radius:50px; line-height:1;">
                  Start Practicing Now →
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 20px;">Best of luck with your SSC CGL 2026 preparation!<br>
          Consistent practice + smart analysis = success. We're here if you need any help.</p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f1f1f1; padding:32px 30px; text-align:center; font-size:14px; color:#555555; border-top:1px solid #e5e5e5;">
          <p style="margin:0 0 12px;"><strong>Dikshant IAS Education Centre</strong><br>
          Preparing tomorrow's leaders today • Delhi, India</p>
          <p style="margin:0 0 12px;">
            Need help? Contact us at <a href="mailto:info@dikshantias.com" style="color:#E74C3C; font-weight:600;">info@dikshantias.com</a><br>
            or call/WhatsApp: <strong>+91 93125 11015</strong>
          </p>
          <p style="margin:16px 0 0; font-size:13px; color:#777777;">
            This is an automated email. Please do not reply directly.
          </p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
  `;
};


const quizPurchaseConfirmationEmail = (order, quiz, user) => {
  const userName = user.name?.trim() || user.email?.split('@')[0] || "Student";
  const orderDate = new Date(order.paymentDate || order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const amountPaid = (order.amount / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });

  const durationText = quiz.durationMinutes
    ? `${quiz.durationMinutes} minutes`
    : "Timed as per questions";

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-scheme" content="light dark">
  <title>Quiz Access Activated – Dikshant IAS</title>

  <!--[if gte mso 9]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->

  <style type="text/css">
    :root { color-scheme: light dark; supported-color-scheme: light dark; }
    
    @media (prefers-color-scheme: dark) {
      body, .dark-bg { background-color: #121212 !important; color: #e0e0e0 !important; }
      .dark-bg-white { background-color: #1e1e1e !important; }
      .dark-text-light { color: #ffffff !important; }
      .highlight-box { background-color: #2d1a1a !important; border-color: #ff6b6b !important; }
      .access-info { background-color: #1a2f1f !important; border-left-color: #34d399 !important; }
      a { color: #ff9999 !important; }
    }

    @media only screen and (max-width: 600px) {
      .fluid { width: 100% !important; max-width: 100% !important; }
      .stack { display: block !important; width: 100% !important; }
      .detail-label, .detail-value { text-align: left !important; display: block !important; }
      .detail-value { margin-top: 4px; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#f8f9fa; -webkit-font-smoothing:antialiased; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <center style="width:100%; background:#f8f9fa; padding:20px 10px;">
    <table role="presentation" aria-hidden="true" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:620px; margin:auto; background:#ffffff; border-radius:16px; overflow:hidden;">
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg, #E74C3C 0%, #c0392b 100%); padding:40px 30px 32px; text-align:center; color:white;">
          <img src="https://i.ibb.co/V0rVWKYm/image.png" width="220" alt="Dikshant IAS Logo" style="max-width:220px; height:auto; margin-bottom:20px;" border="0">
          <h1 style="margin:0; font-size:30px; font-weight:700; color:white;">Quiz Unlocked!</h1>
          <p style="margin:12px 0 0; font-size:18px; opacity:0.95;">Start practicing right now</p>
        </td>
      </tr>

      <!-- Content -->
      <tr>
        <td style="padding:36px 30px 40px; color:#333333; font-size:16px; line-height:1.65;">
          <p style="margin:0 0 24px; font-size:20px; font-weight:600;">Dear ${userName},</p>

          <p style="margin:0 0 28px;">Great choice! Your payment has been verified and your quiz access is now <strong>active</strong> at Dikshant IAS.</p>

          <table role="presentation" aria-hidden="true" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#fff5f5; border:2px dashed #E74C3C; border-radius:12px; margin:32px 0;">
            <tr>
              <td style="padding:28px 24px;">
                <h2 style="margin:0 0 20px; font-size:24px; font-weight:700; color:#E74C3C;">${quiz.title}</h2>

                <table role="presentation" aria-hidden="true" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding:10px 0; color:#555555; font-size:15px; width:40%;">Order ID</td>
                    <td style="padding:10px 0; font-weight:600; color:#222222; text-align:left; width:60%;">#${order.id}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0; color:#555555; font-size:15px;">Payment Date</td>
                    <td style="padding:10px 0; font-weight:600; color:#222222; text-align:left;">${orderDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0; color:#555555; font-size:15px;">Amount Paid</td>
                    <td style="padding:10px 0; font-weight:600; color:#222222; text-align:left;">${amountPaid}</td>
                  </tr>
                  <tr><td colspan="2" style="padding:12px 0;"></td></tr>
                  <tr>
                    <td style="padding:10px 0; color:#555555; font-size:15px;">Total Questions</td>
                    <td style="padding:10px 0; font-weight:600; color:#222222; text-align:left;">${quiz.totalQuestions}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0; color:#555555; font-size:15px;">Duration</td>
                    <td style="padding:10px 0; font-weight:600; color:#222222; text-align:left;">${durationText}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0; color:#555555; font-size:15px;">Attempts Allowed</td>
                    <td style="padding:10px 0; font-weight:600; color:#222222; text-align:left;">${quiz.attemptLimit || 'Unlimited'}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0; color:#555555; font-size:15px;">Passing Marks</td>
                    <td style="padding:10px 0; font-weight:600; color:#222222; text-align:left;">${quiz.passingMarks || '—'}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table role="presentation" aria-hidden="true" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f0fdf4; border-left:5px solid #10b981; border-radius:8px; margin:32px 0; padding:20px; font-size:15px;">
            <tr>
              <td>
                <strong style="color:#065f46;">Your quiz is ready!</strong><br><br>
                • Explanations are available after each attempt<br>
                • Questions & options are shuffled for better practice<br>
                • You have <strong>${quiz.attemptLimit || 'unlimited'}</strong> attempts to improve your score
              </td>
            </tr>
          </table>

          <table role="presentation" aria-hidden="true" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:32px auto 40px;">
            <tr>
              <td style="border-radius:50px; background:#E74C3C; text-align:center;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://app.dikshantias.com/quizzes/${quiz.id}" style="height:52px;v-text-anchor:middle;width:220px;" arcsize="50%" stroke="f" fill="t">
                  <v:fill type="tile" color="#E74C3C" />
                  <w:anchorlock/>
                  <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:600;">Start Quiz Now →</center>
                </v:roundrect>
                <![endif]-->
                <a href="https://app.dikshantias.com/quizzes/${quiz.id}" 
                   target="_blank" 
                   style="display:inline-block; padding:16px 48px; background:#E74C3C; color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; border-radius:50px; line-height:1;">
                  Start Quiz Now →
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 20px;">Keep practicing consistently — every attempt brings you closer to success!<br>
          If you have any questions, our support team is just one message away.</p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f1f1f1; padding:32px 30px; text-align:center; font-size:14px; color:#555555; border-top:1px solid #e5e5e5;">
          <p style="margin:0 0 12px;"><strong>Dikshant IAS Education Centre</strong><br>
          Preparing tomorrow's leaders today • Delhi, India</p>
          <p style="margin:0 0 12px;">
            Need help? Contact us at <a href="mailto:info@dikshantias.com" style="color:#E74C3C; font-weight:600;">info@dikshantias.com</a><br>
            or call/WhatsApp: <strong>+91 93125 11015</strong>
          </p>
          <p style="margin:16px 0 0; font-size:13px; color:#777777;">
            This is an automated email. Please do not reply directly.
          </p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
  `.trim();
};


class OrderController {


  static computeAccessValidity(batch, fallback = 365) {
    if (batch?.endDate) {
      const expiry = new Date(batch.endDate);
      expiry.setDate(expiry.getDate() + 90);
      const days = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
      return days > 0 ? days : 1;
    }
    return fallback;
  }
  static async _logFailure(context, orderId, userId, reason, extra = {}) {
    try {

      const logPayload = {
        level: "error",
        context,
        orderId,
        userId,
        reason,
        meta: extra,
      };

      // Save in DB
      await SystemLog.create(logPayload);

      // Console log for server monitoring
      console.error(JSON.stringify({
        ALERT: "POST_PAYMENT_FAILURE",
        context,
        orderId,
        userId,
        reason,
        timestamp: new Date().toISOString(),
        ...extra,
      }));

    } catch (logError) {

      // Fallback if DB logging fails
      console.error("SYSTEM_LOG_SAVE_FAILED", {
        context,
        orderId,
        userId,
        reason,
        error: logError.message,
      });

    }
  }

  static async grantBundleChildAccess({
    userId,
    bundle,
    bundleType,
    parentOrderId,
    isAdmin = false,
    transaction = null,
  }) {
    // ✅ FIX: use sequelize (instance), not Sequelize (class)
    const t = transaction || (await sequelize.transaction());
    const isExternalTransaction = !!transaction;

    try {
      // 1️⃣ Idempotency Check
      const existingChildCount = await Order.count({
        where: { userId, parentOrderId },
        transaction: t,
      });

      if (existingChildCount > 0) {
        console.log(`⏭️ Skipped: ${existingChildCount} child orders already exist for parent ${parentOrderId}`);
        if (!isExternalTransaction) await t.commit();
        return { success: true, skipped: true };
      }

      // 2️⃣ Extract Child IDs
      let childIds = [];
      let orderType = null;

      if (bundleType === "test_series_bundle") {
        childIds = bundle.testSeries?.map((ts) => ts.id) || [];
        orderType = "test";
      }
      if (bundleType === "quiz_bundle") {
        childIds = bundle.quizzes?.map((q) => q.id) || [];
        orderType = "quiz";
      }


      if (!childIds.length) {
        // ✅ FIX: Log this as a failure — silent skip was hiding the bug
        OrderController._logFailure(
          "grantBundleChildAccess",
          parentOrderId,
          userId,
          "No children found in bundle",
          { bundleType, bundleId: bundle?.id }
        );
        if (!isExternalTransaction) await t.commit();
        return { success: true, skipped: true, message: "No children in bundle" };
      }

      // 3️⃣ Prepare Child Orders
      const childOrders = childIds.map((childId) => ({
        userId,
        type: orderType,
        itemId: childId,
        parentOrderId,
        amount: 0,
        discount: 0,
        gst: 0,
        totalAmount: 0,
        status: "success",
        paymentDate: new Date(),
        enrollmentStatus: "active",
        reason: isAdmin ? "ADMIN_BUNDLE_ASSIGN" : "BUNDLE_PURCHASED",
        razorpayOrderId: `bundle_${parentOrderId}_${orderType}_${childId}`.slice(0, 120),
      }));

      // 4️⃣ Bulk Insert
      await Order.bulkCreate(childOrders, { transaction: t });

      if (!isExternalTransaction) await t.commit();

      return { success: true, skipped: false, childrenCreated: childOrders.length };
    } catch (err) {
      console.error("❌ [grantBundleChildAccess] ERROR:", err.message);
      if (!isExternalTransaction) await t.rollback();
      throw err;
    }
  }

  static async grantBatchChildAccess({
    userId,
    batch,
    parentOrderId,
    isAdmin = false,
    transaction = null,
  }) {
    // ✅ FIX: sequelize (lowercase) — was Sequelize (class), causing crash
    const t = transaction || (await sequelize.transaction());
    const isExternalTransaction = !!transaction;

    try {
      // Idempotency check
      const existing = await Order.count({
        where: {
          userId,
          parentOrderId,
          type: { [Op.in]: ["quiz", "test"] },
        },
        transaction: t,
      });

      if (existing > 0) {
        if (!isExternalTransaction) await t.commit();
        return { success: true, skipped: true, message: "Child orders already granted", existingCount: existing };
      }

      // Parse quizIds & testSeriesIds
      let quizIds = [];
      let testIds = [];

      try {
        const quizRaw = batch.quizIds || "[]";
        const testRaw = batch.testSeriesIds || "[]";
        quizIds = JSON.parse(quizRaw);
        testIds = JSON.parse(testRaw);
      } catch (parseErr) {
        console.error(`[grantBatchChildAccess] JSON parse error for batch ${batch?.id || "unknown"}:`, parseErr);
      }

      quizIds = Array.isArray(quizIds) ? quizIds.map(Number).filter((n) => !isNaN(n)) : [];
      testIds = Array.isArray(testIds) ? testIds.map(Number).filter((n) => !isNaN(n)) : [];

      // ✅ FIX: Log clearly if batch has no content — this was the silent failure
      if (!quizIds.length && !testIds.length) {
        OrderController._logFailure(
          "grantBatchChildAccess",
          parentOrderId,
          userId,
          "Batch has no quizIds or testSeriesIds — check DB data for this batch",
          { batchId: batch?.id, quizIdsRaw: batch?.quizIds, testIdsRaw: batch?.testSeriesIds }
        );
        if (!isExternalTransaction) await t.commit();
        return { success: true, skipped: true, message: "Batch has no child items" };
      }

      // Prepare bulk data
      const quizOrders = quizIds.map((quizId) => ({
        userId,
        type: "quiz",
        itemId: quizId,
        parentOrderId,
        amount: 0,
        discount: 0,
        gst: 0,
        totalAmount: 0,
        status: "success",
        paymentDate: new Date(),
        enrollmentStatus: "active",
        reason: isAdmin ? "ADMIN_BATCH_ASSIGN" : "BATCH_INCLUDED",
        razorpayOrderId: `batch_${parentOrderId}_q_${quizId}`.slice(0, 120),
      }));

      const testOrders = testIds.map((testId) => ({
        userId,
        type: "test",
        itemId: testId,
        parentOrderId,
        amount: 0,
        discount: 0,
        gst: 0,
        totalAmount: 0,
        status: "success",
        paymentDate: new Date(),
        enrollmentStatus: "active",
        reason: isAdmin ? "ADMIN_BATCH_ASSIGN" : "BATCH_INCLUDED",
        razorpayOrderId: `batch_${parentOrderId}_t_${testId}`.slice(0, 120),
      }));

      if (quizOrders.length > 0) await Order.bulkCreate(quizOrders, { transaction: t });
      if (testOrders.length > 0) await Order.bulkCreate(testOrders, { transaction: t });

      if (!isExternalTransaction) await t.commit();


      return { success: true, skipped: false, quizzesCreated: quizOrders.length, testsCreated: testOrders.length };
    } catch (err) {
      if (!isExternalTransaction) await t.rollback();
      console.error("[grantBatchChildAccess] ERROR:", err);
      throw err;
    }
  }

  static async createOrder(req, res) {
    console.log("🟢 CREATE ORDER API HIT");

    const {
      userId, type, batchId, itemId,
      amount, gst = 0, couponCode, isFree = false
    } = req.body;

    if (!userId || !type || !itemId || amount == null) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const validTypes = ["batch", "subject", "quiz", "test", "quiz_bundle", "test_series_bundle"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid order type" });
    }

    const t = await sequelize.transaction();

    try {

      /* ================= PREVENT DUPLICATE PURCHASE ================= */

      if (["batch", "subject"].includes(type)) {
        const existingOrder = await Order.findOne({
          where: {
            userId, type, itemId,
            status: "success",
            enrollmentStatus: "active",
            [Op.or]: [
              { accessValidityDays: null },
              sequelize.literal("DATE_ADD(paymentDate, INTERVAL accessValidityDays DAY) > NOW()")
            ]
          },
          transaction: t
        });

        if (existingOrder) {
          await t.rollback();
          return res.status(409).json({ success: false, message: "Item already purchased and still active" });
        }
      }

      /* ================= VALIDATE ITEM + COMPUTE VALIDITY ================= */

      let batch = null;
      let computedValidity = null;

      if (type === "batch") {
        batch = await Batch.findByPk(itemId, { transaction: t });
        if (!batch) {
          await t.rollback();
          return res.status(404).json({ success: false, message: "Batch not found" });
        }
        // endDate + 90 days
        computedValidity = OrderController.computeAccessValidity(batch);
      }

      if (type === "subject") {
        const foundBatch = await Batch.findByPk(batchId, { transaction: t });
        if (!foundBatch) {
          await t.rollback();
          return res.status(404).json({ success: false, message: "Batch not found" });
        }

        const separateSubjects = foundBatch.separatePurchaseSubjectIds || [];
        const subjectConfig = separateSubjects.find(
          (s) => Number(s.subjectId) === Number(itemId)
        );

        if (!subjectConfig) {
          await t.rollback();
          return res.status(400).json({ success: false, message: "Subject not available for separate purchase" });
        }

        if (subjectConfig.status !== "active") {
          await t.rollback();
          return res.status(400).json({ success: false, message: "Subject purchase disabled" });
        }

        if (
          Number(amount) !== Number(subjectConfig.price) &&
          Number(amount) !== Number(subjectConfig.discountPrice)
        ) {
          await t.rollback();
          return res.status(400).json({ success: false, message: "Invalid subject price" });
        }

        // Subject inherits parent batch validity
        computedValidity = subjectConfig.expiryDays || 365;
        batch = foundBatch;
      }

      /* ================= COUPON HANDLING ================= */

      let discount = 0;
      let couponSnapshot = {
        couponId: null, couponCode: null,
        couponDiscount: null, couponDiscountType: null
      };

      if (couponCode) {
        const coupon = await Coupon.findOne({
          where: { code: couponCode.toUpperCase() },
          transaction: t
        });

        if (!coupon) {
          await t.rollback();
          return res.status(404).json({ success: false, message: "Invalid coupon code" });
        }

        if (new Date() > coupon.validTill) {
          await t.rollback();
          return res.status(400).json({ success: false, message: "Coupon expired" });
        }

        couponSnapshot = {
          couponId: coupon.id,
          couponCode: coupon.code,
          couponDiscount: coupon.discount,
          couponDiscountType: coupon.discountType
        };

        if (coupon.discountType === "flat") {
          discount = coupon.discount;
        } else if (coupon.discountType === "percentage") {
          discount = (amount * coupon.discount) / 100;
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
          }
        }
      }

      const finalAmount = Math.max(0, amount - discount + gst);
      console.log("💰 Final Amount:", finalAmount, "| Access Validity Days:", computedValidity);

      /* ================= HANDLE FREE ORDER ================= */

      if (isFree || finalAmount === 0) {
        console.log("🎁 Free order detected");

        const freeOrder = await Order.create({
          userId, type, itemId,
          amount: 0,
          discount,
          batchIdOfSubject: type === "subject" ? batchId : null,
          gst: 0,
          totalAmount: 0,
          status: "success",
          razorpayOrderId: null,
          razorpayPaymentId: null,
          razorpaySignature: null,
          ...couponSnapshot,
          accessValidityDays: computedValidity,   // ← batch.endDate + 90 days
          enrollmentStatus: "active",
          paymentDate: new Date()
        }, { transaction: t });

        await OrderController.handlePostPaymentLogic(freeOrder, t);
        await t.commit();
        await redis.del(`orders:${userId}`);

        return res.json({
          success: true,
          message: "Free course assigned successfully",
          order: freeOrder,
          isFree: true
        });
      }

      /* ================= RAZORPAY ORDER ================= */

      const razorOrder = await razorpay.orders.create({
        amount: Math.round(finalAmount * 100),
        currency: "INR",
        receipt: `ord_${Date.now()}`.slice(0, 40)
      });

      /* ================= CREATE PENDING ORDER ================= */

      const newOrder = await Order.create({
        userId, type, itemId,
        amount, discount,
        batchIdOfSubject: type === "subject" ? batchId : null,
        gst,
        totalAmount: finalAmount,
        razorpayOrderId: razorOrder.id,
        status: "pending",
        ...couponSnapshot,
        accessValidityDays: computedValidity,     // ← batch.endDate + 90 days
        enrollmentStatus: "active"
      }, { transaction: t });

      await t.commit();
      await redis.del(`orders:${userId}`);

      return res.json({
        success: true,
        message: "Order created successfully",
        razorOrder,
        key: process.env.RAZORPAY_KEY,
        order: newOrder
      });

    } catch (error) {
      await t.rollback();
      console.error("🔥 CREATE ORDER ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Order creation failed",
        error: error.message
      });
    }
  }


  static async adminAssignCourse(req, res) {
    const { userId, type, itemId, accessValidityDays, reason } = req.body;

    if (!userId || !type || !itemId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const t = await sequelize.transaction();

    try {
      const newOrder = await Order.create(
        {
          userId,
          type,
          itemId,
          amount: 0,
          discount: 0,
          gst: 0,
          totalAmount: 0,
          razorpayOrderId: `admin_${Date.now()}_${type}_${itemId}`.slice(0, 120),
          status: "success",
          paymentDate: new Date(),
          accessValidityDays: accessValidityDays || null,
          enrollmentStatus: "active",
          reason: reason || "ADMIN_ASSIGNED",
        },
        { transaction: t }
      );

      if (type === "batch") {
        const batch = await Batch.findByPk(itemId, { transaction: t });
        if (batch) {
          await OrderController.grantBatchChildAccess({
            userId,
            batch,
            parentOrderId: newOrder.id,
            isAdmin: true,
            transaction: t,
          });
        }
      }

      await NotificationController.createNotification({
        userId,
        title: "Course Assigned by Admin",
        message: `You have been enrolled in ${type} by the administrator.`,
        type: "course",
        relatedId: newOrder.id,
      });

      await t.commit();

      await redis.del(`orders:${userId}`);
      await redis.del(`user:courses:${userId}`);

      return res.json({
        success: true,
        message: "Course assigned successfully",
        order: newOrder,
      });
    } catch (err) {
      await t.rollback();
      console.error("[adminAssignCourse] ERROR:", err);
      return res.status(500).json({ success: false, message: "Assignment failed", error: err.message });
    }
  }

  static async adminReverseAssignCourse(req, res) {
    const { userId, orderId, reason } = req.body;



    if (!userId || !orderId) {
      return res.status(400).json({
        success: false,
        message: "userId and orderId required",
      });
    }

    const t = await sequelize.transaction();

    try {
      const order = await Order.findOne({
        where: { id: orderId, userId },
        transaction: t,
      });

      if (!order) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }



      // ✅ If batch -> delete child orders first
      if (order.type === "batch") {
        const deletedChildCount = await Order.destroy({
          where: {
            userId,
            parentOrderId: order.id,
            type: { [Op.in]: ["quiz", "test"] },
          },
          transaction: t,
        });

      }

      // ✅ Delete main order
      await Order.destroy({
        where: { id: order.id, userId },
        transaction: t,
      });

      // Notification
      await NotificationController.createNotification({
        userId,
        title: "Course Access Revoked",
        message: reason
          ? `Your course access was revoked by admin. Reason: ${reason}`
          : "Your course access has been revoked by the administrator.",
        type: "course",
        relatedId: orderId,
      });

      await t.commit();

      await redis.del(`orders:${userId}`);
      await redis.del(`user:courses:${userId}`);



      return res.json({
        success: true,
        message: "Order deleted & access revoked successfully",
      });
    } catch (err) {
      await t.rollback();
      console.error("[adminReverseAssignCourse] ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "Revocation failed",
        error: err.message,
      });
    }
  }

  static async handlePostPaymentLogic(order, transaction) {
    try {
      console.log("======================================");
      console.log("🟢 handlePostPaymentLogic START");
      console.log("Order ID:", order?.id);
      console.log("User ID:", order?.userId);
      console.log("Order Type:", order?.type);
      console.log("Item ID:", order?.itemId);
      console.log("Payment Date:", order?.paymentDate);
      console.log("======================================");

      const user = await User.findByPk(order.userId, { raw: true });

      console.log("👤 User Data:", user);

      if (!user) {
        console.log("❌ User not found");
        OrderController._logFailure(
          "handlePostPaymentLogic",
          order.id,
          order.userId,
          "User not found"
        );
        return;
      }

      switch (order.type) {

        /* ================= BATCH PURCHASE ================= */

        case "batch": {
          console.log("📘 Processing Batch Purchase");

          const batch = await Batch.findByPk(order.itemId, { transaction });

          console.log("📦 Batch Data:", batch?.dataValues);

          if (!batch) {
            console.log("❌ Batch not found");
            break;
          }

          console.log("📅 Batch Expiry Date:", batch?.expiryDate);
          console.log("📅 Batch Valid Till:", batch?.validTill);

          const result = await OrderController.grantBatchChildAccess({
            userId: order.userId,
            batch,
            parentOrderId: order.id,
            transaction,
          });

          console.log("✅ Batch Access Result:", result);

          break;
        }

        /* ================= SUBJECT PURCHASE ================= */
        case "subject": {
          console.log("📗 Processing Subject Purchase");

          const subject = await Subject.findByPk(order.itemId, { transaction });

          if (!subject) {
            console.log("❌ Subject not found");
            OrderController._logFailure(
              "handlePostPaymentLogic",
              order.id,
              order.userId,
              "Subject not found",
              { itemId: order.itemId }
            );
            break;
          }

          console.log("📦 Subject Data:", subject?.dataValues);
          console.log("✅ Subject access granted via order validity:", order.accessValidityDays, "days");

          break;
        }

        /* ================= QUIZ PURCHASE ================= */

        case "quiz": {
          console.log("📝 Processing Quiz Purchase");

          const quiz = await Quizzes.findByPk(order.itemId, { transaction });

          console.log("📦 Quiz Data:", quiz?.dataValues);

          if (!quiz) {
            console.log("❌ Quiz not found");
            break;
          }

          console.log("📅 Quiz Expiry Date:", quiz?.expiryDate);
          console.log("📅 Quiz Valid Till:", quiz?.validTill);

          break;
        }

        /* ================= TEST SERIES ================= */

        case "test": {
          console.log("📚 Processing Test Series");

          const testSeries = await TestSeries.findByPk(order.itemId, {
            transaction,
          });

          console.log("📦 TestSeries Data:", testSeries?.dataValues);

          if (!testSeries) {
            console.log("❌ TestSeries not found");
            break;
          }

          console.log("📅 Test Expiry Date:", testSeries?.expiryDate);
          console.log("📅 Test Valid Till:", testSeries?.validTill);

          break;
        }

        /* ================= BUNDLE ================= */

        case "quiz_bundle":
        case "test_series_bundle": {
          console.log("🎁 Processing Bundle Purchase");

          let bundle = null;

          if (order.type === "test_series_bundle") {
            bundle = await TestSeriesBundle.findByPk(order.itemId, { transaction });
          }

          if (order.type === "quiz_bundle") {
            bundle = await QuizesBundle.findByPk(order.itemId, { transaction });
          }

          console.log("📦 Bundle Data:", bundle?.dataValues);

          if (!bundle) {
            console.log("❌ Bundle not found");
            break;
          }

          console.log("📅 Bundle Expiry Date:", bundle?.expiryDate);
          console.log("📅 Bundle Valid Till:", bundle?.validTill);

          break;
        }

        default:
          console.log("⚠ Unknown Order Type:", order.type);
      }

      console.log("✅ handlePostPaymentLogic END");

    } catch (err) {
      console.log("❌ handlePostPaymentLogic ERROR:", err.message);

      OrderController._logFailure(
        "handlePostPaymentLogic",
        order?.id,
        order?.userId,
        err.message,
        {
          orderType: order?.type,
          itemId: order?.itemId,
        }
      );
    }
  }
  static async verifyPayment(req, res) {
    console.log("🟢 VERIFY PAYMENT API HIT");

    const t = await sequelize.transaction();

    try {
      const razorpay_order_id = req.body.razorpay_order_id || req.body.razorpayOrderId;
      const razorpay_payment_id = req.body.razorpay_payment_id || req.body.razorpayPaymentId;
      const razorpay_signature = req.body.razorpay_signature || req.body.razorpaySignature;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "Missing required payment details." });
      }

      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "Invalid payment signature." });
      }

      const [updatedRows] = await Order.update(
        { status: "verifying" },
        {
          where: {
            razorpayOrderId: razorpay_order_id,
            status: { [Op.in]: ["pending", "created"] }
          },
          transaction: t
        }
      );

      if (updatedRows === 0) {
        const existingOrder = await Order.findOne({
          where: { razorpayOrderId: razorpay_order_id },
          transaction: t
        });
        await t.commit();

        if (!existingOrder) return res.status(404).json({ success: false, message: "Order not found." });
        if (existingOrder.status === "success") return res.json({ success: true, message: "Payment already verified.", orderId: existingOrder.id });
        return res.status(409).json({ success: false, message: `Order already processed. Status: ${existingOrder.status}` });
      }

      const order = await Order.findOne({
        where: { razorpayOrderId: razorpay_order_id },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!order) {
        await t.rollback();
        return res.status(404).json({ success: false, message: "Order not found." });
      }

      /* ================= RECOMPUTE VALIDITY ON VERIFY ================= */
      // Re-fetch batch to get fresh endDate → recompute in case time passed since createOrder

      let finalValidity = order.accessValidityDays;

      if (["batch", "subject"].includes(order.type)) {
        if (order.type === "batch") {
          const batch = await Batch.findByPk(order.itemId, { transaction: t });
          const recomputed = OrderController.computeAccessValidity(batch);
          if (recomputed) finalValidity = recomputed;
        } else {
          const foundBatch = await Batch.findByPk(order.batchIdOfSubject, { transaction: t });
          const separateSubjects = foundBatch.separatePurchaseSubjectIds || [];
          const subjectConfig = separateSubjects.find(
            (s) => Number(s.subjectId) === Number(order.itemId)
          );
          if (subjectConfig && subjectConfig.expiryDays) {
            finalValidity = subjectConfig.expiryDays;
          }
        }

      }

      await order.update({
        status: "success",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentDate: new Date(),
        accessValidityDays: finalValidity    // ← saved on verify too
      }, { transaction: t });

      await OrderController.handlePostPaymentLogic(order, t);
      await t.commit();

      await Promise.all([
        redis.del(`orders:${order.userId}`),
        redis.del(`user:courses:${order.userId}`),
        redis.del(`user:quizzes:${order.userId}`)
      ]);

      return res.json({
        success: true,
        message: "Payment verified successfully.",
        orderId: order.id,
        order
      });

    } catch (err) {
      console.error("[verifyPayment] ERROR:", err);
      try { await t.rollback(); } catch (e) { console.error("Rollback failed:", e); }
      return res.status(500).json({
        success: false,
        message: "Unable to verify payment. Contact support if amount was deducted."
      });
    }
  }

  static async paymentFailed(req, res) {
    const { razorpay_order_id, reason } = req.body;

    try {
      await Order.update(
        { status: "failed", reason: reason || "PAYMENT_FAILED" },
        { where: { razorpayOrderId: razorpay_order_id } }
      );

      await QuizPayments.update(
        { status: "failed" },
        { where: { razorpayOrderId: razorpay_order_id } }
      );

      return res.json({ success: true, message: "Payment marked as failed" });
    } catch (err) {
      console.error("[paymentFailed] ERROR:", err);
      return res.status(500).json({ success: false, message: "Failed to mark payment failed" });
    }
  }

  static async userOrders(req, res) {
    try {
      const userId = req.params.userId;

      const orders = await Order.findAll({
        where: { userId, status: "success" },
        order: [["createdAt", "DESC"]],
      });

      const now = new Date();

      const finalOrders = await Promise.all(
        orders.map(async (order) => {
          const orderJson = order.toJSON();

          // ====================== BATCH PURCHASE ======================
          if (order.type === "batch") {
            const batch = await Batch.findOne({
              where: { id: order.itemId },
              attributes: { exclude: ["longDescription"] },
              include: [
                {
                  model: Program,
                  as: "program",
                  attributes: ["id", "name", "slug"],
                },
              ],
            });

            if (!batch) {
              return { ...orderJson, batch: null, subjects: [], expiryDate: null, isExpired: false };
            }

            let subjectIds = [];
            try {
              subjectIds = JSON.parse(batch.subjectId || "[]");
            } catch { }

            const subjects = await Subject.findAll({
              where: { id: subjectIds },
              attributes: ["id", "name", "slug", "description"],
            });

            let expiryDate = null;
            let isExpired = false;

            if (
              order.accessValidityDays &&
              Number.isInteger(order.accessValidityDays) &&
              order.accessValidityDays > 0
            ) {
              const created = new Date(order.createdAt);
              expiryDate = new Date(created);
              expiryDate.setDate(created.getDate() + order.accessValidityDays);
              isExpired = now > expiryDate;
            }

            return {
              ...orderJson,
              batch: batch.toJSON(),
              subjects,
              expiryDate: expiryDate ? expiryDate.toISOString() : null,
              isExpired,
            };
          }

          // ====================== SUBJECT PURCHASE ======================
          if (order.type === "subject") {
            const batch = await Batch.findOne({
              where: { id: order.batchIdOfSubject },
              attributes: { exclude: ["longDescription"] },
              include: [
                {
                  model: Program,
                  as: "program",
                  attributes: ["id", "name", "slug"],
                },
              ],
            });

            if (!batch) {
              return { ...orderJson, batch: null, subjects: [], expiryDate: null, isExpired: false };
            }

            // Get subject details from separatePurchaseSubjectIds
            const separateSubjects = Array.isArray(batch.separatePurchaseSubjectIds)
              ? batch.separatePurchaseSubjectIds
              : [];

            const subjectConfig = separateSubjects.find(
              (s) => Number(s.subjectId) === Number(order.itemId)
            );

            // Fetch full subject info
            const subject = await Subject.findOne({
              where: { id: order.itemId },
              attributes: ["id", "name", "slug", "description"],
            });

            let expiryDate = null;
            let isExpired = false;

            if (
              order.accessValidityDays &&
              Number.isInteger(order.accessValidityDays) &&
              order.accessValidityDays > 0
            ) {
              const created = new Date(order.createdAt);
              expiryDate = new Date(created);
              expiryDate.setDate(created.getDate() + order.accessValidityDays);
              isExpired = now > expiryDate;
            }

            return {
              ...orderJson,
              batch: batch.toJSON(),
              subjects: subject ? [subject] : [],           // ← This is what you wanted
              subjectIds: [order.itemId],
              subjectConfig: subjectConfig || null,         // Optional: full pricing info
              expiryDate: expiryDate ? expiryDate.toISOString() : null,
              isExpired,
            };
          }

          // ====================== OTHER TYPES ======================
          return orderJson;
        })
      );

      return res.json({
        success: true,
        data: finalOrders,
      });

    } catch (err) {
      console.error("[userOrders] ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Error fetching user orders",
        error: err.message,
      });
    }
  }


  static async allOrders(req, res) {
    try {
      const orders = await Order.findAll();

      return res.json(orders);
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: "Error fetching all orders", e });
    }
  }

  static async getOrderById(req, res) {
    try {
      const orderId = req.params.orderId;
      const order = await Order.findByPk(orderId);

      if (!order)
        return res.status(404).json({ message: "Order not found" });

      return res.json(order);

    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: "Error fetching order", e });
    }
  }

  static async alreadyPurchased(req, res) {
    try {
      const userId = req.user?.id || req.query.userId;

      const { itemId, type } = req.query;

      if (!userId || !itemId || !type) {
        return res.status(400).json({ success: false, message: "userId, itemId and type required" });
      }

      const order = await Order.findOne({
        where: {
          userId,
          itemId,
          type,
          status: "success",
          enrollmentStatus: "active",
        },
      });

      if (!order) {
        return res.json({ success: true, purchased: false });
      }

      const response = {
        success: true,
        purchased: true,
        orderId: order.id,
        paymentDate: order.paymentDate,
        totalAmount: order.totalAmount,
        couponCode: order.couponCode,
      };

      // ────────────────────────────────────────────────
      //   Access control logic (batch / course specific)
      // ────────────────────────────────────────────────
      let canAccess = true;
      let expiryMessage = null;

      if (type === "batch") {
        const now = new Date();

        // 1. Load batch to get endDate (if exists)
        const batch = await Batch.findByPk(order.itemId, {
          attributes: ["id", "endDate", "name"], // minimal fields
        });

        const isBatchIncluded = order.reason === "BATCH_INCLUDED";

        let expiryDate = null;
        let expirySource = null; // for message clarity (personal / batch)

        // Priority 1: Personal access validity days (only if not batch-included)
        if (!isBatchIncluded && Number.isInteger(order.accessValidityDays) && order.accessValidityDays > 0) {
          const created = new Date(order.createdAt);
          expiryDate = new Date(created);
          expiryDate.setDate(created.getDate() + order.accessValidityDays);
          expiryDate.setHours(23, 59, 59, 999);
          expirySource = "personal";
        }
        // Priority 2: Fallback to batch.endDate (if no personal validity or batch-included)
        else if (batch && batch.endDate) {
          expiryDate = new Date(batch.endDate);
          expirySource = "batch";
        }

        // Final check
        if (expiryDate && now > expiryDate) {
          canAccess = false;

          const formattedExpiry = expiryDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });

          if (expirySource === "personal") {
            expiryMessage = `Assigned course validity expired on ${formattedExpiry}`;
          } else if (expirySource === "batch") {
            expiryMessage = `Batch access expired on ${formattedExpiry}`;
          } else {
            expiryMessage = "Course access has expired";
          }
        }
      }


      // ────────────────────────────────────────────────
      //   Quiz logic (unchanged)
      // ────────────────────────────────────────────────
      if (type === "quiz") {
        const limit = order.quiz_limit ?? 3;
        const used = order.quiz_attempts_used ?? 0;
        const remaining = Math.max(limit - used, 0);

        response.quizLimit = limit;
        response.quizAttemptsUsed = used;
        response.remainingAttempts = remaining;
        response.canAttempt = remaining > 0;

        if (!response.canAttempt) {
          response.message = "Quiz attempt limit reached";
        }
      }

      // ────────────────────────────────────────────────
      //   Test series logic (unchanged)
      // ────────────────────────────────────────────────
      if (type === "test") {
        const testSeries = await TestSeries.findByPk(itemId);
        if (!testSeries) {
          return res.status(404).json({ success: false, message: "Test series not found" });
        }

        const now = new Date();
        const expired = testSeries.expirSeries && new Date(testSeries.expirSeries) < now;

        response.testSeries = {
          id: testSeries.id,
          title: testSeries.title,
          expirSeries: testSeries.expirSeries,
        };

        canAccess = !expired;
        if (expired) {
          expiryMessage = "Test series access has expired";
        }
      }

      // Apply final access status (shared across batch, test, etc.)
      response.canAccess = canAccess;

      if (!canAccess && expiryMessage) {
        response.message = expiryMessage;
      }

      return res.json(response);
    } catch (err) {
      console.error("[alreadyPurchased] ERROR:", err);
      return res.status(500).json({ success: false, message: "Failed to check purchase status" });
    }
  }
  // GET USER'S QUIZ ORDERS WITH FULL QUIZ DETAILS & ATTEMPT INFO
  static async getUserQuizOrders(req, res) {
    try {
      const userId = req.user?.id || req.params.userId || req.query.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId is required",
        });
      }

      console.log("GET USER QUIZ ORDERS:", { userId });

      // Fetch all successful quiz orders for the user
      const quizOrders = await Order.findAll({
        where: {
          userId,
          type: "quiz",
          status: "success",
          enrollmentStatus: "active",
        },
        attributes: [
          "id",
          "itemId",
          "totalAmount",
          "paymentDate",
          "quiz_limit",
          "quiz_attempts_used",
          "createdAt",
        ],
        order: [["paymentDate", "DESC"]],
      });

      if (quizOrders.length === 0) {
        return res.json({
          success: true,
          message: "No purchased quizzes found",
          quizzes: [],
        });
      }

      // Fetch full quiz details for all ordered quiz IDs
      const quizIds = quizOrders.map((order) => order.itemId);

      const quizzes = await Quizzes.findAll({
        where: {
          id: quizIds,
          is_active: true, // only active quizzes
        },
        attributes: [
          "id",
          "title",
          "description",
          "image",
          "price",
          "durationMinutes",
          "totalQuestions",
          "totalMarks",
          "passingMarks",
          "attemptLimit",
          "is_free",
        ],
      });

      // Map quizzes to a lookup object
      const quizMap = {};
      quizzes.forEach((quiz) => {
        quizMap[quiz.id] = quiz.toJSON();
      });

      // Combine order + quiz data
      const finalQuizList = quizOrders.map((order) => {
        const quiz = quizMap[order.itemId];

        if (!quiz) {
          return null; // skip if quiz deleted/deactivated
        }

        const defaultLimit = quiz.attemptLimit || 3;
        const orderLimit = order.quiz_limit || defaultLimit;
        const attemptsUsed = order.quiz_attempts_used || 0;
        const remainingAttempts = Math.max(orderLimit - attemptsUsed, 0);

        return {
          orderId: order.id,
          purchasedAt: order.paymentDate,
          amountPaid: order.totalAmount,

          quiz: {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            image: quiz.image,
            price: quiz.price,
            durationMinutes: quiz.durationMinutes,
            totalQuestions: quiz.totalQuestions,
            totalMarks: quiz.totalMarks,
            passingMarks: quiz.passingMarks,
            isFree: quiz.is_free,

            // Attempt Info
            attemptLimit: orderLimit,
            attemptsUsed: attemptsUsed,
            remainingAttempts: remainingAttempts,
            canAttempt: remainingAttempts > 0,
          },
        };
      }).filter(Boolean); // remove nulls

      return res.json({
        success: true,
        count: finalQuizList.length,
        quizzes: finalQuizList,
      });

    } catch (error) {
      console.error("GET USER QUIZ ORDERS ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch quiz orders",
        error: error.message,
      });
    }
  }

  static async adminAssignSubject(req, res) {
    const { userId, subjectId, batchId, accessValidityDays } = req.body;

    if (!userId || !subjectId || !batchId) {
      return res.status(400).json({
        success: false,
        message: "userId, subjectId and batchId required"
      });
    }

    const t = await sequelize.transaction();

    try {

      const order = await Order.create({
        userId,
        type: "subject",
        itemId: subjectId,
        batchIdOfSubject: batchId,

        amount: 0,
        discount: 0,
        gst: 0,
        totalAmount: 0,

        razorpayOrderId: `admin_subject_${Date.now()}`.slice(0, 120),

        status: "success",
        paymentDate: new Date(),

        accessValidityDays: accessValidityDays || null,
        enrollmentStatus: "active",
        reason: "ADMIN_SUBJECT_ASSIGN"
      }, { transaction: t });

      await NotificationController.createNotification({
        userId,
        title: "Subject Assigned",
        message: "Admin has granted you access to a subject.",
        type: "course",
        relatedId: order.id
      });

      await t.commit();

      await redis.del(`orders:${userId}`);
      await redis.del(`user:courses:${userId}`);

      return res.json({
        success: true,
        message: "Subject assigned successfully",
        order
      });

    } catch (err) {

      await t.rollback();

      console.error("[adminAssignSubject] ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to assign subject"
      });

    }
  }

  static async adminRevokeSubject(req, res) {

    const { userId, subjectId } = req.body;

    if (!userId || !subjectId) {
      return res.status(400).json({
        success: false,
        message: "userId and subjectId required"
      });
    }

    try {

      const deleted = await Order.destroy({
        where: {
          userId,
          type: "subject",
          itemId: subjectId
        }
      });

      await redis.del(`orders:${userId}`);
      await redis.del(`user:courses:${userId}`);

      return res.json({
        success: true,
        message: "Subject access revoked",
        deleted
      });

    } catch (err) {

      console.error("[adminRevokeSubject] ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to revoke subject"
      });

    }

  }

  static async getAdminSubjectAssigned(req, res) {

    try {

      const { userId } = req.params;

      const orders = await Order.findAll({
        where: {
          userId,
          type: "subject",
          status: "success",
          enrollmentStatus: "active"
        },
        order: [["createdAt", "DESC"]]
      });

      const subjectIds = orders.map(o => o.itemId);

      const subjects = await Subject.findAll({
        where: { id: subjectIds },
        attributes: ["id", "name", "slug"]
      });

      const subjectMap = {};
      subjects.forEach(s => {
        subjectMap[s.id] = s;
      });

      const response = orders.map(order => ({

        orderId: order.id,
        subjectId: order.itemId,
        batchId: order.batchIdOfSubject,
        assignedAt: order.createdAt,
        subject: subjectMap[order.itemId] || null

      }));

      return res.json({
        success: true,
        total: response.length,
        items: response
      });

    } catch (err) {

      console.error("[getAdminSubjectAssigned] ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch assigned subjects"
      });

    }

  }

  static async adminAssignTestSeries(req, res) {

    const { userId, testSeriesId, accessValidityDays } = req.body;

    if (!userId || !testSeriesId) {
      return res.status(400).json({
        success: false,
        message: "userId and testSeriesId required"
      });
    }

    const t = await sequelize.transaction();

    try {

      const order = await Order.create({
        userId,
        type: "test",
        itemId: testSeriesId,

        amount: 0,
        discount: 0,
        gst: 0,
        totalAmount: 0,

        razorpayOrderId: `admin_test_${Date.now()}`.slice(0, 120),

        status: "success",
        paymentDate: new Date(),

        accessValidityDays: accessValidityDays || null,
        enrollmentStatus: "active",

        reason: "ADMIN_TEST_ASSIGN"

      }, { transaction: t });

      await t.commit();

      await redis.del(`orders:${userId}`);

      return res.json({
        success: true,
        message: "Test series assigned",
        order
      });

    } catch (err) {

      await t.rollback();

      console.error("[adminAssignTestSeries] ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "Assignment failed"
      });

    }

  }
  static async adminRevokeQuiz(req, res) {

    const { userId, quizId, reason } = req.body;

    if (!userId || !quizId) {
      return res.status(400).json({
        success: false,
        message: "userId and quizId required"
      });
    }

    try {

      const deleted = await Order.destroy({
        where: {
          userId,
          type: "quiz",
          itemId: quizId
        }
      });

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Quiz order not found"
        });
      }

      await NotificationController.createNotification({
        userId,
        title: "Quiz Access Revoked",
        message: reason
          ? `Admin revoked your quiz access. Reason: ${reason}`
          : "Your quiz access has been revoked by admin.",
        type: "quiz",
        relatedId: quizId
      });

      await Promise.all([
        redis.del(`orders:${userId}`),
        redis.del(`user:quizzes:${userId}`)
      ]);

      return res.json({
        success: true,
        message: "Quiz access revoked successfully"
      });

    } catch (err) {

      console.error("[adminRevokeQuiz] ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to revoke quiz access"
      });

    }
  }

  static async getUserAssignedQuizzes(req, res) {
    try {

      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId required"
        });
      }

      const orders = await Order.findAll({
        where: {
          userId,
          type: "quiz",
          status: "success",
          enrollmentStatus: "active"
        },
        include: [
          {
            model: Quizzes,
            as: "Quizzes",
            attributes: ["id", "title", "image", "price"]
          }
        ],
        order: [["createdAt", "DESC"]]
      });

      const response = orders.map(order => ({
        orderId: order.id,
        quizId: order.itemId,
        assignedAt: order.createdAt,
        quiz: order.Quizzes
      }));

      return res.json({
        success: true,
        total: response.length,
        items: response
      });

    } catch (err) {

      console.error("[getUserAssignedQuizzes] ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch assigned quizzes"
      });

    }
  }

  static async getUserAssignedTestSeries(req, res) {
    try {

      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId required"
        });
      }

      const orders = await Order.findAll({
        where: {
          userId,
          type: "test",
          status: "success",
          enrollmentStatus: "active"
        },
        include: [
          {
            model: TestSeries,
            as: "testSeries",
            attributes: ["id", "title", "imageUrl", "price"]
          }
        ],
        order: [["createdAt", "DESC"]]
      });

      const response = orders.map(order => ({
        orderId: order.id,
        testSeriesId: order.itemId,
        assignedAt: order.createdAt,
        testSeries: order.testSeries
      }));

      return res.json({
        success: true,
        total: response.length,
        items: response
      });

    } catch (err) {

      console.error("[getUserAssignedTestSeries] ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch assigned test series"
      });

    }
  }

  static async adminAssignQuiz(req, res) {

    const { userId, quizId, quizLimit } = req.body;

    if (!userId || !quizId) {
      return res.status(400).json({
        success: false,
        message: "userId and quizId required"
      });
    }

    const t = await sequelize.transaction();

    try {

      const order = await Order.create({

        userId,
        type: "quiz",
        itemId: quizId,

        amount: 0,
        discount: 0,
        gst: 0,
        totalAmount: 0,

        razorpayOrderId: `admin_quiz_${Date.now()}`.slice(0, 120),

        status: "success",
        paymentDate: new Date(),

        quiz_limit: quizLimit || 3,
        quiz_attempts_used: 0,

        enrollmentStatus: "active",

        reason: "ADMIN_QUIZ_ASSIGN"

      }, { transaction: t });

      await t.commit();

      await redis.del(`orders:${userId}`);
      await redis.del(`user:quizzes:${userId}`);

      return res.json({
        success: true,
        message: "Quiz assigned successfully",
        order
      });

    } catch (err) {

      await t.rollback();

      console.error("[adminAssignQuiz] ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "Quiz assignment failed"
      });

    }

  }
  static async adminRevokeTestSeries(req, res) {

    const { userId, testSeriesId, reason } = req.body;

    if (!userId || !testSeriesId) {
      return res.status(400).json({
        success: false,
        message: "userId and testSeriesId required"
      });
    }

    try {

      const deleted = await Order.destroy({
        where: {
          userId,
          type: "test",
          itemId: testSeriesId
        }
      });

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Test series order not found"
        });
      }

      await NotificationController.createNotification({
        userId,
        title: "Test Series Access Revoked",
        message: reason
          ? `Admin revoked your test series access. Reason: ${reason}`
          : "Your test series access has been revoked by admin.",
        type: "test",
        relatedId: testSeriesId
      });

      await Promise.all([
        redis.del(`orders:${userId}`),
        redis.del(`user:courses:${userId}`)
      ]);

      return res.json({
        success: true,
        message: "Test series access revoked successfully"
      });

    } catch (err) {

      console.error("[adminRevokeTestSeries] ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to revoke test series"
      });

    }
  }
  // DELETE ORDER
  static async deleteOrder(req, res) {
    try {
      const orderId = req.params.orderId;
      const order = await Order.findByPk(orderId);

      if (!order)
        return res.status(404).json({ message: "Order not deleted" });

      await order.destroy();

      return res.json({ success: true, message: "Order deleted" });

    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: "Error deleting order", e });
    }
  }

  // =====================================
  // ADMIN UPDATE ACCESS VALIDITY DAYS
  // saves like: 30, 90, 180, 300
  // =====================================

  static async updateAccessValidityDays(req, res) {
    const t = await sequelize.transaction();

    try {
      console.log("=================================");
      console.log("🟢 UPDATE ACCESS VALIDITY DAYS API HIT");

      console.log("Body:", req.body);
      console.log("=================================");

      const { userId, orderId, accessValidityDays } = req.body;

      // -----------------------------
      // VALIDATION
      // -----------------------------
      if (!userId || !orderId || accessValidityDays === undefined) {
        await t.rollback();

        return res.status(400).json({
          success: false,
          message:
            "userId, orderId and accessValidityDays are required.",
        });
      }

      const days = Number(accessValidityDays);

      if (!Number.isInteger(days) || days < 0) {
        await t.rollback();

        return res.status(400).json({
          success: false,
          message:
            "accessValidityDays must be a valid positive number.",
        });
      }

      console.log("📅 New Access Validity Days:", days);

      // -----------------------------
      // FIND MAIN ORDER
      // -----------------------------
      const order = await Order.findOne({
        where: {
          id: orderId,
          userId,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!order) {
        await t.rollback();

        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      console.log("📦 Order Found:", order.id);
      console.log("Type:", order.type);
      console.log("Old Days:", order.accessValidityDays);

      // -----------------------------
      // UPDATE MAIN ORDER
      // -----------------------------
      await order.update(
        {
          accessValidityDays: days,
        },
        { transaction: t }
      );

      console.log("✅ Main Order Updated");



      await t.commit();

      // -----------------------------
      // CLEAR CACHE
      // -----------------------------
      await Promise.all([
        redis.del(`orders:${userId}`),
        redis.del(`user:courses:${userId}`),
        redis.del(`user:quizzes:${userId}`),
      ]);

      return res.json({
        success: true,
        message:
          "Access validity days updated successfully.",
        data: {
          orderId: order.id,
          userId,
          accessValidityDays: days,
        },
      });

    } catch (error) {
      console.log("❌ Update Access Days Error:", error);

      try {
        await t.rollback();
      } catch (rollbackErr) {
        console.log("Rollback Error:", rollbackErr);
      }

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to update access validity days.",
      });
    }
  }
}

module.exports = OrderController;