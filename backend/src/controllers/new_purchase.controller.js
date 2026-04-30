const Razorpay = require('razorpay');
const crypto = require('crypto');
const { StudentPurchaseDikshant: StudentPurchase, TestSeriesDikshant: TestSeries, TestDikshant: Test, CouponDikshant: Coupon, User, sequelize } = require('../models');
const { AppError, asyncHandler } = require('../utils/NewHelpers');
// const { sendEmail } = require('../services/email.service');
const { notificationQueue } = require('../queue');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const applyCoupon = async (coupon_code, amount, series_id, test_id) => {
  if (!coupon_code) return { discount: 0, coupon: null };

  const coupon = await Coupon.findOne({
    where: { code: coupon_code.toUpperCase(), is_active: true },
  });

  if (!coupon) throw new AppError('Invalid coupon code', 400);

  const now = new Date();
  if (now < new Date(coupon.valid_from) || now > new Date(coupon.valid_until)) {
    throw new AppError('Coupon expired', 400);
  }

  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
    throw new AppError('Coupon usage limit reached', 400);
  }

  if (coupon.min_amount && amount < coupon.min_amount) {
    throw new AppError(`Minimum order amount ₹${coupon.min_amount} required`, 400);
  }

  if (coupon.applicable_series && coupon.applicable_series.length > 0) {
    const applicable = series_id
      ? coupon.applicable_series.includes(series_id)
      : coupon.applicable_series.includes(test_id);
    if (!applicable) throw new AppError('Coupon not applicable for this item', 400);
  }

  const discount = coupon.discount_type === 'flat'
    ? Math.min(coupon.discount_value, amount)
    : Math.min((amount * coupon.discount_value) / 100, amount);

  return { discount, coupon };
};

// ─── Controllers ─────────────────────────────────────────────────────────────

// POST /purchases  — initiate
exports.initiatePurchase = asyncHandler(async (req, res) => {
  try {
    const { purchase_type, series_id, test_id, coupon_code } = req.body;
    const userId = req.user.id;

    /* =========================================
       VALIDATION
    ========================================= */
    if (purchase_type === 'series' && !series_id) {
      throw new AppError('series_id required', 400);
    }

    if (purchase_type === 'single_test' && !test_id) {
      throw new AppError('test_id required', 400);
    }

    let baseAmount = 0;
    let itemTitle = '';

    /* =========================================
       FETCH ITEM + CHECK PURCHASE
    ========================================= */
    if (purchase_type === 'series') {
      const series = await TestSeries.findByPk(series_id);

      if (!series) throw new AppError('Series not found', 404);

      const existing = await StudentPurchase.findOne({
        where: { user_id: userId, series_id, payment_status: 'success' },
      });

      if (existing) throw new AppError('Already purchased', 409);

      baseAmount = series.discount_price || series.price || 0;
      itemTitle = series.title;
    } else {
      const test = await Test.findByPk(test_id);

      if (!test) throw new AppError('Test not found', 404);

      const existing = await StudentPurchase.findOne({
        where: { user_id: userId, test_id, payment_status: 'success' },
      });

      if (existing) throw new AppError('Already purchased', 409);

      baseAmount = test.price || 99;
      itemTitle = test.title;
    }

    /* =========================================
       APPLY COUPON
    ========================================= */
    const { discount, coupon } = await applyCoupon(
      coupon_code,
      baseAmount,
      series_id,
      test_id
    );

    const finalAmount = Math.max(0, baseAmount - discount);

    /* =========================================
       FREE PURCHASE (UNIFIED FLOW)
    ========================================= */
    if (finalAmount === 0) {
      const fakeOrderId = `order_FREE_${Date.now()}`;
      const fakePaymentId = `pay_FREE_${Date.now()}`;

      const purchase = await StudentPurchase.create({
        user_id: userId,
        series_id: series_id || null,
        test_id: test_id || null,
        purchase_type,
        amount_paid: 0,
        coupon_id: coupon?.id || null,
        discount_applied: discount,
        payment_id: fakePaymentId,
        payment_status: 'success',
      });

      if (coupon) await coupon.increment('used_count');

      // 🔔 Notification
      await notificationQueue.add('send-notification', {
        user_id: userId,
        title: 'Purchase Successful!',
        body: 'Your purchase is confirmed. Happy learning!',
        type: 'purchase',
      });

      return res.json({
        status: 'success',
        data: {
          free: true,
          purchase_id: purchase.id,
          order_id: fakeOrderId,
          amount: 0,
          currency: 'INR',
          item_title: itemTitle,
        },
      });
    }

    /* =========================================
       PAID PURCHASE → RAZORPAY ORDER
    ========================================= */
    if (!process.env.RAZORPAY_KEY) {
      throw new AppError('Razorpay key not configured', 500);
    }

    const order = await razorpay.orders.create({
      amount: Math.round(finalAmount * 100), // paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: {
        user_id: userId,
        purchase_type,
        series_id,
        test_id,
      },
    });

    /* =========================================
       SAVE PENDING PURCHASE
    ========================================= */
    const purchase = await StudentPurchase.create({
      user_id: userId,
      series_id: series_id || null,
      test_id: test_id || null,
      purchase_type,
      amount_paid: finalAmount,
      coupon_id: coupon?.id || null,
      discount_applied: discount,
      payment_id: order.id,
      payment_status: 'pending',
    });

    /* =========================================
       RESPONSE
    ========================================= */
    return res.json({
      status: 'success',
      data: {
        purchase_id: purchase.id,
        order_id: order.id,
        amount: finalAmount,
        discount,
        original_amount: baseAmount,
        currency: 'INR',
        key_id: process.env.RAZORPAY_KEY,
        item_title: itemTitle,
      },
    });

  } catch (error) {
    console.error('initiatePurchase Error:', error);

    return res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Failed to initiate purchase',
    });
  }
});

