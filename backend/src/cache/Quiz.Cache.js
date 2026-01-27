const redis = require("../config/redis");

const QUIZ_KEY_PREFIX = "quiz:";
const QUIZ_LIST_KEY = "quiz:list";
const CACHE_TTL = 60 * 60; // 1 hour

/* =========================
   GET SINGLE QUIZ CACHE
========================= */
const getQuizCache = async (quizId) => {
  const key = `${QUIZ_KEY_PREFIX}${quizId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

/* =========================
   SET SINGLE QUIZ CACHE
========================= */
const setQuizCache = async (quizId, quizData) => {
  const key = `${QUIZ_KEY_PREFIX}${quizId}`;
  await redis.set(key, JSON.stringify(quizData), "EX", CACHE_TTL);
};

/* =========================
   DELETE SINGLE QUIZ CACHE
========================= */
const deleteQuizCache = async (quizId) => {
  const key = `${QUIZ_KEY_PREFIX}${quizId}`;
  await redis.del(key);
};

/* =========================
   CLEAR ALL QUIZ CACHE
========================= */
const clearAllQuizCache = async () => {
  const stream = redis.scanStream({
    match: `${QUIZ_KEY_PREFIX}*`,
  });

  const keys = [];
  for await (const chunk of stream) {
    keys.push(...chunk);
  }

  if (keys.length > 0) {
    await redis.del(keys);
  }

  await redis.del(QUIZ_LIST_KEY);
};

module.exports = {
  getQuizCache,
  setQuizCache,
  deleteQuizCache,
  clearAllQuizCache,
};
