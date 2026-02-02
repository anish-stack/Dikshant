module.exports = (sequelize, DataTypes) => {
  const ChatMessage = sequelize.define(
    "ChatMessage",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },

      videoId: {
        type: DataTypes.STRING,
        allowNull: false
      },

      userId: {
        type: DataTypes.STRING,
        allowNull: false
      },

      userName: {
        type: DataTypes.STRING,
        allowNull: false
      },

      message: {
        type: DataTypes.TEXT,
        allowNull: false
      },

      messageType: {
        type: DataTypes.ENUM("message", "join", "leave"),
        defaultValue: "message"
      },

      isFromTeacher: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },

      isFlagged: {
        type: DataTypes.BOOLEAN,
        defaultValue: false 
      },

      meta: {
        type: DataTypes.JSON,
        allowNull: true 
      }
    },
    {
      tableName: "chat_messages",
      timestamps: true
    }
  );

  return ChatMessage;
};
