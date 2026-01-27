'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'quiz_limit', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'accessValidityDays', // optional (MySQL only)
    });

    await queryInterface.addColumn('orders', 'quiz_attempts_used', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: 'quiz_limit', // optional
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('orders', 'quiz_limit');
    await queryInterface.removeColumn('orders', 'quiz_attempts_used');
  }
};
