'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('scholarshipmcqquestions', [
      // ---------------------------
      // Single Correct Question
      // ---------------------------
      {
        questionType: 'Single',
        positiveMarks: 2,
        negativeMark: -0.66,
        question: 'Who is known as the Iron Man of India?',
        
        options: JSON.stringify([
          "Jawaharlal Nehru",
          "Sardar Vallabhbhai Patel",
          "Mahatma Gandhi",
          "Subhash Chandra Bose"
        ]),
        
        correctOption: JSON.stringify([1]),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ---------------------------
      // Multiple Correct Question
      // ---------------------------
      {
        questionType: 'Multiple',
        positiveMarks: 3,
        negativeMark: -1,
        question: 'Which of the following are classical dances of India?',
        
        options: JSON.stringify([
          "Bharatanatyam",
          "Kathak",
          "Garba",
          "Manipuri"
        ]),

        correctOption: JSON.stringify([0, 1, 3]),
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
        question: 'What is the capital of Madhya Pradesh?',
        
        options: JSON.stringify([
          "Indore",
          "Bhopal",
          "Gwalior",
          "Jabalpur"
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
        negativeMark: -0.25,
        question: 'Which year is known for the Revolt of 1857?',
        
        options: JSON.stringify([
          "1857",
          "1848",
          "1869",
          "1805"
        ]),
        
        correctOption: JSON.stringify([0]),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('scholarshipmcqquestions', null, {});
  }
};
