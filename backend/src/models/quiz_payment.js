module.exports = (sequelize, DataTypes) => {
  const QuizPayments = sequelize.define(
    "QuizPayments",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "user_id",
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },

      quizId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "quiz_id", 
        references: {
          model: "quizzes",
          key: "id",
        },
        onDelete: "CASCADE",
      },

      razorpayOrderId: {
        type: DataTypes.STRING(100),
        field: "razorpay_order_id",
        unique: true,
        allowNull: true,
      },

      razorpayPaymentId: {
        type: DataTypes.STRING(100),
        field: "razorpay_payment_id",
        allowNull: true,
      },

      razorpaySignature: {
        type: DataTypes.STRING(500),
        field: "razorpay_signature",
        allowNull: true,
      },

      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },

      currency: {
        type: DataTypes.STRING(10),
        defaultValue: "INR",
      },

      status: {
        type: DataTypes.ENUM("pending", "completed", "failed"),
        defaultValue: "pending",
      },
    },
    {
      tableName: "quiz_payments",
      underscored: true,
      timestamps: true, 
    }
  );

  QuizPayments.associate = function (models) {
    QuizPayments.belongsTo(models.User, {
      foreignKey: "userId", 
      as: "user",
      onDelete: "CASCADE",
    });

    QuizPayments.belongsTo(models.Quizzes, {
      foreignKey: "quizId", 
      as: "quiz",
      onDelete: "CASCADE",
    });
  };

  return QuizPayments;
};
