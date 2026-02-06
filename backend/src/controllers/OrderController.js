"use strict";

const {
  Order,
  Coupon,
  Batch,
  Program,
  Subject,
  QuizPayments,
  User,
  Quizzes,
  TestSeries,
  Sequelize,
  sequelize
} = require("../models");
const redis = require("../config/redis");
const NotificationController = require("./NotificationController");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const { Op } = Sequelize;



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
  // ────────────────────────────────────────────────
  // GRANT ACCESS TO QUIZZES & TESTS INCLUDED IN A BATCH
  // Always idempotent + supports transaction
  // ────────────────────────────────────────────────
  static async grantBatchChildAccess({
    userId,
    batch,
    parentOrderId,
    isAdmin = false,
    transaction = null,
  }) {
    const t = transaction || (await Sequelize.transaction());

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
        console.log(
          `[grantBatchChildAccess] Skipped – ${existing} child orders already exist for parent ${parentOrderId}`
        );
        if (!transaction) await t.commit();
        return {
          success: true,
          skipped: true,
          message: "Child orders already granted",
          existingCount: existing,
        };
      }

      // ─── Parse quizIds & testSeriesIds correctly ────────────────────────────────
      let quizIds = [];
      let testIds = [];

      try {
        const quizRaw = batch.quizIds || '[]';
        const testRaw = batch.testSeriesIds || '[]';

        quizIds = JSON.parse(quizRaw);
        testIds = JSON.parse(testRaw);
      } catch (parseErr) {
        console.error(
          `[grantBatchChildAccess] JSON parse error for batch ${batch?.id || 'unknown'}:`,
          parseErr,
          { quizIdsRaw: batch?.quizIds, testIdsRaw: batch?.testSeriesIds }
        );
      }

      // Ensure arrays & convert IDs to numbers
      quizIds = Array.isArray(quizIds) ? quizIds.map(Number).filter(n => !isNaN(n)) : [];
      testIds = Array.isArray(testIds) ? testIds.map(Number).filter(n => !isNaN(n)) : [];

      console.log(`Quiz Ids after parse:`, quizIds);
      console.log(`Test  Ids after parse:`, testIds);

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

      // Bulk insert
      if (quizOrders.length > 0) {
        await Order.bulkCreate(quizOrders, { transaction: t });
      }
      if (testOrders.length > 0) {
        await Order.bulkCreate(testOrders, { transaction: t });
      }

      if (!transaction) await t.commit();

      console.log(
        `[grantBatchChildAccess] Success – parent=${parentOrderId}, quizzes=${quizOrders.length}, tests=${testOrders.length}`
      );

      return {
        success: true,
        skipped: false,
        quizzesCreated: quizOrders.length,
        testsCreated: testOrders.length,
      };
    } catch (err) {
      if (!transaction) await t.rollback();
      console.error("[grantBatchChildAccess] ERROR:", err);
      throw err;
    }
  }

  // ────────────────────────────────────────────────
  // CREATE RAZORPAY ORDER + DB ENTRY
  // ────────────────────────────────────────────────
  static async createOrder(req, res) {
    console.log("🟡 CREATE ORDER API HIT", { body: req.body });

    const {
      userId,
      type,
      itemId,
      amount,
      gst = 0,
      couponCode,
      accessValidityDays,
      isFree = false, // optional flag for free/promo items
    } = req.body;

    if (!userId || !type || !itemId || amount == null) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const t = await sequelize.transaction();

    try {
      let discount = 0;
      let couponSnapshot = {
        couponId: null,
        couponCode: null,
        couponDiscount: null,
        couponDiscountType: null,
      };

      // Coupon logic
      if (couponCode) {
        const coupon = await Coupon.findOne({
          where: { code: couponCode.toUpperCase() },
          transaction: t,
        });

        if (!coupon) {
          await t.rollback();
          return res.status(404).json({ success: false, message: "Invalid coupon code" });
        }

        const now = new Date();
        if (now > coupon.validTill) {
          await t.rollback();
          return res.status(400).json({ success: false, message: "Coupon expired" });
        }

        couponSnapshot = {
          couponId: coupon.id,
          couponCode: coupon.code,
          couponDiscount: coupon.discount,
          couponDiscountType: coupon.discountType,
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

      // Prevent invalid Razorpay amounts (except explicit free items)
      if (finalAmount <= 0 && !isFree) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Final amount cannot be zero or negative for paid orders",
        });
      }

      const razorOrder = await razorpay.orders.create({
        amount: Math.round(finalAmount * 100),
        currency: "INR",
        receipt: `ord_${Date.now()}`.slice(0, 40),
      });

      let quiz = null;
      if (type === "quiz") {
        quiz = await Quizzes.findByPk(itemId, { transaction: t });
        if (!quiz) {
          await t.rollback();
          return res.status(404).json({ success: false, message: "Quiz not found" });
        }

        await QuizPayments.create(
          {
            userId,
            quizId: itemId,
            razorpayOrderId: razorOrder.id,
            amount: finalAmount,
            currency: "INR",
            status: "pending",
          },
          { transaction: t }
        );
      }

      const test = await TestSeries.findByPk(itemId);
      console.log("test", test)
      const newOrder = await Order.create(
        {
          userId,
          type,
          itemId,
          amount,
          discount,
          gst,
          totalAmount: finalAmount,
          quiz_limit: type === "quiz" ? (quiz?.attemptLimit ?? 3) : null,
          razorpayOrderId: razorOrder.id,
          status: "pending",
          couponId: couponSnapshot.couponId,
          couponCode: couponSnapshot.couponCode,
          couponDiscount: couponSnapshot.couponDiscount,
          couponDiscountType: couponSnapshot.couponDiscountType,
          accessValidityDays: accessValidityDays || null,
          enrollmentStatus: "active",
        },
        { transaction: t }
      );

      await t.commit();

      await redis.del(`orders:${userId}`);

      return res.json({
        success: true,
        message: "Order created successfully",
        razorOrder,
        key: process.env.RAZORPAY_KEY,
        order: newOrder,
      });
    } catch (error) {
      await t.rollback();
      console.error("[createOrder] ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Order creation failed",
        error: error.message,
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

  // ────────────────────────────────────────────────
  // ADMIN: REVOKE FREE/ADMIN-ASSIGNED ACCESS
  // ────────────────────────────────────────────────
  static async adminReverseAssignCourse(req, res) {
    const { userId, orderId, reason } = req.body;

    if (!userId || !orderId) {
      return res.status(400).json({ success: false, message: "userId and orderId required" });
    }

    const t = await sequelize.transaction();

    try {
      const order = await Order.findOne({
        where: {
          id: orderId,
          userId,
          amount: 0, // only free/admin assignments
          enrollmentStatus: "active",
        },
        transaction: t,
      });

      if (!order) {
        await t.rollback();
        return res.status(404).json({ success: false, message: "Revocable admin order not found" });
      }

      await order.update(
        {
          enrollmentStatus: "cancelled",
          status: "failed",
          reason: reason || "ADMIN_REVERSED",
        },
        { transaction: t }
      );

      if (order.type === "batch") {
        await Order.update(
          {
            enrollmentStatus: "cancelled",
            status: "failed",
            reason: "BATCH_REVOKED",
          },
          {
            where: {
              userId,
              parentOrderId: order.id,
              type: { [Op.in]: ["quiz", "test"] },
            },
            transaction: t,
          }
        );
      }

      await NotificationController.createNotification({
        userId,
        title: "Course Access Revoked",
        message: "Your course access has been revoked by the administrator.",
        type: "course",
        relatedId: order.id,
      });

      await t.commit();

      await redis.del(`orders:${userId}`);
      await redis.del(`user:courses:${userId}`);

      return res.json({
        success: true,
        message: "Access revoked successfully",
        order,
      });
    } catch (err) {
      await t.rollback();
      console.error("[adminReverseAssignCourse] ERROR:", err);
      return res.status(500).json({ success: false, message: "Revocation failed", error: err.message });
    }
  }
  static async verifyPayment(req, res) {
    console.log("🟢 VERIFY PAYMENT API HIT", { body: req.body });

    // ✅ Normalize body (camelCase + snake_case)
    const razorpay_order_id =
      req.body.razorpay_order_id || req.body.razorpayOrderId;

    const razorpay_payment_id =
      req.body.razorpay_payment_id || req.body.razorpayPaymentId;

    const razorpay_signature =
      req.body.razorpay_signature || req.body.razorpaySignature;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing Razorpay verification fields",
      });
    }

    // 🔐 Signature verification
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    const t = await sequelize.transaction();

    try {
      // 🔒 Atomic lock: pending → verifying
      const [updatedRows] = await Order.update(
        { status: "verifying" },
        {
          where: {
            razorpayOrderId: razorpay_order_id,
            status: { [Op.in]: ["pending", "created"] },
          },
          transaction: t,
        }
      );

      if (updatedRows === 0) {
        const existingOrder = await Order.findOne({
          where: { razorpayOrderId: razorpay_order_id },
          transaction: t,
        });

        await t.commit();

        if (!existingOrder) {
          return res.status(404).json({
            success: false,
            message: "Order not found",
          });
        }

        if (existingOrder.status === "success") {
          return res.json({
            success: true,
            message: "Payment already verified",
            orderId: existingOrder.id,
          });
        }

        return res.status(409).json({
          success: false,
          message: `Order already processed (status: ${existingOrder.status})`,
        });
      }

      // 🔍 Fetch locked order
      const order = await Order.findOne({
        where: { razorpayOrderId: razorpay_order_id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!order) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: "Order not found after lock",
        });
      }

      // ✅ Final success update
      await order.update(
        {
          status: "success",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paymentDate: new Date(),
        },
        { transaction: t }
      );

      // 🎁 Batch → auto grant quiz & test access
      if (order.type === "batch") {
        const batch = await Batch.findByPk(order.itemId, { transaction: t });
        const user = await User.findByPk(order.userId, { raw: true });

        const html = batchPurchaseConfirmationEmail(order, batch, user);

        await sendEmail(html, {
          receiver_email: user.email,
          subject: `Batch Enrollment Confirmed – ${batch.name}`,
        });

        console.log(`Batch confirmation email sent to ${user.email}`);
        if (batch) {
          await OrderController.grantBatchChildAccess({
            userId: order.userId,
            batch,
            parentOrderId: order.id,
            isAdmin: false,
            transaction: t,
          });
        }
      }

      // 🎯 QuizPayments sync
      if (order.type === "quiz") {

        const quiz = await Quizzes.findByPk(order.itemId, { transaction: t });

        const user = await User.findByPk(order.userId, { raw: true });
        const html = quizPurchaseConfirmationEmail(order, quiz, user);
        await sendEmail(html, {
          receiver_email: user.email,
          subject: `Quiz Unlocked: ${quiz.title} – Dikshant IAS`,
        });
        const quizPayment = await QuizPayments.findOne({
          where: { razorpayOrderId: razorpay_order_id },
          transaction: t,
        });

        if (quizPayment) {
          await quizPayment.update(
            {
              status: "completed",
              razorpayPaymentId: razorpay_payment_id,
              razorpaySignature: razorpay_signature,
            },
            { transaction: t }
          );
        }
      }

      if (order.type === "test") {

       try {
    const user = await User.findByPk(order.userId, { raw: true });
    const testSeries = await TestSeries.findByPk(order.itemId, { raw: true });

    if (user?.email && testSeries) {
      const html = testSeriesPurchaseConfirmationEmail(order, testSeries, user);

      await sendEmail(html, {
        receiver_email: user.email,
        subject: `Test Series Unlocked: ${testSeries.title} – Dikshant IAS`,
      });

      console.log(`Test series email sent to ${user.email} for series #${testSeries.id}`);
    }
  } catch (emailErr) {
    console.error("Failed to send test series confirmation email:", emailErr);
    // non-blocking
  }
      }


      await t.commit();

      // 🧹 Cache cleanup (post-commit only)
      await redis.del(`orders:${order.userId}`);
      await redis.del(`user:courses:${order.userId}`);
      await redis.del(`user:quizzes:${order.userId}`);

      return res.json({
        success: true,
        message: "Payment verified successfully",
        order: order,
        orderId: order.id,
      });
    } catch (err) {
      await t.rollback();
      console.error("[verifyPayment] ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "Payment verification failed",
        error: err.message,
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

      const finalOrders = await Promise.all(
        orders.map(async (order) => {
          if (order.type !== "batch") return order.toJSON();

          const batch = await Batch.findOne({
            where: { id: order.itemId },
            include: [{ model: Program, as: "program", attributes: ["id", "name", "slug"] }],
          });

          if (!batch) return { ...order.toJSON(), batch: null, subjects: [] };

          let subjectIds = [];
          try {
            subjectIds = JSON.parse(batch.subjectId || "[]");
          } catch {
            subjectIds = [];
          }

          const subjects = await Subject.findAll({
            where: { id: subjectIds },
            attributes: ["id", "name", "slug", "description"],
          });

          return {
            ...order.toJSON(),
            batch: batch.toJSON(),
            subjects,
          };
        })
      );

      return res.json(finalOrders);
    } catch (err) {
      console.error("[userOrders] ERROR:", err);
      return res.status(500).json({ success: false, message: "Error fetching orders" });
    }
  }
  // ALL ORDERS (ADMIN)
  static async allOrders(req, res) {
    try {
      const orders = await Order.findAll();

      return res.json(orders);
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: "Error fetching all orders", e });
    }
  }

  // GET ORDER BY ID
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

      if (type === "quiz") {
        const limit = order.quiz_limit ?? 3;
        const used = order.quiz_attempts_used ?? 0;
        const remaining = Math.max(limit - used, 0);

        response.quizLimit = limit;
        response.quizAttemptsUsed = used;
        response.remainingAttempts = remaining;
        response.canAttempt = remaining > 0;
        if (!response.canAttempt) response.message = "Quiz attempt limit reached";
      }

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
        response.canAccess = !expired;
        if (expired) response.message = "Test series access has expired";
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

}

module.exports = OrderController;