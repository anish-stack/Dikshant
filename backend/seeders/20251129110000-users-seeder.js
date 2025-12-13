'use strict';

const bcrypt = require('bcryptjs'); // If password hashing is needed

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.bulkInsert('users', [
      // -----------------------------------
      // Admin User
      // -----------------------------------
      {
        name: 'Admin User',
        email: 'admin@example.com',
        mobile: '9999999999',
        password: bcrypt.hashSync('Admin@123', 10),
        role: 'admin',
        otp: null,
        otp_expiry: null,
        is_verified: true,
        is_active: true,
        state: 'Delhi',
        city: 'New Delhi',
        address: 'HQ Office, Karol Bagh',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // -----------------------------------
      // Instructor User
      // -----------------------------------
      {
        name: 'Rajesh Kumar',
        email: 'instructor@example.com',
        mobile: '8888888888',
        password: bcrypt.hashSync('Instructor@123', 10),
        role: 'instructor',
        otp: null,
        otp_expiry: null,
        is_verified: true,
        is_active: true,
        state: 'Uttar Pradesh',
        city: 'Lucknow',
        address: 'Aliganj, Lucknow',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // -----------------------------------
      // Student 1 (Verified)
      // -----------------------------------
      {
        name: 'Manish Sharma',
        email: 'manish@example.com',
        mobile: '7777777777',
        password: bcrypt.hashSync('Student@123', 10),
        role: 'student',
        otp: '123456',
        otp_expiry: new Date(Date.now() + 10 * 60 * 1000),
        is_verified: true,
        is_active: true,
        state: 'Madhya Pradesh',
        city: 'Bhopal',
        address: 'MP Nagar Zone 2',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // -----------------------------------
      // Student 2 (Not Verified)
      // -----------------------------------
      {
        name: 'Priya Singh',
        email: 'priya@example.com',
        mobile: '6666666666',
        password: bcrypt.hashSync('Student@123', 10),
        role: 'student',
        otp: '654321',
        otp_expiry: new Date(Date.now() + 10 * 60 * 1000),
        is_verified: false,
        is_active: true,
        state: 'Rajasthan',
        city: 'Jaipur',
        address: 'Vaishali Nagar',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // -----------------------------------
      // Student 3 (Inactive)
      // -----------------------------------
      {
        name: 'Amit Verma',
        email: 'amit@example.com',
        mobile: '5555555555',
        password: bcrypt.hashSync('Student@123', 10),
        role: 'student',
        otp: null,
        otp_expiry: null,
        is_verified: true,
        is_active: false,
        state: 'Bihar',
        city: 'Patna',
        address: 'Kankarbagh',
        createdAt: new Date(),
        updatedAt: new Date()
      }

    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};
