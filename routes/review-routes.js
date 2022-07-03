const express = require('express');
const reviewController = require('../controllers/review-controller');
const authController = require('../controllers/authentication-controller');

const router = express.Router({ mergeParams: true }); //mergeParams---so we can use the parameters coming in from the userRouter

router.use(authController.protect); //protects all the routes after this middleware

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserId,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.checkIfAuthor,
    reviewController.deleteReview
  )
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.checkIfAuthor,
    reviewController.updateReview
  );

module.exports = router;
