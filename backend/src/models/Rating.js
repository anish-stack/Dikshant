module.exports = (sequelize, DataTypes) => {
  const AppRating = sequelize.define(
    "AppRating",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      userId: {
        type: DataTypes.INTEGER,
        allowNull: true, // optional if user is not logged in
      },

      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },

      feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      platform: {
        type: DataTypes.ENUM("android", "ios", "web"),
        allowNull: false,
      },

      storeRated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      storeLinkUsed: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "app_ratings",
      timestamps: true,
      underscored: true,
    }
  );

  return AppRating;
};
