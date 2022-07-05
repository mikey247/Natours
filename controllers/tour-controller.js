const Tour = require('../models/tourSchema');
const APIFeautres = require('../utilties/apiFeautres');
const AppError = require('../utilties/appError');
const catchAsync = require('../utilties/catchAsync');
const factory = require('../controllers/handlerFactory');

//TOURS CALLBACKS
exports.aliasTopTours = (req, res, next) => {
  //we set the properties of the query object to our chosen values before the query hits the getAllTours handler , this is called Aliasing
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// READ ALL

exports.getAllTours = factory.getAll(Tour);
// exports.getAllTours = catchAsync(async (req, res, next) => {
//   const feautres = new APIFeautres(Tour, req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();
//   // console.log(feautres.query, '....---');
//   const tours = await feautres.query;

//   res.status(200).json({
//     status: 'success',
//     reults: tours.length,
//     // requestTime: req.requestTime,
//     data: {
//       tours,
//     },
//   });
//   //
// });

//READ ONE

exports.getSingleTour = factory.getOne(Tour, { path: 'reviews' });

// exports.getSingleTour = catchAsync(async (req, res, next) => {
// console.log(req.params);

//   const tour = await Tour.findById(req.params.id).populate('reviews'); // here we use the populate to make use of the VIRTUAL POPULATE function in the tourschema that connects the tour schema to the Reviews schema

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200).json({
//     staus: 'success',
//     data: {
//       tour,
//     },
//   });

//   // const tour = tours.find((i) => i.id === id);
//   // res.status(200).json({
//   //   status: 'success',
//   //   // reults: tour.length,
//   //   data: {
//   //     tour,
//   //   },
//   // });
// });

//CREATE

exports.createTour = factory.createOne(Tour);

//UPDATE
exports.updateTour = factory.updateOne(Tour);

//DELETE
exports.deleteTour = factory.deleteOne(Tour);

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const data = await Tour.findByIdAndDelete(req.params.id);

//   if (!data) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(204).json({
//     status: 'deleted',
//     data: data,
//   });
// });

//AGGREGATION PIPELINE
// these are like a pipeline which certain documents from a collection have to go through to be processed in stages with the end result being 'aggregated data'
exports.getTourStats = catchAsync(async (req, res, next) => {
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
    results: stats.length,
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates', /// create an array of objects containing each date in the startDates array of all the documents along with which tour is starting that day.... 3 start dates for each of the 9 documents which means 27 items in the array
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
        _id: { $month: '$startDates' }, //extracts the month from each date and groups by month and shows what month it is --- 6=june,1=january,12=december
        numberOfTourStarts: { $sum: 1 }, // for each tour starting in that month add 1
        tours: { $push: '$name' },
      },
    },
    //\
    {
      $addFields: { month: '$_id' }, //creates a new field called 'month' with the value of the "_id" field in the group stage above which would be the number of months created
    },
    //
    {
      $project: {
        _id: 0, //removes the _id field
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
});

//GEOSPATIAL QUERIES
// '/tours-within/:distance/center/:latlng/unit/:unit',
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // converting the distance to radians by dividing it by the radius of the earth(the value of the earth's radius depends on if it is measured in miles and kilometres )
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in this format latitude,longitude ',
        400
      )
    );
  }
  console.log(distance, '----', lat, '----', lng, '----', unit);

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in this format latitude,longitude ',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier, //changes the distance generated from its default unit in metres to kilometres by multiplying by 0.001 OR /1000 or changing to miles  by multiplying by 0.000621371
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    // results: distances.length,
    data: {
      data: distances,
    },
  });
});

///

//

//

//

//

//

///
//

//
//

//

//

//
//

//

//
// //TOURS CALLBACKS
// exports.aliasTopTours = (req, res, next) => {
//   //we set the properties of the query object to our chosen values before the query hits the getAllTours handler , this is called Aliasing
//   req.query.limit = '5';
//   req.query.sort = '-ratingsAverage,price';
//   req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
//   next();
// };

// // READ ALL

// exports.getAllTours = async (req, res) => {
//   try {
//     const feautres = new APIFeautres(Tour, req.query)
//       .filter()
//       .sort()
//       .limitFields()
//       .paginate();
//     // console.log(feautres);
//     const tours = await feautres.query;

//     res.status(200).json({
//       status: 'success',
//       reults: tours.length,
//       // requestTime: req.requestTime,
//       data: {
//         tours,
//       },
//     });
//     //
//   } catch (err) {
//     res.status(404).json({
//       status: 'failed',
//       message: err,
//     });
//   }
// };

