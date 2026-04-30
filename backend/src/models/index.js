'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config =
  require(path.join(__dirname, '../../config/config.json'))[env];

const db = {};

let sequelize;

if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

/* =========================================
   LOAD ALL MODEL FILES
========================================= */

fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.endsWith('.js')
    );
  })
  .forEach(file => {
    const imported = require(path.join(__dirname, file));

    /* Case 1: Single model export */
    if (typeof imported === 'function') {
      const model = imported(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
    }

    /* Case 2: Multiple models export */
    else if (typeof imported === 'object') {
      Object.keys(imported).forEach(key => {
        const item = imported[key];

        if (typeof item === 'function') {
          const model = item(sequelize, Sequelize.DataTypes);
          db[model.name] = model;
        }
      });
    }
  });

/* =========================================
   RUN ASSOCIATIONS
========================================= */

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

/* =========================================
   EXPORT
========================================= */

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;