// POST /purchases/verify  — payment callback from client
exports.verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, purchase_id } = req.body;

  // Verify signature
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    await StudentPurchase.update({ payment_status: 'failed' }, { where: { id: purchase_id } });
    throw new AppError('Payment verification failed', 400);
  }

  const purchase = await StudentPurchase.findOne({
    where: { id: purchase_id, user_id: req.user.id, payment_status: 'pending' },
  });
  if (!purchase) throw new AppError('Purchase not found', 404);

  await purchase.update({ payment_status: 'success', payment_id: razorpay_payment_id });

  // Increment coupon used_count
  if (purchase.coupon_id) {
    await Coupon.increment('used_count', { where: { id: purchase.coupon_id } });
  }

  // Send confirmation email
  const user = await User.findByPk(req.user.id, { attributes: ['name', 'email'] });
  // await sendEmail({
  //   to: user.email,
  //   subject: 'Purchase Confirmed — Dikshant IAS',
  //   template: 'purchase-confirm',
  //   data: { name: user.name, amount: purchase.amount_paid, payment_id: razorpay_payment_id },
  // });

  // Push notification
  await notificationQueue.add('send-notification', {
    user_id: req.user.id,
    title: 'Purchase Successful!',
    body: 'Your purchase is confirmed. Happy learning!',
    type: 'purchase',
  });

  res.json({ status: 'success', message: 'Payment verified', data: { purchase_id: purchase.id } });
});

// POST /purchases/webhook  — Razorpay server webhook
exports.razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const body = JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== signature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const { event, payload } = req.body;

  if (event === 'payment.captured') {
    const orderId = payload.payment.entity.order_id;
    await StudentPurchase.update(
      { payment_status: 'success' },
      { where: { payment_id: orderId, payment_status: 'pending' } }
    );
  }

  if (event === 'payment.failed') {
    const orderId = payload.payment.entity.order_id;
    await StudentPurchase.update(
      { payment_status: 'failed' },
      { where: { payment_id: orderId, payment_status: 'pending' } }
    );
  }

  if (event === 'refund.processed') {
    const paymentId = payload.refund.entity.payment_id;
    await StudentPurchase.update(
      { payment_status: 'refunded' },
      { where: { payment_id: paymentId } }
    );
  }

  res.json({ status: 'ok' });
});

