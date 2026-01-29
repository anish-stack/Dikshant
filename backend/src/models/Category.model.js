const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Category = sequelize.define(
    "Category",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      title: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      subtitle: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      icon: {
        type: DataTypes.STRING(50), // Feather icon name
        allowNull: false,
      },

      screen: {
        type: DataTypes.STRING(50), // Navigation screen
        allowNull: false,
      },

      filter_key: {
        type: DataTypes.STRING(50), // online / recorded / offline
        allowNull: true,
      },

      gradient_start: {
        type: DataTypes.STRING(20), // #8b5cf6
        allowNull: false,
      },

      gradient_end: {
        type: DataTypes.STRING(20), // #6d28d9
        allowNull: false,
      },

      students_label: {
        type: DataTypes.STRING(50), // "50K+", "Coming Soon"
        allowNull: true,
      },

      coming_soon: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "app_categories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Category;
};
