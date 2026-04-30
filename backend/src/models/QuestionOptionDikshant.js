'use strict';

const { Model, DataTypes, UUIDV4 } = require('sequelize');

module.exports = (sequelize) => {
  class QuestionOptionDikshant extends Model {
    static associate(models) {
      // Option belongs to Question
      QuestionOptionDikshant.belongsTo(models.QuestionDikshant, {
        foreignKey: 'question_id',
        as: 'question',
      });
    }
  }

  QuestionOptionDikshant.init(
    {
      id: {
        type: DataTypes.CHAR(36),
        defaultValue: UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      question_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: { model: 'questions_dikshant', key: 'id' },
        onDelete: 'CASCADE',
      },
      option_number: {
        type: DataTypes.TINYINT,
        allowNull: false,
        validate: { min: 1, max: 4 },
        comment: '1 / 2 / 3 / 4',
      },
      option_label: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'Display label: A / B / C / D',
      },
      option_text: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: { notEmpty: true },
      },
      option_image: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'QuestionOptionDikshant',
      tableName: 'question_options_dikshant',
      paranoid: false,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deleted_at",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['question_id', 'option_number'],
          name: 'uq_question_option',
        },
        { fields: ['question_id'], name: 'idx_options_question_id' },
      ],
    }
  );

  return QuestionOptionDikshant;
};
