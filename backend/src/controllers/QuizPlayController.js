const {
    Quizzes,
    QuizQuestions,
    QuizQuestionOptions,
    QuizAttempts,
    StudentAnswers,
    Order,
} = require("../models");
const { Op } = require("sequelize");
const redis = require("../config/redis");

class QuizPlayController {
    static async startQuiz(req, res) {

        const transaction = await Quizzes.sequelize.transaction();
        try {
            const { quizId } = req.params;
            const userId = req.user.id;

            console.log("▶️ START QUIZ:", { quizId, userId });

            /* 1️⃣ Fetch quiz from cache or DB */
            let quiz = await redis.get(`quiz:${quizId}`);
            if (quiz) {
                quiz = JSON.parse(quiz);
                console.log("📦 Quiz from cache");
            } else {
                quiz = await Quizzes.findByPk(quizId, { transaction });
                if (quiz) {
                    await redis.setex(`quiz:${quizId}`, 3600, JSON.stringify(quiz)); // Cache 1 hour
                }
            }

            if (!quiz) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: "Quiz not found",
                });
            }

            if (!quiz.isActive) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Quiz is not active",
                });
            }

            /* 🔒 Fetch order for quiz & lock row */
            const order = await Order.findOne({
                where: {
                    userId,
                    itemId: quizId,
                    type: "quiz",
                    status: "success",
                    enrollmentStatus: "active",
                },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (order) {
                const limit = order.quiz_limit ?? 0;
                const used = order.quiz_attempts_used ?? 0;

                if (limit > 0 && used >= limit) {
                    await transaction.rollback();
                    return res.status(403).json({
                        success: false,
                        message: "Quiz attempt limit reached",
                    });
                }
            }


            /* 2️⃣ Check for existing in-progress attempt */
            const existingAttempt = await QuizAttempts.findOne({
                where: {
                    userId,
                    quizId,
                    status: "in_progress",
                },
                transaction,
            });

            if (existingAttempt) {
                console.log("♻️ RESUMING EXISTING ATTEMPT:", existingAttempt.id);

                let questionOrder = existingAttempt.question_order || [];
                let questions = await redis.get(`quiz:${quizId}:questions`);

                // Parse if string
                if (typeof questionOrder === "string") {
                    try {
                        questionOrder = JSON.parse(questionOrder);
                    } catch (e) {
                        questionOrder = [];
                    }
                }

                // Rebuild if missing
                if (!Array.isArray(questionOrder) || !questionOrder.length) {
                    console.log("🔧 REBUILDING QUESTION ORDER for attempt:", existingAttempt.id);

                    if (questions) {
                        questions = JSON.parse(questions);
                        console.log("📦 Questions from cache");
                    } else {
                        questions = await QuizQuestions.findAll({
                            where: { quiz_id: quizId },
                            order: [["order_num", "ASC"]],
                            raw: true,
                            transaction,
                        });
                        await redis.setex(`quiz:${quizId}:questions`, 3600, JSON.stringify(questions));
                    }


                    if (!questions.length) {
                        await transaction.rollback();
                        return res.status(400).json({
                            success: false,
                            message: "Quiz has no questions",
                        });
                    }

                    // if (quiz.shuffle_questions) {
                    //     questions = shuffleArray([...questions]);
                    // }

                    questions = shuffleArray([...questions]);


                    questionOrder = questions.map((q) => q.id);

                    await existingAttempt.update(
                        { questionOrder: questionOrder },
                        { transaction }
                    );
                }

                // Count answered questions
                const answeredCount = await StudentAnswers.count({
                    where: { attempt_id: existingAttempt.id },
                    transaction,
                });
                console.log("📝 Answered Questions Count:", answeredCount);

                const nextQuestionId = questionOrder[answeredCount];

                if (questions.length === answeredCount) {
                    return await QuizPlayController.submitQuizInternal(existingAttempt.id, userId, res);
                }
                // Try cache first
                let question = await redis.get(`question:${nextQuestionId}`);
                if (question) {
                    question = JSON.parse(question);
                    console.log("📦 Question from cache");
                } else {
                    question = await QuizQuestions.findByPk(nextQuestionId, { transaction });
                    if (question) {
                        await redis.setex(`question:${nextQuestionId}`, 3600, JSON.stringify(question));
                    }
                }

                if (!question) {
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: "Question not found in quiz",
                    });
                }

                // Get options with cache
                let options = await redis.get(`question:${nextQuestionId}:options`);
                if (options) {
                    options = JSON.parse(options);
                    console.log("📦 Options from cache");
                } else {
                    options = await QuizQuestionOptions.findAll({
                        where: { question_id: question.id },
                        order: [["order_num", "ASC"]],
                        raw: true,
                        transaction,
                    });
                    await redis.setex(`question:${nextQuestionId}:options`, 3600, JSON.stringify(options));
                }

                await transaction.commit();

                return res.json({
                    success: true,
                    message: "Quiz resumed (existing attempt)",
                    data: {
                        attemptId: existingAttempt.id,
                        isResumed: true,
                        quiz: {
                            id: quiz.id,
                            title: quiz.title,
                            durationMinutes: quiz.durationMinutes,
                            totalQuestions: quiz.totalQuestions,
                            total_marks: quiz.total_marks,
                            negative_marking: quiz.negative_marking,
                            negative_marks_per_question: quiz.negative_marks_per_question,
                            time_per_question: quiz.time_per_question,
                        },
                        currentQuestionIndex: answeredCount,
                        question: {
                            id: question.id,
                            question_text: question.question_text,
                            question_image: question.question_image,
                            time_limit: question.time_limit || quiz.time_per_question,
                            marks: question.marks,
                            options: options.map((opt) => ({
                                id: opt.id,
                                option_text: opt.option_text,
                                option_image: opt.option_image,
                            })),
                        },
                    },
                });
            }

            /* 3️⃣ Count completed attempts */
            const completedAttempts = await QuizAttempts.count({
                where: {
                    userId,
                    quizId,
                    status: "completed",
                },
                transaction,
            });

            if (quiz.attempt_limit && completedAttempts >= quiz.attempt_limit) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Attempt limit reached (${quiz.attempt_limit}). You cannot take more attempts.`,
                });
            }

            /* 4️⃣ Create new attempt */
            const attempt = await QuizAttempts.create(
                {
                    userId,
                    quizId,
                    attemptNumber: completedAttempts + 1,
                    started_at: new Date(),
                    questionOrder: [],
                    total_marks_obtained: 0,
                    status: "in_progress",
                },
                { transaction }
            );

            /* ➕ Increment quiz_attempts_used */
            if (order) {
                await order.increment("quiz_attempts_used", {
                    by: 1,
                    transaction,
                });
            }

            /* 5️⃣ Fetch questions with cache */
            let questions = await redis.get(`quiz:${quizId}:questions`);
            if (questions) {
                questions = JSON.parse(questions);
                console.log("📦 Questions from cache");
            } else {
                questions = await QuizQuestions.findAll({
                    where: { quiz_id: quizId },
                    order: [["order_num", "ASC"]],
                    raw: true,
                    transaction,
                });
                await redis.setex(`quiz:${quizId}:questions`, 3600, JSON.stringify(questions));
            }

            if (!questions.length) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Quiz has no questions",
                });
            }

            questions = shuffleArray([...questions]);


            const questionOrder = questions.map((q) => q.id);

            await attempt.update(
                { questionOrder: questionOrder },
                { transaction }
            );

            /* 6️⃣ Fetch first question options with cache */
            const firstQuestion = questions[0];

            let options = await redis.get(`question:${firstQuestion.id}:options`);
            if (options) {
                options = JSON.parse(options);
                console.log("📦 Options from cache");
            } else {
                options = await QuizQuestionOptions.findAll({
                    where: { question_id: firstQuestion.id },
                    order: [["order_num", "ASC"]],
                    raw: true,
                    transaction,
                });
                await redis.setex(`question:${firstQuestion.id}:options`, 3600, JSON.stringify(options));
            }
            options = shuffleArray([...options]);
            // Store attempt state in Redis for quick access
            await redis.setex(`attempt:${attempt.id}`, 86400, JSON.stringify({
                attemptId: attempt.id,
                userId,
                quizId,
                questionOrder,
                status: "in_progress",
            }));

            await transaction.commit();

            return res.json({
                success: true,
                message: "Quiz started successfully",
                data: {
                    attemptId: attempt.id,
                    isResumed: false,
                    quiz: {
                        id: quiz.id,
                        title: quiz.title,
                        durationMinutes: quiz.durationMinutes,
                        totalQuestions: quiz.totalQuestions,
                        total_marks: quiz.total_marks,
                        negative_marking: quiz.negative_marking,
                        negative_marks_per_question: quiz.negative_marks_per_question,
                        time_per_question: quiz.time_per_question,
                    },
                    currentQuestionIndex: 0,
                    question: {
                        id: firstQuestion.id,
                        question_text: firstQuestion.question_text,
                        question_image: firstQuestion.question_image,
                        time_limit: firstQuestion.time_limit || quiz.time_per_question,
                        marks: firstQuestion.marks,
                        options: options.map((opt) => ({
                            id: opt.id,
                            option_text: opt.option_text,
                            option_image: opt.option_image,
                        })),
                    },
                },
            });

        } catch (error) {
            await transaction.rollback();
            console.error("❌ START QUIZ ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to start quiz",
                error: process.env.NODE_ENV === "development" ? error.message : undefined,
            });
        }
    }

    /* GET NEXT QUESTION - FULLY UPDATED WITH BACKEND TIMER */
    static async getNextQuestion(req, res) {
        const transaction = await Quizzes.sequelize.transaction();

        try {
            const { attemptId } = req.params;
            const { currentIndex, selectedOptionId, timeTaken } = req.body;
            const userId = req.user.id;

            console.log("GET NEXT QUESTION:", { attemptId, currentIndex, selectedOptionId, timeTaken });

            /* ---------------- 1. Fetch Attempt ---------------- */
            const attempt = await QuizAttempts.findOne({
                where: {
                    id: attemptId,
                    userId,
                    status: "in_progress",
                },
                transaction,
            });

            if (!attempt) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: "Attempt not found or already completed",
                });
            }

            /* ---------------- 2. Fetch Quiz ---------------- */
            const quiz = await Quizzes.findByPk(attempt.quizId, { transaction });
            if (!quiz) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: "Quiz not found" });
            }

            /* ---------------- 3. TIMER CHECK: OVERALL TIME EXPIRED? ---------------- */
            if (attempt.endsAt) {
                const now = new Date();
                const endTime = new Date(attempt.endsAt);

                if (now >= endTime) {
                    await transaction.rollback();
                    console.warn("TIME EXPIRED - Auto blocking next question", { attemptId });

                    return res.status(400).json({
                        success: false,
                        message: "Quiz time has expired!",
                        timeExpired: true,
                        action: "auto_submit",
                    });
                }

                // Calculate remaining seconds
                const timeRemaining = Math.max(0, Math.floor((endTime - now) / 1000));
                console.log("Remaining overall time:", timeRemaining, "seconds");
            }

            /* ---------------- 4. Parse Question Order ---------------- */
            let questionOrder = attempt.questionOrder || [];
            if (typeof questionOrder === "string") {
                try { questionOrder = JSON.parse(questionOrder); } catch { questionOrder = []; }
            }

            if (!Array.isArray(questionOrder) || questionOrder.length === 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: "Invalid question order" });
            }

            /* ---------------- 5. Save Current Answer (if selected) ---------------- */
            if (selectedOptionId !== undefined && selectedOptionId !== null) {
                const currentQuestionId = questionOrder[currentIndex];
                const question = await QuizQuestions.findByPk(currentQuestionId, { transaction });
                if (!question) throw new Error("Question not found");

                const correctOption = await QuizQuestionOptions.findOne({
                    where: { question_id: currentQuestionId, is_correct: true },
                    transaction,
                });

                let isCorrect = false;
                let marksObtained = 0;
                let selectedOptionIdToSave = selectedOptionId;
                if (selectedOptionId !== undefined && selectedOptionId !== null) {

                    if (correctOption) {
                        isCorrect = Number(selectedOptionId) === Number(correctOption.id);
                        marksObtained = isCorrect
                            ? Number(question.marks)
                            : quiz.negative_marking
                                ? -Number(quiz.negative_marks_per_question || 0)
                                : 0;
                    }
                } else {

                    isCorrect = false;
                    marksObtained = 0;
                    selectedOptionIdToSave = null;
                    console.log("Question not attempted by user");
                }

                await StudentAnswers.upsert({
                    attemptId: attempt.id,
                    questionId: currentQuestionId,
                    selectedOptionId: selectedOptionIdToSave,
                    isCorrect,
                    marksObtained,
                    timeTaken: timeTaken || null,
                    answeredAt: new Date(),
                }, { transaction });

                console.log("Answer recorded:", {
                    questionId: currentQuestionId,
                    selectedOptionId: selectedOptionIdToSave,
                    isCorrect,
                    marksObtained,
                    status: selectedOptionId === null ? "Not Attempted" : isCorrect ? "Correct" : "Wrong"
                });
            }

            /* ---------------- 6. Next Index ---------------- */
            const nextIndex = currentIndex + 1;

            /* ---------------- 7. Last Question? ---------------- */
            if (nextIndex >= questionOrder.length) {
                await transaction.commit();

                const remaining = attempt.endsAt
                    ? Math.max(0, Math.floor((new Date(attempt.endsAt) - new Date()) / 1000))
                    : 0;

                return res.json({
                    success: true,
                    data: {
                        isLastQuestion: true,
                        currentQuestionIndex: currentIndex,
                        totalQuestions: questionOrder.length,
                        timeRemaining: remaining,
                        message: "Last question reached. Please submit quiz.",
                    },
                });
            }

            /* ---------------- 8. Fetch Next Question ---------------- */
            const nextQuestionId = questionOrder[nextIndex];
            const nextQuestion = await QuizQuestions.findByPk(nextQuestionId, { transaction });

            if (!nextQuestion) {
                await transaction.commit();
                const remaining = attempt.endsAt
                    ? Math.max(0, Math.floor((new Date(attempt.endsAt) - new Date()) / 1000))
                    : 0;

                return res.json({
                    success: true,
                    data: {
                        isLastQuestion: true,
                        currentQuestionIndex: currentIndex,
                        totalQuestions: questionOrder.length,
                        timeRemaining: remaining,
                    },
                });
            }

            /* ---------------- 9. Fetch & Shuffle Options ---------------- */
            let options = await QuizQuestionOptions.findAll({
                where: { question_id: nextQuestionId },
                order: [["order_num", "ASC"]],
                raw: true,
                transaction,
            });

            options = shuffleArray([...options]);

            await transaction.commit();

            /* ---------------- 10. FINAL RESPONSE WITH TIMER ---------------- */
            const timeRemaining = attempt.endsAt
                ? Math.max(0, Math.floor((new Date(attempt.endsAt) - new Date()) / 1000))
                : 0;

            const perQuestionTimeLimit = nextQuestion.time_limit || quiz.time_per_question || 30;

            return res.json({
                success: true,
                data: {
                    isLastQuestion: false,
                    currentQuestionIndex: nextIndex,
                    totalQuestions: questionOrder.length,
                    timeRemaining, // ← Overall time (backend controlled)
                    question: {
                        id: nextQuestion.id,
                        question_text: nextQuestion.question_text,
                        question_image: nextQuestion.question_image,
                        time_limit: perQuestionTimeLimit, // ← For per-question timer
                        marks: nextQuestion.marks,
                        options: options.map(opt => ({
                            id: opt.id,
                            option_text: opt.option_text,
                            option_image: opt.option_image,
                        })),
                    },
                },
            });

        } catch (error) {
            await transaction.rollback();
            console.error("GET NEXT QUESTION ERROR:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to load next question",
                error: process.env.NODE_ENV === "development" ? error.message : undefined,
            });
        }
    }
    static async submitQuiz(req, res) {
        try {
            const { attemptId } = req.params;
            console.log("🛑 SUBMIT QUIZ REQUEST:", { attemptId });
            const userId = req.user.id;

            const attempt = await QuizAttempts.findOne({
                where: {
                    id: attemptId,
                    userId,
                    status: "in_progress",
                },
            });

            if (!attempt) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid attempt or already submitted",
                });
            }

            return await QuizPlayController.submitQuizInternal(attemptId, userId, res);

        } catch (error) {
            console.error("❌ SUBMIT QUIZ ERROR:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to submit quiz",
                error: process.env.NODE_ENV === "development" ? error.message : undefined,
            });
        }
    }

    /* Internal submit logic */
    static async submitQuizInternal(attemptId, userId, res) {
        console.log("🟢 SUBMIT QUIZ START", { attemptId, userId });

        if (!attemptId || !userId) {
            console.warn("⚠️ Missing attemptId or userId");
            return res.status(400).json({
                success: false,
                message: "attemptId and userId are required",
            });
        }

        const transaction = await Quizzes.sequelize.transaction();

        try {
            /* ---------------- Fetch Attempt ---------------- */
            const attempt = await QuizAttempts.findOne({
                where: {
                    id: attemptId,
                    userId,
                    status: "in_progress",
                },
                transaction,
            });

            if (!attempt) {
                console.warn("⚠️ Attempt not found or already completed", {
                    attemptId,
                    userId,
                });

                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Attempt not found or already submitted",
                });
            }

            console.log("✅ Attempt found", {
                quizId: attempt.quizId,
                questionOrder: attempt.question_order,
                attemptNumber: attempt.attemptNumber,
            });

            /* ---------------- Fetch Quiz ---------------- */
            const quiz = await Quizzes.findByPk(attempt.quizId, { transaction });

            if (!quiz) {
                console.error("❌ Quiz not found for attempt", attempt.quizId);
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: "Quiz not found",
                });
            }

            /* ---------------- Parse Question Order ---------------- */
            let questionOrder = attempt.questionOrder || [];

            if (typeof questionOrder === "string") {
                try {
                    questionOrder = JSON.parse(questionOrder);
                } catch (err) {
                    console.error("❌ Invalid questionOrder JSON", err);
                    questionOrder = [];
                }
            }

            if (!Array.isArray(questionOrder) || questionOrder.length === 0) {
                console.warn("⚠️ Empty question order", { attemptId });
            }

            console.log("📌 Question Order:", questionOrder);

            /* ---------------- Fetch User Answers ---------------- */
            const userAnswers = await StudentAnswers.findAll({
                where: { attempt_id: attemptId },
                raw: true,
                transaction,
            });

            console.log("📝 User Answers Count:", userAnswers.length);

            /* ---------------- Fetch Questions ---------------- */
            const questions = await QuizQuestions.findAll({
                where: { quiz_id: quiz.id },
                transaction,
            });

            if (!questions.length) {
                console.error("❌ No questions found for quiz", quiz.id);
            }

            /* ---------------- Fetch Options ---------------- */
            const allOptions = await QuizQuestionOptions.findAll({
                where: { question_id: questions.map(q => q.id) },
                raw: true,
                transaction,
            });

            console.log("📦 Questions:", questions.length, "Options:", allOptions.length);

            let obtainedMarks = 0;
            const resultQuestions = [];

            /* ---------------- Calculate Marks ---------------- */
            for (const questionId of questionOrder) {
                const question = questions.find(q => q.id === questionId);

                if (!question) {
                    console.warn("⚠️ Question missing", questionId);
                    continue;
                }

                const userAnswer = userAnswers.find(
                    a => Number(a.questionId) === Number(questionId)
                );
                console.log("🧐 Evaluating Question:", userAnswer);
                const correctOption = allOptions.find(
                    o => o.question_id === questionId && o.is_correct === true
                );

                let isCorrect = false;
                let marksAwarded = 0;

                if (userAnswer) {
                    isCorrect = Boolean(userAnswer.isCorrect);
                    marksAwarded = Number(userAnswer.marksObtained || 0);
                }


                obtainedMarks += marksAwarded;

                console.log("🧮 Question Result", {
                    questionId,
                    isCorrect,
                    marksAwarded,
                });

                resultQuestions.push({
                    question_id: questionId,
                    question_text: question.question_text,
                    user_selected_option_id: userAnswer?.selectedOptionId || null,
                    correct_option_id: correctOption?.id || null,
                    is_correct: isCorrect,
                    marks_awarded: marksAwarded,
                    marks_total: question.marks,
                    explanation: quiz.show_explanations ? question.explanation : null,
                    hint: quiz.show_hints ? question.hint : null,

                    // 🔥 YEH NAYA PART ADD KAR DO 🔥
                    options: allOptions
                        .filter(o => o.question_id === questionId)
                        .map(o => ({
                            option_id: o.id,
                            option_text: o.option_text,
                            is_correct: o.is_correct,
                        }))
                        .sort((a, b) => a.option_id - b.option_id), // optional: order by ID
                });

            }

            obtainedMarks = Math.max(0, obtainedMarks);
            /* ---------------- Update Attempt ---------------- */
            const totalMarks =
                quiz.total_marks ?? quiz.totalMarks ?? 0;

            const percentage =
                totalMarks > 0
                    ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2))
                    : 0;

            console.log("🏁 FINAL SCORE", {
                obtainedMarks,
                totalMarks: totalMarks,
            });


            await attempt.update(
                {
                    status: "completed",
                    completedAt: new Date(),
                    totalMarks: totalMarks,
                    totalMarksObtained: obtainedMarks,
                    percentage: percentage,
                },
                { transaction }
            );

            await transaction.commit();

            /* ---------------- Cache Cleanup ---------------- */
            await redis.del(`attempt:${attemptId}`);

            console.log("✅ QUIZ SUBMITTED SUCCESSFULLY");

            return res.json({
                success: true,
                message: "Quiz submitted successfully",
                data: {
                    attemptId: attempt.id,
                    attemptNumber: attempt.attemptNumber,
                    score: obtainedMarks,
                    totalMarks: totalMarks,
                    percentage: percentage,
                    passingMarks: quiz.passingMarks,
                    passed: obtainedMarks >= quiz.passingMarks,
                    totalQuestions: questionOrder.length,
                    questions: resultQuestions,
                    submittedAt: new Date().toISOString(),
                },
            });

        } catch (error) {
            await transaction.rollback();
            console.error("❌ SUBMIT QUIZ INTERNAL ERROR:", error);
            throw error;
        }
    }


    /* GET ATTEMPT RESULT */
    static async getAttemptResult(req, res) {
        try {
            const { attemptId } = req.params;
            const userId = req.user.id;

            const attempt = await QuizAttempts.findOne({
                where: {
                    id: attemptId,
                    userId,
                    status: "completed",
                },
            });

            if (!attempt) {
                return res.status(404).json({
                    success: false,
                    message: "Result not found",
                });
            }

            const quiz = await Quizzes.findByPk(attempt.quizId);
            const userAnswers = await StudentAnswers.findAll({
                where: { attempt_id: attemptId },
            });

            const questions = await QuizQuestions.findAll({
                where: { quiz_id: quiz.id },
            });

            const allOptions = await QuizQuestionOptions.findAll({
                where: { question_id: questions.map((q) => q.id) },
            });

            let questionOrder = attempt.question_order || [];

            if (typeof questionOrder === "string") {
                try {
                    questionOrder = JSON.parse(questionOrder);
                } catch (e) {
                    questionOrder = [];
                }
            }

            const resultQuestions = [];

            for (const questionId of questionOrder) {
                const question = questions.find((q) => q.id === questionId);
                const userAnswer = userAnswers.find((a) => a.question_id === questionId);
                const correctOption = allOptions.find(
                    (o) => o.question_id === questionId && o.is_correct === true
                );

                resultQuestions.push({
                    question_id: questionId,
                    question_text: question.question_text,
                    user_selected_option_id: userAnswer?.selected_option_id || null,
                    correct_option_id: correctOption?.id || null,
                    is_correct: userAnswer
                        ? userAnswer.selected_option_id === correctOption?.id
                        : false,
                    explanation: quiz.show_explanations ? question.explanation : null,
                    hint: quiz.show_hints ? question.hint : null,
                });
            }

            return res.json({
                success: true,
                data: {
                    attemptId: attempt.id,
                    attemptNumber: attempt.attemptNumber,
                    score: attempt.total_marks_obtained,
                    totalMarks: quiz.total_marks,
                    percentage: ((attempt.total_marks_obtained / quiz.total_marks) * 100).toFixed(2),
                    passingMarks: quiz.passing_marks,
                    passed: attempt.total_marks_obtained >= quiz.passing_marks,
                    totalQuestions: questionOrder.length,
                    questions: resultQuestions,
                    submittedAt: attempt.completed_at,
                },
            });

        } catch (error) {
            console.error("❌ GET RESULT ERROR:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch result",
            });
        }
    }
}

/* Helper: Shuffle array */
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

module.exports = QuizPlayController;