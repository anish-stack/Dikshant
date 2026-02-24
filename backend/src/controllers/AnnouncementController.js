"use strict";

const { Announcement, Batch } = require("../models");
const redis = require("../config/redis");
const { Op } = require("sequelize");
const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");

class AnnouncementController {

  // CREATE
static async create(req, res) {
  try {
    const {
      title,
      message,
      imageAltText,
      arrowColor,
      arrowBackgroundColor,
      description,
      WantPromote,
      publishDate,
      textSize,
      arrowSize,
      textColor,
      backgroundColor,
      width,
      height,
      isActive,
    } = req.body;

    /* ==============================
       🔹 Basic Validation
    ============================== */

    if (!title || !message || !publishDate) {
      return res.status(400).json({
        message: "Title, message and publishDate are required",
      });
    }

    /* ==============================
       🔹 Image Upload
    ============================== */

    let imageUrl = null;

    if (req.file) {
      imageUrl = await uploadToS3(req.file, "announce-banners");
    }

    /* ==============================
       🔹 Safe WantPromote Parsing
    ============================== */

    let parsedWantPromote = [];

    if (WantPromote !== undefined) {
      try {
        let value = WantPromote;

        // Handle double-stringify case
        while (typeof value === "string") {
          value = JSON.parse(value);
        }

        parsedWantPromote = Array.isArray(value) ? value : [];
      } catch (err) {
        console.error("Invalid WantPromote JSON:", err);
        parsedWantPromote = [];
      }
    }

    /* ==============================
       🔹 Create Announcement
    ============================== */

    const item = await Announcement.create({
      title,
      message,
      description: description || null,
      publishDate,
      textSize: textSize || "16px",
      arrowBackgroundColor: arrowBackgroundColor || "#000000",
      arrowColor: arrowColor || "#ffffff",
      arrowSize,
      imageAltText: imageAltText || null,
      WantPromote: parsedWantPromote,   // ✅ Correct
      textColor: textColor || "#000000",
      backgroundColor: backgroundColor || "#ffffff",
      width: width || "100%",
      height: height || "auto",
      isActive: typeof isActive === "boolean" ? isActive : true,
      image: imageUrl,
    });

    /* ==============================
       🔹 Clear Cache
    ============================== */

    await redis.del("announcements");

    return res.status(201).json({
      message: "Announcement created successfully",
      data: item,
    });

  } catch (error) {
    console.error("Create Announcement Error:", error);

    return res.status(500).json({
      message: "Error creating announcement",
      error: error.message,
    });
  }
}

  // GET ALL
  static async findAll(req, res) {
    try {
      const isAdmin = req.query.isAdmin === "true";

      const whereCondition = isAdmin
        ? {}
        : {
          publishDate: {
            [Op.lte]: new Date(),
          },
        };

      // 🔹 Step 1: Fetch announcements
      const announcements = await Announcement.findAll({
        where: whereCondition,
        order: [["publishDate", "DESC"]],
      });

      // 🔹 Step 2: Collect all batch IDs from WantPromote
      let allBatchIds = [];

      announcements.forEach((ann) => {
        if (ann.WantPromote) {
          try {
            const parsedIds = JSON.parse(ann.WantPromote); // "[9,15,27]" → [9,15,27]
            if (Array.isArray(parsedIds)) {
              allBatchIds.push(...parsedIds);
            }
          } catch (err) {
            console.error("Invalid WantPromote JSON:", err);
          }
        }
      });

      // Remove duplicates
      allBatchIds = [...new Set(allBatchIds)];

      // 🔹 Step 3: Fetch batches
      let batches = [];
      if (allBatchIds.length > 0) {
        batches = await Batch.findAll({
          where: {
            id: {
              [Op.in]: allBatchIds,
            },
          },
          attributes: ["id", "name", "slug", "category", "startDate", "c_status"],
        });
      }

      // Convert batches to map for quick lookup
      const batchMap = {};
      batches.forEach((batch) => {
        batchMap[batch.id] = batch;
      });

      // 🔹 Step 4: Attach batches to each announcement
      const finalData = announcements.map((ann) => {
        let promotedBatches = [];

        if (ann.WantPromote) {
          try {
            const parsedIds = JSON.parse(ann.WantPromote);

            if (Array.isArray(parsedIds)) {
              promotedBatches = parsedIds
                .map((id) => batchMap[id])
                .filter(Boolean);
            }
          } catch (err) {
            console.error("Invalid WantPromote JSON:", err);
          }
        }

        return {
          ...ann.toJSON(),
          promotedBatches,
        };
      });

      return res.json(finalData);

    } catch (error) {
      console.error("Error fetching announcements:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching announcements",
      });
    }
  }



  // GET ONE
