'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('appsettings', [
      {
        key: 'app_name',
        value: 'Dikshant IAS Academy',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'contact_email',
        value: 'support@dikshantias.com',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'contact_phone',
        value: '+91 9876543210',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'maintenance_mode',
        value: 'off',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'default_language',
        value: 'en',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('appsettings', null, {});
  }
};
