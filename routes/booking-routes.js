const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking-controller');
const authController = require('../controllers/authentication-controller');

// router.use(authController.protect);

router
  .route('/')
  .get(authController.restrictTo('admin'), bookingController.getAllBookings)
  .post(
    authController.protect,
    authController.restrictTo('user'),
    bookingController.createBooking
  );

router
  .route('/:userId/customer-bookings')
  .get(bookingController.getCustomerBookings);
module.exports = router;
