module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define(
    "Comment",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      videoId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      userId: {
        type: DataTypes.INTEGER, // 🔥 FIX HERE
        allowNull: false,
      },

      userName: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      parentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      likes: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "comments",
      timestamps: true,
      underscored: false, // 🔥 IMPORTANT (camelCase 유지)
    }
  );

  Comment.associate = (models) => {
    Comment.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
    });
  };

  return Comment;
};