// GET /purchases/my
exports.getMyPurchases = asyncHandler(async (req, res) => {
  const purchases = await StudentPurchase.findAll({
    where: { user_id: req.user.id, payment_status: 'success' },
    include: [
      { model: TestSeries, attributes: ['id', 'title', 'slug', 'type', 'thumbnail_url'] },
      { model: Test, attributes: ['id', 'title', 'type', 'status'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  res.json({ status: 'success', data: { purchases } });
});

// GET /purchases/admin/all  [admin]
exports.adminListPurchases = asyncHandler(async (req, res) => {
  const { payment_status, purchase_type, page = 1, limit = 50 } = req.query;
  const where = {};
  if (payment_status) where.payment_status = payment_status;
  if (purchase_type) where.purchase_type = purchase_type;

  const { count, rows } = await StudentPurchase.findAndCountAll({
    where,
    include: [
      { model: User, attributes: ['id', 'name', 'email'] },
      { model: TestSeries, attributes: ['id', 'title'] },
      { model: Test, attributes: ['id', 'title'] },
      { model: Coupon, attributes: ['id', 'code'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });

  res.json({ status: 'success', data: { purchases: rows, total: count, page: +page, limit: +limit } });
});

// POST /purchases/:id/refund  [admin]
exports.refundPurchase = asyncHandler(async (req, res) => {
  const purchase = await StudentPurchase.findByPk(req.params.id);
  if (!purchase) throw new AppError('Purchase not found', 404);
  if (purchase.payment_status !== 'success') throw new AppError('Only successful purchases can be refunded', 400);

  const refund = await razorpay.payments.refund(purchase.payment_id, {
    amount: Math.round(purchase.amount_paid * 100),
    notes: { reason: req.body.reason || 'Admin refund' },
  });

  await purchase.update({ payment_status: 'refunded' });

  res.json({ status: 'success', data: { refund_id: refund.id } });
});

// ─── Coupons [admin] ──────────────────────────────────────────────────────────

// POST /purchases/coupons
exports.createCoupon = asyncHandler(async (req, res) => {
  const {
    code, discount_type, discount_value, max_uses, valid_from, valid_until,
    applicable_series, min_amount,
  } = req.body;

  const existing = await Coupon.findOne({ where: { code: code.toUpperCase() } });
  if (existing) throw new AppError('Coupon code already exists', 409);

  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    discount_type,
    discount_value,
    max_uses,
    valid_from,
    valid_until,
    applicable_series: applicable_series || null,
    min_amount: min_amount || 0,
    is_active: true,
  });

  res.status(201).json({ status: 'success', data: { coupon } });
});

// GET /purchases/coupons  [admin]
exports.listCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.findAll({ order: [['createdAt', 'DESC']] });
  res.json({ status: 'success', data: { coupons } });
});

// PUT /purchases/coupons/:id  [admin]
exports.updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByPk(req.params.id);
  if (!coupon) throw new AppError('Coupon not found', 404);

  const allowed = ['discount_value', 'max_uses', 'valid_until', 'is_active', 'min_amount', 'applicable_series'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  await coupon.update(updates);
  res.json({ status: 'success', data: { coupon } });
});

// POST /purchases/validate-coupon  — validate before checkout
exports.validateCoupon = asyncHandler(async (req, res) => {
  const { coupon_code, amount, series_id, test_id } = req.body;
  const { discount, coupon } = await applyCoupon(coupon_code, amount, series_id, test_id);

  res.json({
    status: 'success',
    data: {
      valid: true,
      discount,
      final_amount: Math.max(0, amount - discount),
      coupon: { code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value },
    },
  });
});
