module.exports = (sequelize, DataTypes) => {
  const Support = sequelize.define(
    "Support",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },

      subject: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      category: {
        type: DataTypes.ENUM("general", "technical", "billing", "other"),
        defaultValue: "general",
        allowNull: false,
      },

      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM("pending", "in_progress", "resolved"),
        defaultValue: "pending",
        allowNull: false,
      },

      assignedTo: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      response: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "support_tickets",
      timestamps: true,
      underscored: true,
    }
  );

  return Support;
};
