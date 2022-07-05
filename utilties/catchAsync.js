const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(err));
  };
};
module.exports = catchAsync;

// The catch async function returns another anonymous function, this anonymous function  is what houses our controller... is also what will be run anytime the route is hit
