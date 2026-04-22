"use strict";

const { Op } = require("sequelize");

class PositionService {
  // =====================================
  // INSERT POSITION
  // =====================================
  static async insert(
    Model,
    column,
    value,
    where = {},
    transaction = null
  ) {
    let newPosition = Number(value);

    // If empty => add at last
    if (!newPosition || newPosition < 1) {
      const maxPosition = await Model.max(
        column,
        {
          where,
          transaction,
        }
      );

      newPosition =
        (maxPosition || 0) + 1;
    } else {
      // If already exists -> throw error
      const alreadyExists =
        await Model.findOne({
          where: {
            ...where,
            [column]:
              newPosition,
          },
          transaction,
        });

      if (alreadyExists) {
        throw new Error(
          `Position ${newPosition} already exists. Please choose another position.`
        );
      }
    }

    return newPosition;
  }

  // =====================================
  // UPDATE / SWAP POSITION
  // =====================================
  static async swap(
    Model,
    id,
    column,
    newValue,
    where = {},
    transaction = null
  ) {
    const options = {};

    if (transaction) {
      options.transaction = transaction;
    }

    const item = await Model.findByPk(id, options);

    if (!item) return null;

    let position = Number(newValue);

    if (!position || position < 1) {
      const maxPosition = await Model.max(column, {
        where,
        ...options,
      });

      position = (maxPosition || 0) + 1;
    }

    if (position === item[column]) {
      return position;
    }

    const existing = await Model.findOne({
      where: {
        ...where,
        [column]: position,
        id: { [Op.ne]: id },
      },
      ...options,
    });

    if (existing) {
      throw new Error(
        `Position ${position} already exists`
      );
    }

    return position;
  }

  // =====================================
  // REORDER 1,2,3...
  // =====================================
  static async reorder(
    Model,
    column,
    transaction = null
  ) {
    const items =
      await Model.findAll({
        order: [
          [column, "ASC"],
        ],
        transaction,
      });

    for (
      let i = 0;
      i < items.length;
      i++
    ) {
      const newPosition =
        i + 1;

      if (
        items[i][column] !==
        newPosition
      ) {
        await items[i].update(
          {
            [column]:
              newPosition,
          },
          {
            transaction,
          }
        );
      }
    }
  }
}

module.exports =
  PositionService;