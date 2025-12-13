'use strict';

module.exports = (sequelize, DataTypes) => {
  const PDFNote = sequelize.define('PDFNote', {

    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: DataTypes.STRING,
    fileUrl: DataTypes.STRING,
    programId: DataTypes.INTEGER,
    batchId: DataTypes.INTEGER,
    subjectId: DataTypes.INTEGER,
    status: DataTypes.ENUM("active", "inactive")

  }, {
    tableName: 'pdfnotes',
    timestamps: true
  });

  PDFNote.associate = function (models) {
    PDFNote.belongsTo(models.Program, { foreignKey: "programId", as: "program" });
  };

  return PDFNote;
};
