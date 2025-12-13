'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('mcqquestions', [
      // ---------------------------
      // Single Correct Question
      // ---------------------------
      {
        questionType: 'Single',
        positiveMarks: 2,
        negativeMark: -0.66,
        question: 'Which of the following Article deals with the Fundamental Duties?',
        subjectId: 1,
        
        options: JSON.stringify([
          "Article 32",
          "Article 51A",
          "Article 19",
          "Article 21"
        ]),
        
        correctOption: JSON.stringify([1]),   // index based or value based? (array rakha hai)
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ---------------------------
      // Multiple Correct Question
      // ---------------------------
      {
        questionType: 'Multiple',
        positiveMarks: 2,
        negativeMark: -0.66,
        question: 'Which of the following are planets of the Solar System?',
        subjectId: 2,

        options: JSON.stringify([
          "Mercury",
          "Venus",
          "Pluto",
          "Mars"
        ]),

        correctOption: JSON.stringify([0, 1, 3]), // multiple answers
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ---------------------------
      // Single Correct Question
      // ---------------------------
      {
        questionType: 'Single',
        positiveMarks: 1,
        negativeMark: -0.33,
        question: 'Who is known as the father of Indian Constitution?',
        subjectId: 1,

        options: JSON.stringify([
          "Jawaharlal Nehru",
          "Dr. B.R. Ambedkar",
          "Sardar Patel",
          "Rajendra Prasad"
        ]),
        
        correctOption: JSON.stringify([1]),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ---------------------------
      // Single Correct Question
      // ---------------------------
      {
        questionType: 'Single',
        positiveMarks: 1,
        negativeMark: -0.33,
        question: 'In which year did the Revolt of 1857 take place?',
        subjectId: 3,

        options: JSON.stringify([
          "1848",
          "1857",
          "1869",
          "1875"
        ]),
        
        correctOption: JSON.stringify([1]),
        createdAt: new Date(),
        updatedAt: new Date()
      }

    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('mcqquestions', null, {});
  }
};
