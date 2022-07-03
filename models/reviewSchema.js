const mongoose = require('mongoose');
const Tour = require('./tourSchema');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true }); /// this index prevents the user from reviewing more than once

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name',
  }); //.populate({
  //   path: 'tour',
  //   select: 'name duration',
  // });

  next();
});

//Calculating the reviews statistics and updating the tour
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }, //filters for only reviews that belong to the tourId passed in
    },
    {
      $group: {
        _id: '$tour', //group the reviews by their tours
        numberOfRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  //
  console.log(stats);

  //checking if there are any reviews
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].numberOfRatings,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

//using the reviews statistics function after creating a new review
reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.tour); // we pass in the tour id being saved on the reviewSchema
  //this.consructor refers to the Review model here since we cant get access to the model inside the middleware before it is created
});

//using the reviews statistics function after updating or deleting a review
//findByIdAndUpdate //findByIdAndDelete these both use findOneAndUpdate/Delete under the hood
reviewSchema.post(/^findOneAnd/, async function (doc) {
  //console.log(docs);
  if (doc) {
    //we get access to doc on post middlewares---this doc is the result of the query that just ran and it gives us access to the tour id
    await doc.constructor.calcAverageRatings(doc.tour);
  }
});

module.exports = mongoose.model('Review', reviewSchema);
