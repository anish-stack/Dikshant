'use strict';
const router = require('express').Router();

router.use('/auth', require('./auth'));
router.use('/programs', require('./programs'));
router.use('/subjects', require('./subjects'));
router.use('/batchs', require('./batchs'));
router.use('/mcqquestions', require('./mcqquestions'));
router.use('/scholarshipmcqquestions', require('./scholarshipmcqquestions')); 
router.use('/videocourses', require('./videocourses'));
router.use('/pdfnotes', require('./pdfnotes'));
router.use('/testseriess', require('./testseriess'));
router.use('/tests', require('./tests'));
router.use('/announcements', require('./announcements'));
router.use('/orders', require('./orders'));
router.use('/coupons', require('./coupons'));
router.use('/blogs', require('./blogs'));
router.use('/banners', require('./banners'));
router.use('/faqs', require('./faqs'));
router.use('/testimonials', require('./testimonials'));
router.use('/pages', require('./pages'));
router.use('/appsettings', require('./appsettings'));
router.use('/downloads', require('./downloads'));
router.use('/scholarships', require('./scholarships'));//done
router.use('/scholarshipapplications', require('./scholarshipapplications'));
router.use('/courseprogresss', require('./courseprogresss'));
router.use('/scholarshipresults', require('./scholarshipresults'));
router.use('/mcqresults', require('./mcqresults'));
router.use('/app-ratings',require("./ratting"))
router.use('/support',require("./support.routes"))
router.use('/doubt',require("./doubt.routes"))



module.exports = router;