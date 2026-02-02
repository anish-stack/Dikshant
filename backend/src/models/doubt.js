module.exports = (sequelize, DataTypes) => {
  const Doubt = sequelize.define(
    "Doubt",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // 👤 User who asked the doubt
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      // 📚 Context (optional)
      courseId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      lessonId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // 📝 Doubt content
      subject: {
        type: DataTypes.STRING(255),
        allowNull: true,
       
      },

      question: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },

      // 📎 Optional attachment (image / pdf)
      attachmentUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // 🧑‍🏫 Answer section
      answer: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      answeredBy: {
        type: DataTypes.STRING, // admin / teacher name or id
        allowNull: true,
      },

      answeredAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      // 📊 Status flow
      status: {
        type: DataTypes.ENUM("open", "answered", "closed"),
        allowNull: false,
        defaultValue: "open",
      },

      // 👍 Engagement
      likes: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      tableName: "doubts",
      timestamps: true,
      underscored: true,

      indexes: [
        { fields: ["user_id"] },
        { fields: ["course_id"] },
        { fields: ["lesson_id"] },
        { fields: ["status"] },
        { fields: ["created_at"] },
      ],
    }
  );

  return Doubt;
};
