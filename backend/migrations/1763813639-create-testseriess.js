'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('testseriess', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },

      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },

      title: {
        type: Sequelize.STRING,
        allowNull: false
      },

      slug: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },

      displayOrder: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },

      status: {
        type: Sequelize.ENUM("new", "popular", "featured"),
        defaultValue: "new"
      },

      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      price: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },

      discountPrice: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },

      gst: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },


      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('testseriess');
  }
};
