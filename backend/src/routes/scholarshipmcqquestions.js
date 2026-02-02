'use strict';
const express = require('express');
const router = express.Router();
const ScholarshipMCQQuestionController = require('../controllers/ScholarshipMCQQuestionController');

router.post('/', ScholarshipMCQQuestionController.create);
router.get('/', ScholarshipMCQQuestionController.findAll);
router.get('/:id', ScholarshipMCQQuestionController.findOne);
router.put('/:id', ScholarshipMCQQuestionController.update);
router.delete('/:id', ScholarshipMCQQuestionController.delete);

module.exports = router;
