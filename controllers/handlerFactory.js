const catchAsync = require('../utilties/catchAsync');
const AppError = require('../utilties/appError');
const APIFeautres = require('../utilties/apiFeautres');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'deleted',
      doc: doc,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const updatedDoc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedDoc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: updatedDoc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const newDoc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: newDoc,
    });
  });

exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);

    if (populateOptions) {
      query = query.populate(populateOptions); // here we use the populate to make use of the VIRTUAL POPULATE function in the tourschema that connects the doc schema to the Reviews schema
    }

    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      staus: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    //TO ALLOW FOR NESTED GET REVIEWS router.use('/:tourId/reviews', reviewRouter)--check tour-routes
    let filter = {};
    if (req.params.tourId) {
      filter = { tour: req.params.tourId }; //fetching reviews for a particular tour
    }

    const feautres = new APIFeautres(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    // console.log(feautres);
    // const doc = await feautres.query.explain();
    const doc = await feautres.query;

    res.status(200).json({
      status: 'success',
      reults: doc.length,
      // requestTime: req.requestTime,
      data: {
        data: doc,
      },
    });
    //
  });
