//
const AppError = require('../utilties/appError');

const handleTokenExpiredError = (err) => {
  return new AppError('Expired token. Please login again', 401);
};

const handleJsonWebTokenError = (err) => {
  return new AppError('Invalid token. Please log in again', 401);
};

const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateName = (err) => {
  // console.log(err);
  // console.log(err.keyValue, '.........');
  const values = Object.values(err.keyValue).map((i) => i);
  console.log(values);
  const message = `Duplicate value detected --${values.join(
    '. '
  )}-- :Please use another value`;

  return new AppError(message, 400);
};

const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((i) => i.message);
  const message = `Invalid input data---${errors.join('. ')}---`;
  return new AppError(message, 400);
};

const sendDevError = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendProdError = (err, res) => {
  //Operational Errors that we expect and we want to specify error details to the client
  if (err.isOperationalError) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    //Programming/Unknown Errors: we don't want error details gong back to the client
    console.error('ERROR💥', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  // console.log(err);

  if (process.env.NODE_ENV === 'development') {
    sendDevError(err, res);
    // console.log(err);
  } else if (process.env.NODE_ENV === 'production') {
    //
    let error = Object.assign(err); //we copy the contents of 'err' to a new variable beacause it is not good practice to override arguments of a function as we do below
    // console.log(error.name);

    if (error.name === 'CastError') {
      error = handleCastError(error);
    }
    if (error.code === 11000) {
      error = handleDuplicateName(error);
    }
    if (error.name === 'ValidationError') {
      error = handleValidationError(error);
    }
    if (error.name === 'JsonWebTokenError') {
      error = handleJsonWebTokenError(error);
    }
    if (error.name === 'TokenExpiredError') {
      error = handleTokenExpiredError(error);
    }
    sendProdError(error, res);
  }
};
