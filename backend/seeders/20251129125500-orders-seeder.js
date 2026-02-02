'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('orders', [
      // ---------------------------------------------------------
      // Order 1 — Batch Purchase (Successful Payment)
      // ---------------------------------------------------------
      {
        userId: 1,
        type: 'batch',
        itemId: 1,

        amount: 30000,
        discount: 2000,
        gst: 18,
        totalAmount: 33160, // after discount + GST

        razorpayOrderId: 'order_12345ABC',
        razorpayPaymentId: 'pay_99999XYZ',
        razorpaySignature: 'signature_abc123',

        status: 'success',
        paymentDate: new Date(),

        accessValidityDays: 365,
        enrollmentStatus: 'active',

        couponId: 1,
        couponCode: 'WELCOME100',
        couponDiscount: 100,
        couponDiscountType: 'flat',

        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ---------------------------------------------------------
      // Order 2 — Test Purchase (Pending Payment)
      // ---------------------------------------------------------
      {
        userId: 2,
        type: 'test',
        itemId: 10,

        amount: 500,
        discount: 0,
        gst: 18,
        totalAmount: 590,

        razorpayOrderId: 'order_88888DEF',
        razorpayPaymentId: null,
        razorpaySignature: null,

        status: 'pending',
        paymentDate: null,

        accessValidityDays: 30,
        enrollmentStatus: 'active',

        couponId: null,
        couponCode: null,
        couponDiscount: null,
        couponDiscountType: null,

        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ---------------------------------------------------------
      // Order 3 — Batch Purchase (Failed Payment)
      // ---------------------------------------------------------
      {
        userId: 3,
        type: 'batch',
        itemId: 3,

        amount: 15000,
        discount: 1500,
        gst: 18,
        totalAmount: 15770,

        razorpayOrderId: 'order_FAIL111',
        razorpayPaymentId: null,
        razorpaySignature: null,

        status: 'failed',
        paymentDate: new Date(),

        accessValidityDays: 0,
        enrollmentStatus: 'cancelled',

        couponId: 2,
        couponCode: 'NEWUSER20',
        couponDiscount: 20,
        couponDiscountType: 'percentage',

        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('orders', null, {});
  }
};