// //READ ONE
// exports.getSingleTour = async (req, res) => {
//   // console.log(req.params);
//   const id = req.params.id * 1;

//   try {
//     const tour = await Tour.findById(req.params.id);
//     res.status(200).json({
//       staus: 'success',
//       data: {
//         tour,
//       },
//     });
//   } catch (err) {
//     res.status(404).json({
//       status: 'failed',
//       message: 'Tour not found!',
//     });
//   }

//   // const tour = tours.find((i) => i.id === id);
//   // res.status(200).json({
//   //   status: 'success',
//   //   // reults: tour.length,
//   //   data: {
//   //     tour,
//   //   },
//   // });
// };

// //CREATE
// exports.createTour = async (req, res) => {
//   try {
//     // const newTour = new Tour({})
//     // newTour.save()

//     const newTour = await Tour.create(req.body);

//     res.status(201).json({
//       status: 'success',
//       data: {
//         tour: newTour,
//       },
//     });
//   } catch (err) {
//     res.status(400).json({
//       status: 'failed',
//       // message: err,
//       message: 'Invalid Data Sent',
//     });
//   }
// };

// //UPDATE
// exports.updateTour = async (req, res) => {
//   try {
//     const updatedTour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//       runValidators: true,
//     });

//     res.status(200).json({
//       status: 'success',
//       data: {
//         tour: updatedTour,
//       },
//     });
//   } catch (err) {
//     res.status(404).json({
//       status: 'failed',
//       message: err,
//     });
//   }
// };

// //DELETE
// exports.deleteTour = async (req, res) => {
//   try {
//     const data = await Tour.findByIdAndDelete(req.params.id);
//     res.status(204).json({
//       status: 'deleted',
//       data: data,
//     });
//   } catch (err) {
//     res.status(404).json({
//       status: 'failed',
//       message: err,
//     });
//   }
// };

// //AGGREGATION PIPELINE
// // these are like a pipeline which certain documents from a collection have to go through to be processed in stages with the end result being 'aggregated data'
// exports.getTourStats = async (req, res) => {
//   try {
//     const stats = await Tour.aggregate([
//       {
//         //documents that pass this stage are the tours that are greater than 4.5
//         $match: {
//           ratingsAverage: { $gte: 4.5 },
//         },
//       },

//       //

//       {
//         $group: {
//           _id: { $toUpper: '$difficulty' },
//           // _id:  '$ratingsAverage' ,
//           numberOfTours: { $sum: 1 },
//           numberOfRatings: { $sum: '$ratingsQuantity' },
//           avgRating: { $avg: '$ratingsAverage' },
//           avgPrice: { $avg: '$price' },
//           minPrice: { $min: '$price' },
//           maxPrice: { $max: '$price' },
//         },
//       },

//       //

//       {
//         $sort: {
//           avgPrice: 1,
//         },
//       },

//       //

//       // {
//       //   $match: {
//       //     _id: { $ne: 'EASY' },
//       //   },
//       // },
//     ]);
//     res.status(200).json({
//       staus: 'success',
//       data: {
//         stats,
//       },
//     });
//   } catch (err) {
//     res.status(404).json({
//       status: 'failed',
//       message: err,
//     });
//   }
// };

// exports.getMonthlyPlan = async (req, res) => {
//   try {
//     const year = req.params.year * 1;

//     const plan = await Tour.aggregate([
//       {
//         $unwind: '$startDates',
//       },

//       //

//       {
//         $match: {
//           startDates: {
//             $gte: new Date(`${year}-01-01`),
//             $lte: new Date(`${year}-12-31`),
//           },
//         },
//       },
//       ///

//       {
//         $group: {
//           _id: { $month: '$startDates' },
//           numberOfTourStarts: { $sum: 1 },
//           tours: { $push: '$name' },
//         },
//       },
//       //\
//       {
//         $addFields: { month: '$_id' },
//       },
//       //
//       {
//         $project: {
//           _id: 0,
//         },
//       },
//       {
//         $sort: {
//           numberOfTourStarts: -1,
//         },
//       },
//       {
//         $limit: 12,
//       },
//     ]);
//     res.status(200).json({
//       staus: 'success',
//       results: plan.length,
//       data: {
//         plan,
//       },
//     });
//   } catch (err) {
//     res.status(404).json({
//       status: 'failed',
//       message: err,
//     });
//   }
// };
