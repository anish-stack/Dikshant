'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pdfnotes', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },

      title: {
        type: Sequelize.STRING,
        allowNull: false
      },

      fileUrl: {
        type: Sequelize.STRING,
        allowNull: false
      },

      programId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'programs',
          key: 'id'
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },

      batchId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      subjectId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      status: {
        type: Sequelize.ENUM("active", "inactive"),
        defaultValue: "active"
      },

      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE

    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('pdfnotes');
  }
};
