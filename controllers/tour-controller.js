const express = require('express');
const fs = require('fs');
const app = express();
const Tour = require('../models/tourSchema');
const APIFeautres = require('../utilties/apiFeautres');

// const tours = JSON.parse(fs.readFileSync('./dev-data/data/tours-simple.json'));
// app.get('/', (req, res) => {
//   res.status(200).json('hello from the server');
// });

//TOURS CALLBACKS
exports.aliasTopTours = (req, res, next) => {
  //we set the properties of the query object to our chosen values before the query hits the getAllTours handler , this is called Aliasing
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// READ ALL

exports.getAllTours = async (req, res) => {
  try {
    const feautres = new APIFeautres(Tour, req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    // console.log(feautres);
    const tours = await feautres.query;

    res.status(200).json({
      status: 'success',
      reults: tours.length,
      // requestTime: req.requestTime,
      data: {
        tours,
      },
    });
    //
  } catch (err) {
    res.status(404).json({
      status: 'failed',
      message: err,
    });
  }
};

//READ ONE
exports.getSingleTour = async (req, res) => {
  // console.log(req.params);
  const id = req.params.id * 1;

  try {
    const tour = await Tour.findById(req.params.id);
    res.status(200).json({
      staus: 'success',
      data: {
        tour,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'failed',
      message: 'Tour not found!',
    });
  }

  // const tour = tours.find((i) => i.id === id);
  // res.status(200).json({
  //   status: 'success',
  //   // reults: tour.length,
  //   data: {
  //     tour,
  //   },
  // });
};

//CREATE
exports.createTour = async (req, res) => {
  try {
    // const newTour = new Tour({})
    // newTour.save()

    const newTour = await Tour.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        tour: newTour,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'failed',
      // message: err,
      message: 'Invalid Data Sent',
    });
  }
};

//UPDATE
exports.updateTour = async (req, res) => {
  try {
    const updatedTour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      status: 'success',
      data: {
        tour: updatedTour,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'failed',
      message: err,
    });
  }
};

//DELETE
exports.deleteTour = async (req, res) => {
  try {
    const data = await Tour.findByIdAndDelete(req.params.id);
    res.status(204).json({
      status: 'deleted',
      data: data,
    });
  } catch (err) {
    res.status(404).json({
      status: 'failed',
      message: err,
    });
  }
};

//AGGREGATION PIPELINE
// these are like a pipeline which certain documents from a collection have to go through to be processed in stages with the end result being 'aggregated data'
exports.getTourStats = async (req, res) => {
  try {
    const stats = await Tour.aggregate([
      {
        //documents that pass this stage are the tours that are greater than 4.5
        $match: {
          ratingsAverage: { $gte: 4.5 },
        },
      },

      //

      {
        $group: {
          _id: { $toUpper: '$difficulty' },
          // _id:  '$ratingsAverage' ,
          numberOfTours: { $sum: 1 },
          numberOfRatings: { $sum: '$ratingsQuantity' },
          avgRating: { $avg: '$ratingsAverage' },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },

      //

      {
        $sort: {
          avgPrice: 1,
        },
      },

      //

      // {
      //   $match: {
      //     _id: { $ne: 'EASY' },
      //   },
      // },
    ]);
    res.status(200).json({
      staus: 'success',
      data: {
        stats,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'failed',
      message: err,
    });
  }
};

exports.getMonthlyPlan = async (req, res) => {
  try {
    const year = req.params.year * 1;

    const plan = await Tour.aggregate([
      {
        $unwind: '$startDates',
      },

      //

      {
        $match: {
          startDates: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      ///

      {
        $group: {
          _id: { $month: '$startDates' },
          numberOfTourStarts: { $sum: 1 },
          tours: { $push: '$name' },
        },
      },
      //\
      {
        $addFields: { month: '$_id' },
      },
      //
      {
        $project: {
          _id: 0,
        },
      },
      {
        $sort: {
          numberOfTourStarts: -1,
        },
      },
      {
        $limit: 12,
      },
    ]);
    res.status(200).json({
      staus: 'success',
      results: plan.length,
      data: {
        plan,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'failed',
      message: err,
    });
  }
};
