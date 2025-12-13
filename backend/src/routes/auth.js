const router = require('express').Router();
const ctrl = require('../controllers/AuthController');
const auth = require('../middleware/auth');

router.post('/signup', ctrl.signup);
router.post('/request-otp', ctrl.requestOtp);
router.post('/verify-otp', ctrl.verifyOtp);
router.post('/login', ctrl.login);
router.put('/profile', auth, ctrl.updateProfile);
router.get('/profile-details',auth,ctrl.getProfile)
router.get('/refresh-token',ctrl.refreshToken)
router.get('/logout',auth,ctrl.logout)
router.post('/update-fcm-token',auth,ctrl.updateFcmToken)




router.get('/all-profile',ctrl.getAllProfile)

module.exports = router;
