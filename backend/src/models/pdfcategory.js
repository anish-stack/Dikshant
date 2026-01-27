'use strict';

module.exports = (sequelize, DataTypes) => {
  const PdfCategory = sequelize.define(
    'PdfCategory',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        defaultValue: "active",
      },
    },
    {
   tableName: 'pdf_categories',
      timestamps: true,
    }
  );

  PdfCategory.associate = function (models) {
    PdfCategory.hasMany(models.PDFNote, {
      foreignKey: 'pdfCategory',
      as: 'pdfNotes',
    });
  };

  return PdfCategory;
};
