const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking-controller');
const authController = require('../controllers/authentication-controller');

// router.use(authController.protect);

router
  .route('/')
  .get(bookingController.getAllBookings)
  .post(
    authController.protect,
    authController.restrictTo('user'),
    bookingController.createBooking
  );

module.exports = router;
