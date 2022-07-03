const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp'); //HTTP parameter pollution

const tourRouter = require('./routes/tour-routes');
const userRouter = require('./routes/user-routes');
const reviewRouter = require('./routes/review-routes');

const AppError = require('./utilties/appError');
const globalErrorHandler = require('./controllers/error-controller');
const app = express();

// 1) MIDDLEWARES

//SECURITY HTTP MIDDLEWARE  // Set security HTTP headers

app.use(helmet());

//LOGGER
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//RATE LIMITER--limits the amount of requests that can be set by a particular IP address
const limiter = rateLimit({
  max: 100, //amount of requests allowed
  windowMs: 60 * 60 * 100, //Time for the requests -----100 requests/hour
  message: 'Too many requests from this IP, please try again in one hour',
});
app.use('/api', limiter); //   /api so it affects all routes under

//body parser----so we are able to read/use the request body-----------we limit the data size that can be received to 10 kilobytes
app.use(express.json({ limit: '10kb' }));

//DATA SANITIZATION AGAINST NOSQSL INJECTIONS
app.use(mongoSanitize());

//DATA SANITIZATION AGAINST XSS(CROSS SITE SCRIPTING ATTACKS)
app.use(xss());

//HTTP PARAMETER POLLUTION
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ], ///we whitelist parameters that can have multiple fields
  })
);

//static files
app.use(express.static(`${__dirname}/public`));

// app.use((req, res, next) => {
//   console.log('Hello from the middleware 👋');
//   next();
// });

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers)
  next();
});

// 3) ROUTES
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

//HANDLING UNDEFINED ROUTES
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'Failed',
  //   message: `Can't find ${req.originalUrl} on this server `,
  // });

  // const err = new Error(`Can't find ${req.originalUrl} on this server `);
  // err.status = 'fail';
  // err.statusCode = 404;

  const err = new AppError(
    // we generate an error from our AppError class
    `Can't find ${req.originalUrl} on this server `,
    404
  );

  next(err); //this passes in the generated error to the middleware below which is the next middleware in the stack
});

//ERROR MIDDLEWARE
app.use(globalErrorHandler); //makes use of a function that takes in the error from the previous middleware and sends the error data

module.exports = app;
