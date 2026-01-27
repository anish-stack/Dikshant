'use strict';
const router = require('express').Router();
const QuizController = require('../controllers/Quiz.controller');
const QuizPlayController = require('../controllers/QuizPlayController');
const { getQuizStatistics } = require('../controllers/QuizQuestions.controller');
const QuizResultController = require('../controllers/QuizResultController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const upload = require("../middleware/upload");


router.post("/quizzes", upload.single("image"), QuizController.createQuiz);
router.put("/quizzes/:id", upload.single("image"), QuizController.updateQuiz);
router.delete("/quizzes/:id", QuizController.deleteQuiz);
router.get("/quizzes", QuizController.getAllQuizzes);
router.get("/quizzes/:id", QuizController.getSingleQuiz);


// Quiz Statistics Route
router.get("/statistics/user", getQuizStatistics);

router.post("/start/:quizId", auth, QuizPlayController.startQuiz);
router.post("/next/:attemptId", auth, QuizPlayController.getNextQuestion);
router.post("/submit/:attemptId", auth, QuizPlayController.submitQuiz);
router.get("/result/:attemptId", auth, QuizPlayController.getAttemptResult);



router.get("/my-attempts/quiz/:quizId", auth, QuizResultController.getUserAttemptsByQuiz);
router.get("/results/:attemptId", QuizResultController.getAttemptResult);


router.get("/admin/quiz/:quizId", auth, role(['admin']), QuizResultController.getAllAttemptsByQuizAdmin);
router.get("/admin/results/:attemptId", auth, role(['admin']), QuizResultController.getAttemptResultAdmin);

module.exports = router;