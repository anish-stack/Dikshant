'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('banners', {

    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },

    title: {
      type: Sequelize.STRING
    },

    imageUrl: {
      type: Sequelize.STRING
    },

    linkUrl: {
      type: Sequelize.STRING
    },

    createdAt: {
      allowNull: false,
      type: Sequelize.DATE
    },
    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE
    }

    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('banners');
  }
};
