const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('dikshant_db', 'root', 'root', {
  host: '127.0.0.1',
  port: 3307,        // IMPORTANT: your Docker mapped port
  dialect: 'mysql',
  logging: false,
  define: { underscored: true, timestamps: true },
  timezone: "+05:30",
  dialectOptions: {
    useUTC: false,
    dateStrings: true,
    typeCast: function (field, next) {
      if (field.type === "DATETIME") return field.string();
      return next();
    },
  },
});

sequelize.authenticate()
  .then(() => console.log('✅ Database connected successfully!'))
  .catch(err => console.error('❌ DB Connection Error:', err));

module.exports = sequelize;
