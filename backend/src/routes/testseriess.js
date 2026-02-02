'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/TestSeriesController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const upload = require('../middleware/upload');

router.get('/', ctrl.findAll);
router.post('/', auth, role(['admin']), upload.single("imageUrl"), ctrl.create);
router.get('/:id', ctrl.findOne);
router.put('/:id', auth, role(['admin']), upload.single("imageUrl"), ctrl.update);
router.delete('/:id', auth, role(['admin']), ctrl.delete);
router.get('/user/:id', auth, ctrl.findOneUser);

router.get('/submissions/:id', ctrl.getSubmissionsByTestSeries);
router.get('/submission-one/:id', ctrl.getSubmissionById);

router.get('/payments/:id', ctrl.getPaymentsByTestSeries);





router.post(
    "/admin/submissions/:submissionId/publish-result",
    auth, role(['admin']),
    ctrl.publishResult
);

router.post(
    "/admin/submissions/:submissionId/upload-checked",
    auth, role(['admin']),
    upload.single("file"),
    ctrl.uploadCheckedAnswerSheet
);

router.put(
    "/admin/submissions/:submissionId/update-marks",
    auth, role(['admin']),
    ctrl.updateMarks
);

router.put(
    "/admin/submissions/:submissionId/review",
    auth, role(['admin']),
    ctrl.updateReviewStatus
);



router.post(
    '/:id/upload-question-sheet',
    auth,
    role(['admin']),
    upload.single('questionSheet'),
    ctrl.uploadQuestionSheet
);

router.post(
    '/:id/upload-answer-key',
    auth,
    role(['admin']),
    upload.single('answerKey'),
    ctrl.uploadMainAnswerKeySheet
);



router.post('/:id/submit-answer', auth, upload.any(), ctrl.uploadStudentAnswerSheet)

module.exports = router;
