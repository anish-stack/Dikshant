'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('testseriess', [
      {
        imageUrl: 'https://yourcdn.com/testseries/upsc-prelims.jpg',
        title: 'UPSC Prelims Test Series 2025',
        slug: 'upsc-prelims-test-series-2025',
        displayOrder: 1,
        status: 'new',
        isActive: true,
        description: 'Comprehensive Prelims test series with detailed solutions and analytics.',
        price: 1999,
        discountPrice: 1499,
        gst: 18,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        imageUrl: 'https://yourcdn.com/testseries/upsc-mains.jpg',
        title: 'UPSC Mains Test Series 2025',
        slug: 'upsc-mains-test-series-2025',
        displayOrder: 2,
        status: 'popular',
        isActive: true,
        description: 'High-quality Mains answer writing test series with feedback from experts.',
        price: 3499,
        discountPrice: 2999,
        gst: 18,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        imageUrl: 'https://yourcdn.com/testseries/pcs-test.jpg',
        title: 'PCS Target Test Series 2025',
        slug: 'pcs-target-test-series-2025',
        displayOrder: 3,
        status: 'featured',
        isActive: false,
        description: 'State PCS focused test series with topic-wise practice tests.',
        price: 999,
        discountPrice: 799,
        gst: 18,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('testseriess', null, {});
  }
};
