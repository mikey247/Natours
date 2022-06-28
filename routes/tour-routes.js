const express = require('express');
const router = express.Router();
const tourController = require('../controllers/tour-controller');
const authController = require('../controllers/authentication-controller');
// console.log(tourController);

//Param middleware is middlewware that runs only when a particular route parameter is met
// router.param('id', tourController.checkId);

//TOURS
router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router.route('/monthly-plan/:year').get(tourController.getMonthlyPlan);

router
  .route('/')
  .get(authController.protect, tourController.getAllTours)
  .post(tourController.createTour);
router
  .route('/:id')
  .get(tourController.getSingleTour)
  .patch(tourController.updateTour)
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
