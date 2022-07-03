//
const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userSchema');
const catchAsync = require('../utilties/catchAsync');
const AppError = require('../utilties/appError');
const sendEmail = require('../utilties/email');

const getToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = getToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 100 ///converting the expiry time to milliseconds---24 hours in a day, 60 minutes in an hour ,60 seconds in a minute, 1000 milliseconds in a second
    ),
    // secure: true, /// can only be sent with https(encrypted connection)
    httpOnly: true, //this makes it possible so that the the cookie cannot be accessed or modified by the browser in any way-----can only receive the cookie , store it and send it with every request.
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  res.cookie('jwt', token, cookieOptions);

  //Removes password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) check if password and email is sent
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  //2) check if user exists &&& password is correct
  const user = await User.findOne({ email }).select('+password'); //this makes the password field accessible after we made it inaccessible in the userSchema
  // const passwordCorrect = await user.correctPassword(password, user.password); // we use an instance method in the userSchema to check the two password

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) if everything is fine ,send token to the client
  createSendToken(user, 200, res);
  // const token = getToken(user._id);
  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });
});

exports.protect = catchAsync(async (req, res, next) => {
  //1) Get token if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in', 401));
  }

  // 2 Validate Token

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);

  //You use an async function when working with Promises in the body of the function.

  // There are two sets of brackets because this part:

  // promisify(jwt.verify) promisifies the function so as not to block the event loop
  // Returns the promisified version of jwt.verify as a function and this part:

  // (token, process.env.JWT_SECRET)
  // Executes that function.

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  // console.log(currentUser);
  if (!currentUser) {
    return next(new AppError('This user does not exist', 401));
  }

  //4) check if user changed password after the token was issued
  if (currentUser.userHasChangedPassword(decoded.iat)) {
    return next(new AppError('User changed password! Login again', 401));
  }

  req.user = currentUser; //gives the next middleware the current user

  //grants access to protected route
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You don't have permission to perform this action", 403)
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) Get your user based on posted email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with this email address', 404));
  }

  //2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); //we need to pass in this option of validateBeforeSave: false because the createPasswordResetToken method in the schema tries to re-save/PUT the document when we assign values to this.passwordResetToken and this.passwordResetTokenExpires this throws an error beacause we don't provide the other fields of the document.

  //3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Send a PATCH request with your new password and passwordConfirm to:\n ${resetURL}.\n \n If you did not send a request please ignore this email`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset(expires in 10 minutes)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to Email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.log(err);

    return next(
      new AppError('There was an error sending the email.Try again Later', 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1)Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpires: { $gt: Date.now() }, //if expiry timestamp is in the future then it is obviously not expired
  });

  // 2) If token has not expired and the user is present , set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined; //deleting the reset token
  user.passwordResetTokenExpires = undefined;
  await user.save(); //we dont turn off the validators here because we want the password and passwordConfirm values validated

  //3) Update the changePasswordAt field for the user-------we do this in a document middleware in the user schema

  //4) Log in the user and send new JWT
  createSendToken(user, 200, res);

  // const token = getToken(user._id);
  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, newPasswordConfirm } = req.body;
  //1) Get user from collection
  // const user = await User.findOne({ email }).select('+password'); //this makes the password field accessible after we made it inaccessible in the userSchema

  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if password sent is correct

  if (!user || !(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError('Incorrect  password', 401));
  }

  // 3) Update password
  (user.password = newPassword), (user.passwordConfirm = newPasswordConfirm);
  await user.save();

  // 4) Log user In,send JWT
  createSendToken(user, 200, res);

  // const token = getToken(user._id);
  // res.status(200).json({
  //   status: 'success',
  //   newPassword,
  //   token,
  // });
});
