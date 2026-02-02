"use strict";

const { Support } = require("../models");
const redis = require("../config/redis");

/**
 * 🔹 CREATE SUPPORT TICKET
 * POST /support
 */
exports.create = async (req, res) => {
  try {
    const { name, email, subject, category, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        message: "Name, email, subject and message are required",
      });
    }

    const ticket = await Support.create({
      name,
      email,
      subject,
      category: category || "general",
      message,
    });

    // clear cache
    await redis.del("support:all");

    return res.status(201).json({
      message: "Support ticket created successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("❌ Support Create Error:", error);
    return res.status(500).json({
      message: "Failed to create support ticket",
      error,
    });
  }
};

/**
 * 🔹 GET ALL SUPPORT TICKETS (Admin)
 * GET /support
 */
exports.findAll = async (req, res) => {
  try {
    // const cacheKey = "support:all";
    // const cached = await redis.get(cacheKey);

    // if (cached) {
    //   return res.json(JSON.parse(cached));
    // }

    const tickets = await Support.findAll({
      order: [["created_at", "DESC"]],
    });

    // await redis.set(cacheKey, JSON.stringify(tickets), "EX", 300);

    return res.json(tickets);
  } catch (error) {
    console.error("❌ Support Fetch Error:", error);
    return res.status(500).json({
      message: "Failed to fetch support tickets",
      error,
    });
  }
};

/**
 * 🔹 GET SINGLE TICKET
 * GET /support/:id
 */
exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await Support.findByPk(id);

    if (!ticket) {
      return res.status(404).json({
        message: "Support ticket not found",
      });
    }

    return res.json(ticket);
  } catch (error) {
    console.error("❌ Support FindOne Error:", error);
    return res.status(500).json({
      message: "Failed to fetch support ticket",
      error,
    });
  }
};

/**
 * 🔹 UPDATE TICKET STATUS / RESPONSE (Admin)
 * PUT /support/:id
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, response, assignedTo } = req.body;

    const ticket = await Support.findByPk(id);

    if (!ticket) {
      return res.status(404).json({
        message: "Support ticket not found",
      });
    }

    await ticket.update({
      status: status || ticket.status,
      response: response || ticket.response,
      assignedTo: assignedTo || ticket.assignedTo,
    });

    await redis.del("support:all");

    return res.json({
      message: "Support ticket updated successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("❌ Support Update Error:", error);
    return res.status(500).json({
      message: "Failed to update support ticket",
      error,
    });
  }
};

/**
 * 🔹 DELETE SUPPORT TICKET (Optional)
 * DELETE /support/:id
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await Support.findByPk(id);

    if (!ticket) {
      return res.status(404).json({
        message: "Support ticket not found",
      });
    }

    await ticket.destroy();
    await redis.del("support:all");

    return res.json({
      message: "Support ticket deleted successfully",
    });
  } catch (error) {
    console.error("❌ Support Delete Error:", error);
    return res.status(500).json({
      message: "Failed to delete support ticket",
      error,
    });
  }
};
