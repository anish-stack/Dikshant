"use strict";

const { Op } = require("sequelize");

class PositionService {

    static async insert(Model, column, value, transaction = null) {

        let newPosition = Number(value);

        if (!newPosition || newPosition < 1) {

            const maxPosition = await Model.max(column, { transaction });
            newPosition = (maxPosition || 0) + 1;

        } else {

            await Model.increment(
                { [column]: 1 },
                {
                    where: {
                        [column]: { [Op.gte]: newPosition }
                    },
                    transaction
                }
            );
        }

        return newPosition;
    }

    static async swap(Model, id, column, newValue, transaction = null) {

        const item = await Model.findByPk(id, { transaction });

        if (!item) return null;

        let position = Number(newValue);

        if (!position || position < 1) {

            const maxPosition = await Model.max(column, { transaction });
            position = (maxPosition || 0) + 1;

        }

        if (position === item[column]) return position;

        const existing = await Model.findOne({
            where: {
                [column]: position,
                id: { [Op.ne]: id }
            },
            transaction
        });

        if (existing) {

            await existing.update(
                { [column]: item[column] },
                { transaction }
            );

        }

        return position;
    }
static async reorder(Model, column, transaction = null) {

  const items = await Model.findAll({
    order: [[column, "ASC"]],
    transaction
  });

  for (let i = 0; i < items.length; i++) {

    const newPosition = i + 1;

    if (items[i][column] !== newPosition) {

      await items[i].update(
        { [column]: newPosition },
        { transaction }
      );

    }
  }
}
}

module.exports = PositionService;