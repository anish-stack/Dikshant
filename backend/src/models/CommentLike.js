// models/CommentLike.js
module.exports = (sequelize, DataTypes) => {
  const CommentLike = sequelize.define(
    "CommentLike",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      commentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "comment_likes",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["commentId", "userId"] }, // Prevent duplicate likes
      ],
    }
  );

  CommentLike.associate = (models) => {
    CommentLike.belongsTo(models.Comment, { foreignKey: "commentId" });
  };

  return CommentLike;
};