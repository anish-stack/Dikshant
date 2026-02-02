'use strict';

module.exports = (sequelize, DataTypes) => {
  const PDFNote = sequelize.define(
    'PDFNote',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fileUrl: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      programId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      batchId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      videoId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      pdfCategory: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      subjectId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        defaultValue: "active",
      },
    },
    {
      tableName: "pdfnotes",
      timestamps: true,
    }
  );

  PDFNote.associate = function (models) {
    PDFNote.belongsTo(models.Program, {
      foreignKey: "programId",
      as: "program",
    });

    PDFNote.belongsTo(models.PdfCategory, {
      foreignKey: "pdfCategory",
      as: "category",
    });
  };

  return PDFNote;
};
