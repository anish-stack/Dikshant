'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.bulkInsert('videocourses', [

      // ----------------------------------------------------
      // Video 1 — YouTube (Active, Demo)
      // ----------------------------------------------------
      {
        imageUrl: 'https://yourcdn.com/videos/thumbnails/polity-intro.jpg',
        title: 'Introduction to Indian Polity',
        videoSource: 'youtube',
        url: 'https://youtube.com/watch?v=abcd1234',

        batchId: 1,
        subjectId: 1,
       

        isDownloadable: false,
        isDemo: true,
        status: 'active',

        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ----------------------------------------------------
      // Video 2 — S3 Storage (Active, Non-demo)
      // ----------------------------------------------------
      {
        imageUrl: 'https://yourcdn.com/videos/thumbnails/geography-lecture-1.jpg',
        title: 'Physical Geography – Lecture 1',
        videoSource: 's3',
        url: 'https://s3.amazonaws.com/yourbucket/geography-lecture1.mp4',

        batchId: 1,
        subjectId: 2,
       

        isDownloadable: true,
        isDemo: false,
        status: 'active',

        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ----------------------------------------------------
      // Video 3 — YouTube (Inactive)
      // ----------------------------------------------------
      {
        imageUrl: 'https://yourcdn.com/videos/thumbnails/history-ancient-1.jpg',
        title: 'Ancient History – Overview',
        videoSource: 'youtube',
        url: 'https://youtube.com/watch?v=xyz7890',

        batchId: 2,
        subjectId: 3,
        programId: 2,

        isDownloadable: false,
        isDemo: false,
        status: 'inactive',

        createdAt: new Date(),
        updatedAt: new Date()
      }

    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('videocourses', null, {});
  }
};
