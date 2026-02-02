 const { Sequelize } = require("sequelize");

const env = process.env.NODE_ENV || "development";
const config = require("../../config/config.json")[env];

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    timezone: config.timezone,
    define: {
      underscored: true,
      timestamps: true,
    },
    dialectOptions: {
      useUTC: false,
      dateStrings: true,
      typeCast(field, next) {
        if (field.type === "DATETIME") return field.string();
        return next();
      },
    },
  }
);

module.exports = sequelize;
    

