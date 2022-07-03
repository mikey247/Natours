const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A user must have a name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Value must be a valid email'],
  },
  photo: {
    type: String,
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minLength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm password'],
    validate: {
      //this only works on Cretate and Save
      validator: function (field) {
        return field === this.password;
      },
      message: 'Passwords are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetTokenExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); //this prevents password from being hashed again if password was not updated

  //Hashh the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined; //deletes passwordConfirm field

  next();
});

//changing the passwordChangedAt property when password is updated
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) {
    //if password has not been touched or the document is a new one skip this middleware
    return next();
  }

  this.passwordChangedAt = Date.now() - 2000;
  next();
});

//Query Middleware
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.userHasChangedPassword = function (JWTTimestamp) {
  // password has been changed
  if (this.passwordChangedAt) {
    const changedPasswordTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    console.log(
      'changed password timesatamp-----',
      changedPasswordTimestamp,
      '....',
      'JWT timestamp----',
      JWTTimestamp
    );
    return JWTTimestamp < changedPasswordTimestamp; // if jwt timestamp is less than changedPasswordTimeStamp then it is expired
  }

  // password has not been changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  //creates random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  //hashing the token and storin it to the database
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log(
    'unhashed----',
    { resetToken },
    'hashed----',
    this.passwordResetToken
  );
  this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000; //setting the token to last for 10 minutes by adding time it was generated to 10---converting to seconds by multiplying with 60 seconds----and the seconds converted to milliseconds by multiplying 600 seconds with 1000-----1000 milliseconds = 1 second

  //sending the unhashed token to user's email
  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
