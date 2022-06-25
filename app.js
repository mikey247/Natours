const express = require('express');
const morgan = require('morgan');

const tourRouter = require('./routes/tour-routes');
const userRouter = require('./routes/user-routes');

const AppError = require('./utilties/appError');
const globalErrorHandler = require('./controllers/error-controller');
const app = express();

// 1) MIDDLEWARES
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.static(`${__dirname}/public`));

// app.use((req, res, next) => {
//   console.log('Hello from the middleware 👋');
//   next();
// });

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3) ROUTES
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

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
