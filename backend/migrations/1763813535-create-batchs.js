'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('batchs', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },

      name: Sequelize.STRING,
      slug: {
        type: Sequelize.STRING,
        unique: true
      },

      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },

      displayOrder: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },

      programId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'programs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      subjectId: {
        type: Sequelize.JSON,
        allowNull: false
      },
      startDate: Sequelize.DATE,
      endDate: Sequelize.DATE,

      registrationStartDate: Sequelize.DATE,
      registrationEndDate: Sequelize.DATE,

      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        defaultValue: 'active'
      },

      shortDescription: Sequelize.STRING,
      longDescription: Sequelize.TEXT,

      batchPrice: Sequelize.FLOAT,
      batchDiscountPrice: Sequelize.FLOAT,
      gst: Sequelize.FLOAT,
      offerValidityDays: Sequelize.INTEGER,

      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE

    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('batchs');
  }
};
