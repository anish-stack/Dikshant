// screens/Quizstore/useQuizStore.js
import { create } from "zustand";
import axios from "axios";
import { LOCAL_ENDPOINT } from "../constant/api";
import { useAuthStore } from "./auth.store";

export const useQuizStore = create((set, get) => ({
  // ---------------- STATE ----------------
  quiz: null,
  attemptId: null,
  currentQuestionIndex: 0,
  questions: [],
  selectedAnswers: {},
  questionStartTime: null,
  isLastQuestion: false,
  totalQuestions: 0,
  score: null,
  isSubmitted: false,
  loading: false,
  error: null,

  // Timers
  timeRemaining: 0,                  // Overall quiz time (backend controlled)
  timerInterval: null,

  currentQuestionTimer: 30,          // Per-question remaining seconds
  currentQuestionTimeLimit: 30,      // Total time limit for current question
  questionTimerInterval: null,

  // ---------------- HELPERS ----------------
  logAxiosError: (label, err) => {
    console.error(`ERROR ${label}`, {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
      url: err.config?.url,
      method: err.config?.method,
    });
  },

  // ---------------- FETCH QUIZ DETAILS (QuizDetails screen ke liye) ----------------
  fetchQuiz: async (quizId) => {
    console.log("fetchQuiz START:", quizId);

    try {
      const { token } = useAuthStore.getState();

      const res = await axios.get(
        `${LOCAL_ENDPOINT}/quiz/quizzes/${quizId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("fetchQuiz SUCCESS:", res.data);
      set({ quiz: res.data.data, error: null });

    } catch (err) {
      get().logAxiosError("fetchQuiz FAILED", err);
      set({
        error: err.response?.data?.message || "Failed to fetch quiz details",
      });
    }
  },

  // ---------------- START OVERALL TIMER (Safe & Stable) ----------------
startOverallTimer: () => {
  const state = get();
  if (state.timerInterval) clearInterval(state.timerInterval);

  const interval = setInterval(() => {
    set((s) => {
      if (s.timeRemaining <= 1) {
        clearInterval(interval);
        console.warn("Overall time over! User must submit manually");
        // NO AUTO SUBMIT
        return { timeRemaining: 0, timerInterval: null };
      }
      return { timeRemaining: s.timeRemaining - 1 };
    });
  }, 1000);

  set({ timerInterval: interval });
},

  // ---------------- PER-QUESTION TIMER (Auto Next on Time Over) ----------------
  startQuestionTimer: () => {
    const state = get();
    if (state.questionTimerInterval) clearInterval(state.questionTimerInterval);

    const currentQ = state.questions[state.currentQuestionIndex];
    const timeLimit = currentQ?.time_limit || 30; // backend se aaya hoga

    set({
      currentQuestionTimeLimit: timeLimit,
      currentQuestionTimer: timeLimit,
    });

    const interval = setInterval(() => {
      set((s) => {
        if (s.currentQuestionTimer <= 1) {
          clearInterval(interval);
          console.log("Question time over → Auto moving to next");
          get().fetchNextQuestion(null); // null = unanswered due to time over
          return { currentQuestionTimer: 0, questionTimerInterval: null };
        }
        return { currentQuestionTimer: s.currentQuestionTimer - 1 };
      });
    }, 1000);

    set({ questionTimerInterval: interval });
  },

  // ---------------- START QUIZ ----------------
  startQuiz: async (quizId, onSuccess) => {
    console.log("startQuiz START:", quizId);
    set({ loading: true, error: null });

    try {
      const { token } = useAuthStore.getState();

      const res = await axios.post(
        `${LOCAL_ENDPOINT}/quiz/start/${quizId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("startQuiz SUCCESS:", res.data);

      const { data } = res.data;

      set({
        quiz: data.quiz,
        attemptId: data.attemptId,
        currentQuestionIndex: 0,
        questions: data.question ? [data.question] : [],
        timeRemaining: data.timeRemaining || data.quiz.durationMinutes * 60,
        totalQuestions: data.quiz.totalQuestions,
        selectedAnswers: {},
        isSubmitted: false,
        loading: false,
        isLastQuestion: false,
        questionStartTime: Date.now(),
      });

      // Start both timers
      get().startOverallTimer();
      get().startQuestionTimer();

      if (typeof onSuccess === "function") {
        onSuccess({
          isFirstAttempt:
            data.quiz.attempt_limit === 1 || res.data.isFirstAttempt || false,
          quizTitle: data.quiz.title,
        });
      }

    } catch (err) {
      get().logAxiosError("startQuiz FAILED", err);
      set({
        error: err.response?.data?.message || "Failed to start quiz",
        loading: false,
      });
    }
  },

  // ---------------- FETCH NEXT QUESTION ----------------
  fetchNextQuestion: async (selectedOptionId) => {
    const state = get();
    if (state.loading || state.isSubmitted) return;

    const timeTaken = state.questionStartTime
      ? Math.floor((Date.now() - state.questionStartTime) / 1000)
      : null;

    set({ loading: true, error: null });

    try {
      const { token } = useAuthStore.getState();

      const res = await axios.post(
        `${LOCAL_ENDPOINT}/quiz/next/${state.attemptId}`,
        {
          currentIndex: state.currentQuestionIndex,
          selectedOptionId,
          timeTaken,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { data } = res.data;

      // If overall time expired
      if (data.timeExpired) {
        set({ loading: false });
        get().submitQuiz();
        return;
      }

      if (data.isLastQuestion) {
        set({
          isLastQuestion: true,
          loading: false,
          questionStartTime: null,
        });
        // Stop question timer
        if (state.questionTimerInterval) clearInterval(state.questionTimerInterval);
        set({ questionTimerInterval: null });
        return;
      }

      if (data.question) {
        set((s) => ({
          currentQuestionIndex: s.currentQuestionIndex + 1,
          questions: [...s.questions, data.question],
          timeRemaining: data.timeRemaining, // Sync with backend
          loading: false,
          questionStartTime: Date.now(),
        }));

        // Restart per-question timer for new question
        get().startQuestionTimer();
      }

    } catch (err) {
      get().logAxiosError("fetchNextQuestion FAILED", err);
      set({ error: "Failed to load next question", loading: false });
    }
  },

  selectAnswer: (questionId, optionId) => {
  set((state) => ({
    selectedAnswers: {
      ...state.selectedAnswers,
      [questionId]: optionId,
    },
  }));
},
  // ---------------- SUBMIT QUIZ ----------------
  submitQuiz: async (onResult) => {
    const state = get();
    if (state.isSubmitted || !state.attemptId) return;

    console.log("submitQuiz START:", state.attemptId);
    set({ loading: true, isSubmitted: true });

    try {
      const { token } = useAuthStore.getState();

      const res = await axios.post(
        `${LOCAL_ENDPOINT}/quiz/submit/${state.attemptId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("submitQuiz SUCCESS:", res.data);
      const result = res.data.data;

      set({ score: result.score, loading: false });

      if (typeof onResult === "function") {
        onResult(result);
      }

    } catch (err) {
      get().logAxiosError("submitQuiz FAILED", err);
      set({ error: "Failed to submit quiz", loading: false });
    }
  },

  // ---------------- RESET STORE ----------------
  reset: () => {
    const { timerInterval, questionTimerInterval } = get();

    if (timerInterval) clearInterval(timerInterval);
    if (questionTimerInterval) clearInterval(questionTimerInterval);

    set({
      quiz: null,
      attemptId: null,
      currentQuestionIndex: 0,
      questions: [],
      selectedAnswers: {},
      questionStartTime: null,
      isLastQuestion: false,
      totalQuestions: 0,
      score: null,
      isSubmitted: false,
      loading: false,
      error: null,
      timeRemaining: 0,
      timerInterval: null,
      currentQuestionTimer: 30,
      currentQuestionTimeLimit: 30,
      questionTimerInterval: null,
    });
  },
}));