static async findOne(req, res) {
  try {
    const item = await Announcement.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: "Announcement not found",
      });
    }

    /* ==============================
       🔹 Safe WantPromote Parsing
    ============================== */

    let parsedIds = [];

    if (item.WantPromote) {
      try {
        let value = item.WantPromote;

        // Handle stringified / double stringified
        while (typeof value === "string") {
          value = JSON.parse(value);
        }

        parsedIds = Array.isArray(value) ? value : [];
      } catch (err) {
        console.error("Invalid WantPromote JSON:", err);
        parsedIds = [];
      }
    }

    /* ==============================
       🔹 Fetch Related Batches
    ============================== */

    let promotedBatches = [];

    if (parsedIds.length > 0) {
      promotedBatches = await Batch.findAll({
        where: {
          id: {
            [Op.in]: parsedIds,
          },
        },
        attributes: ["id", "name", "slug", "category", "startDate","imageUrl","c_status"],
      });
    }

    /* ==============================
       🔹 Final Response
    ============================== */

    return res.json({
      ...item.toJSON(),
      promotedBatches,
    });

  } catch (error) {
    console.error("Error fetching announcement:", error);

    return res.status(500).json({
      message: "Error fetching announcement",
      error: error.message,
    });
  }
}


  // UPDATE
static async update(req, res) {
  try {
    const item = await Announcement.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: "Announcement not found",
      });
    }

    const {
      title,
      message,
      description,
      WantPromote,
      imageAltText,
      arrowColor,
      arrowBackgroundColor,
      publishDate,
      textColor,
      textSize,
      backgroundColor,
      width,
      arrowSize,
      height,
      isActive,
      removeImage,
    } = req.body;

    console.log("Received Update Data:", req.body);

    /* ==============================
       🔹 IMAGE HANDLING
    ============================== */

    let finalImageUrl = item.image;

    const removeImageFlag = removeImage === "true";

    // If user wants to remove existing image
    if (removeImageFlag && item.image) {
      await deleteFromS3(item.image);
      finalImageUrl = null;
    }

    // If new image uploaded
    if (req.file) {
      if (item.image) {
        await deleteFromS3(item.image);
      }
      finalImageUrl = await uploadToS3(req.file, "announce-banners");
    }

    /* ==============================
       🔹 SAFE WantPromote Parsing
    ============================== */

    let parsedWantPromote = item.WantPromote;

    if (WantPromote !== undefined) {
      try {
        let value = WantPromote;

        // Handle double stringify cases
        while (typeof value === "string") {
          value = JSON.parse(value);
        }

        parsedWantPromote = Array.isArray(value) ? value : [];
      } catch (err) {
        console.error("Invalid WantPromote JSON:", err);
        parsedWantPromote = [];
      }
    }

    /* ==============================
       🔹 UPDATE ANNOUNCEMENT
    ============================== */

    await item.update({
      title: title ?? item.title,
      message: message ?? item.message,
      description: description ?? item.description,
      publishDate: publishDate ?? item.publishDate,
      textSize: textSize ?? item.textSize,
      textColor: textColor ?? item.textColor,
      arrowBackgroundColor:
        arrowBackgroundColor ?? item.arrowBackgroundColor,
      arrowColor: arrowColor ?? item.arrowColor,
      image: finalImageUrl,
      arrowSize,
      imageAltText: imageAltText ?? item.imageAltText,
      WantPromote: parsedWantPromote,
      backgroundColor: backgroundColor ?? item.backgroundColor,
      width: width ?? item.width,
      height: height ?? item.height,
      isActive:
        typeof isActive === "boolean"
          ? isActive
          : isActive === "true"
          ? true
          : isActive === "false"
          ? false
          : item.isActive,
    });

    /* ==============================
       🔹 CLEAR CACHE
    ============================== */

    await redis.del("announcements");
    await redis.del(`announcement:${req.params.id}`);

    return res.json({
      message: "Announcement updated successfully",
      data: item,
    });

  } catch (error) {
    console.error("Update Announcement Error:", error);

    return res.status(500).json({
      message: "Error updating announcement",
      error: error.message,
    });
  }
}

  // DELETE
  static async delete(req, res) {
    try {
      const item = await Announcement.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "Announcement not found" });

      await item.destroy();

      await redis.del("announcements");
      await redis.del(`announcement:${req.params.id}`);

      return res.json({ message: "Announcement deleted" });

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error deleting announcement", error });
    }
  }

}

module.exports = AnnouncementController;
