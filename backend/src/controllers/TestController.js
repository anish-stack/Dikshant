"use strict";

const { Test } = require("../models");
const redis = require("../config/redis");
const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");
const { generateSlug } = require("../utils/helpers");


// Smart JSON parser (supports JSON + comma separated)
function safeParse(input) {
  if (!input) return null;

  try {
    // If valid JSON (e.g. ["a","b"])
    return JSON.parse(input);
  } catch (err) {
    // If comma separated -> convert to array
    return input.split(",").map((i) => i.trim());
  }
}


class TestController {

  // CREATE TEST
  static async create(req, res) {
    try {

      let solutionFileUrl = null;

      if (req.file) {
        solutionFileUrl = await uploadToS3(req.file, "tests");
      }

      /* ================= POSITION HANDLING ================= */

      let position = Number(req.body.displayOrder);

      if (!position || position < 1) {
        const maxPosition = await Test.max("displayOrder");
        position = (maxPosition || 0) + 1;
      }

      const existingTest = await Test.findOne({
        where: { displayOrder:position },
        attributes: ["id", "title", "displayOrder"]
      });

      if (existingTest) {

        const maxPosition = await Test.max("displayOrder");

        return res.status(400).json({
          success: false,
          message: `Position ${position} is already used by test "${existingTest.title}" - Available position: ${(maxPosition || 0) + 1}.`,
          suggestedPosition: (maxPosition || 0) + 1
        });
      }

      /* ================= PAYLOAD ================= */

      const payload = {
        title: req.body.title,
        slug: generateSlug(req.body.title),

        displayOrder: req.body.displayOrder,
        position,

        testSeriesId: req.body.testSeriesId,
        reattemptAllowed: req.body.reattemptAllowed,

        type: req.body.type,
        resultGenerationTime: req.body.resultGenerationTime,

        isDemo: req.body.isDemo,
        duration: req.body.duration,
        status: req.body.status,

        startTime: req.body.startTime,
        endTime: req.body.endTime,

        solutionFileUrl,

        languages: safeParse(req.body.languages),
        subjectId: safeParse(req.body.subjectId),
        noOfQuestions: safeParse(req.body.noOfQuestions),

        passingPercentage: req.body.passingPercentage
      };

      /* ================= CREATE ================= */

      const item = await Test.create(payload);

      await redis.del("tests");

      return res.status(201).json({
        success: true,
        message: "Test created successfully",
        data: item
      });

    } catch (error) {

      console.error("Create Test Error:", error);

      return res.status(500).json({
        success: false,
        message: error || "Error creating test",
        error: error.message
      });
    }
  }



  // GET ALL TESTS
  static async findAll(req, res) {
    try {

      const items = await Test.findAll({
        order: [["displayOrder", "ASC"]]
      });

      return res.json({
        success: true,
        data: items
      });

    } catch (error) {

      console.error("Fetch Tests Error:", error);

      return res.status(500).json({
        success: false,
        message: "Error fetching tests",
        error: error.message
      });
    }
  }


  // GET TEST BY ID
  static async findOne(req, res) {
    try {
      const id = req.params.id;
      const item = await Test.findByPk(id);

      if (!item) return res.status(404).json({ message: "Test not found" });
      return res.json(item);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error fetching test", error });
    }
  }



  // UPDATE TEST
  static async update(req, res) {
    try {

      const item = await Test.findByPk(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Test not found"
        });
      }

      /* ================= POSITION HANDLING ================= */

      let position =
        req.body.displayOrder !== undefined
          ? Number(req.body.displayOrder)
          : item.displayOrder;

      if (req.body.displayOrder !== undefined) {

        if (!position || position < 1) {
          const maxPosition = await Test.max("displayOrder");
          position = (maxPosition || 0) + 1;
        }

        const existingTest = await Test.findOne({
          where: {
            displayOrder: position,
            id: { [Op.ne]: item.id }
          },
          attributes: ["id", "title", "displayOrder"]
        });

        if (existingTest) {

          const maxPosition = await Test.max("displayOrder");

          return res.status(400).json({
            success: false,
            message: `Display order ${position} is already used by test "${existingTest.title}" - Available display order: ${(maxPosition || 0) + 1}.`,
            suggestedPosition: (maxPosition || 0) + 1
          });
        }
      }

      /* ================= FILE HANDLING ================= */

      let solutionFileUrl = item.solutionFileUrl;

      if (req.file) {

        if (item.solutionFileUrl) {
          try {
            await deleteFromS3(item.solutionFileUrl);
          } catch (s3Error) {
            console.error("S3 Delete Error:", s3Error);
          }
        }

        solutionFileUrl = await uploadToS3(req.file, "tests");
      }

      /* ================= UPDATE ================= */

      await item.update({

        title: req.body.title || item.title,

        slug: req.body.title
          ? generateSlug(req.body.title)
          : item.slug,

        displayOrder: req.body.displayOrder || item.displayOrder,

        position,

        testSeriesId: req.body.testSeriesId || item.testSeriesId,

        reattemptAllowed:
          req.body.reattemptAllowed !== undefined
            ? req.body.reattemptAllowed
            : item.reattemptAllowed,

        type: req.body.type || item.type,

        resultGenerationTime:
          req.body.resultGenerationTime || item.resultGenerationTime,

        isDemo:
          req.body.isDemo !== undefined
            ? req.body.isDemo
            : item.isDemo,

        duration: req.body.duration || item.duration,

        status: req.body.status || item.status,

        startTime: req.body.startTime || item.startTime,

        endTime: req.body.endTime || item.endTime,

        solutionFileUrl,

        languages: req.body.languages
          ? safeParse(req.body.languages)
          : item.languages,

        subjectId: req.body.subjectId
          ? safeParse(req.body.subjectId)
          : item.subjectId,

        noOfQuestions: req.body.noOfQuestions
          ? safeParse(req.body.noOfQuestions)
          : item.noOfQuestions,

        passingPercentage:
          req.body.passingPercentage || item.passingPercentage
      });

      /* ================= CACHE CLEAR ================= */

      await redis.del("tests");
      await redis.del(`test:${req.params.id}`);

      return res.json({
        success: true,
        message: "Test updated successfully",
        data: item
      });

    } catch (error) {

      console.error("Update Test Error:", error);

      return res.status(500).json({
        success: false,
        message: "Error updating test",
        error: error.message
      });
    }
  }


  // DELETE TEST
  static async delete(req, res) {
    try {
      const item = await Test.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "Test not found" });

      if (item.solutionFileUrl) {
        await deleteFromS3(item.solutionFileUrl);
      }

      await item.destroy();

      await redis.del("tests");
      await redis.del(`test:${req.params.id}`);

      return res.json({ message: "Test deleted" });

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error deleting test", error });
    }
  }

  static async getQuestions(req, res) {
    try {
      const { id } = req.params; // testId
      const test = await Test.findByPk(id);
      if (!test) return res.status(404).json({ message: 'Test not found' });

      const subjectIds = test.subjectId || [];       // JSON array
      const noOfQuestions = test.noOfQuestions || {}; // e.g. { "1": 10, "2": 5 }

      let questions = [];

      for (const subjId of subjectIds) {
        const limit = noOfQuestions[subjId] || 0;
        if (!limit) continue;

        const qs = await MCQQuestion.findAll({
          where: { subjectId: subjId },
          limit
        });

        questions = questions.concat(qs);
      }

      return res.json({ test, questions });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching test questions', error });
    }
  }
}

module.exports = TestController;
