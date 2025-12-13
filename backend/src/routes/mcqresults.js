'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/MCQResultController');
const auth = require('../middleware/auth');


router.post('/submit', auth, ctrl.submitTest);
router.get('/test/:testId/user/:userId', auth, ctrl.getTestResult);

module.exports = router;
