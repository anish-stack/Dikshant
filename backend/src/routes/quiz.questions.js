const express = require("express");
const router = express.Router({ mergeParams: true }); // Important: mergeParams to access :quizId

const upload = require("../middleware/upload");
const QuizQuestionsController = require("../controllers/QuizQuestions.controller");

router.post(
  "/",
  upload.single("question_image"),
  QuizQuestionsController.addSingleQuestion
);
router.post("/bulk", QuizQuestionsController.addBulkQuestions);
router.post(
  "/excel",
  upload.single("file"), 
  QuizQuestionsController.addQuestionsFromExcel
);
router.get("/", QuizQuestionsController.getQuizQuestions);

router.put(
  "/:questionId",
  upload.single("question_image"), // Optional new image
  QuizQuestionsController.updateQuestion
);
router.delete("/:questionId", QuizQuestionsController.deleteQuestion);

module.exports = router;