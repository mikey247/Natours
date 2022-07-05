//
const AppError = require('../utilties/appError');

const Review = require('../models/reviewSchema');
// const catchAsync = require('../utilties/catchAsync');
const factory = require('../controllers/handlerFactory');

exports.getAllReviews = factory.getAll(Review);
// exports.getAllReviews = catchAsync(async (req, res, next) => {
//   let filter = {};

//   if (req.params.tourId) {
//     filter = { tour: req.params.tourId }; //fetching reviews for a particular tour
//   }

//   const reviews = await Review.find(filter);

//   res.status(200).json({
//     status: 'success',
//     results: reviews.length,
//     data: {
//       reviews,
//     },
//   });
// });

exports.setTourUserId = (req, res, next) => {
  //nested routes-----router.use('/:tourId/reviews', reviewRouter);
  if (!req.body.tour) {
    req.body.tour = req.params.tourId;
  }
  if (!req.body.user) {
    req.body.user = req.user.id; //req.user.id is the user passed in from the authcontroller.protect middleware
  }

  next();
};

exports.checkIfAuthor = async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    return next(new AppError(`Document not found bro`, 401));
  }
  if (req.user.role !== 'admin') {
    //admin users bypass this middleware
    // console.log(
    //   'current user----',
    //   req.user.id,
    //   'author id-----',
    //   review.user._id
    // );
    if (review.user.id !== req.user.id) {
      // checking if id of review author is the same as id of current user
      return next(new AppError(`You cannot edit someone's else review.`, 401));
    }
  }
  next();
};

exports.getReview = factory.getOne(Review);

exports.createReview = factory.createOne(Review);

exports.updateReview = factory.updateOne(Review);

exports.deleteReview = factory.deleteOne(Review);
