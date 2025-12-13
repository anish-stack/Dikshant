'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('pages', [
      {
        title: 'About Us',
        slug: 'about-us',
        content: 'This page contains information about our institute, mission, and vision.',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Privacy Policy',
        slug: 'privacy-policy',
        content: 'This page includes our privacy policy details explaining how user data is handled.',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Terms & Conditions',
        slug: 'terms-and-conditions',
        content: 'This page contains the terms and conditions for using our platform.',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('pages', null, {});
  }
};
