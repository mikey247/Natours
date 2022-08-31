const Booking = require('../models/bookingSchema');
const AppError = require('../utilties/appError');
const catchAsync = require('../utilties/catchAsync');
const factory = require('../controllers/handlerFactory');

exports.getAllBookings = factory.getAll(Booking);

exports.createBooking = factory.createOne(Booking);

exports.getCustomerBookings = factory.getAll(Booking);
