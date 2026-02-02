'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('coupons', [
      {
        code: 'WELCOME100',
        discount: 100,
        discountType: 'flat',
        minPurchase: 500,
        maxDiscount: 100,
        validTill: new Date('2025-12-31'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        code: 'NEWUSER20',
        discount: 20,
        discountType: 'percentage',
        minPurchase: 1000,
        maxDiscount: 500,
        validTill: new Date('2025-06-30'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        code: 'FESTIVE50',
        discount: 50,
        discountType: 'percentage',
        minPurchase: 2000,
        maxDiscount: 1500,
        validTill: new Date('2025-11-15'),
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('coupons', null, {});
  }
};
