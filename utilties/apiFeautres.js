class APIFeautres {
  // const feautres = new APIFeautres(Tour.find(), req.query).filte();
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    //FILTERING
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);
    // console.log(this.queryString);

    //ADVANCED FILTERING
    let queryStr = JSON.stringify(queryObj);
    // console.log(queryStr);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    // console.log(JSON.parse(queryStr));

    this.query = this.query.find(JSON.parse(queryStr));
    // let query = Tour.find(JSON.parse(queryStr));
    return this;
  }
  sort() {
    //SORTING
    if (this.queryString.sort) {
      // console.log(this.queryString.sort);
      const sortBy = this.queryString.sort.split(',').join(' ');
      // console.log(sortBy);
      this.query = this.query.sort(sortBy);
    } else {
      //DEFAULT SORTING
      this.query = this.query.sort('createdAt');
    }
    return this;
  }

  limitFields() {
    //FIELD LIMITING OR PROJECTION
    if (this.queryString.fields) {
      console.log(this.queryString.fields);
      const fields = this.queryString.fields.split(',').join(' ');
      // console.log(fields);
      this.query = this.query.select(fields);
    } else {
      //this excludes the inbuilt '__v' mongodb property from ever going back to the client
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    //PAGINATION
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100; ///change to number with multiplication and set the default to 100 using the logicall OR operator to shortcircuit

    //page=3&limit=10, 1-10 > page1 > skips 0 fields------11-20 > page2 > skips 10 fields-----21-30 > page3 > skips 20 fields
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeautres;

//

//

//

//

//

//

//

///

//

// //FILTERING
// const queryObj = { ...req.query };
// const excludedFields = ['page', 'sort', 'limit', 'fields'];
// excludedFields.forEach((el) => delete queryObj[el]);
// // console.log(req.query);

// //ADVANCED FILTERING
// let queryStr = JSON.stringify(queryObj);
// // console.log(queryStr);
// queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
// // console.log(JSON.parse(queryStr));

// let query = Tour.find(JSON.parse(queryStr));

// //SORTING
// if (req.query.sort) {
//   // console.log(req.query.sort);
//   const sortBy = req.query.sort.split(',').join(' ');
//   // console.log(sortBy);
//   query = query.sort(sortBy);
// } else {
//   //DEFAULT SORTING
//   query = query.sort('createdAt');
// }

//FIELD LIMITING
// if (req.query.fields) {
//   console.log(req.query.fields);
//   const fields = req.query.fields.split(',').join(' ');
//   // console.log(fields);
//   query = query.select(fields);
// } else {
//   //this excludes the inbuilt '__v' mongodb property from ever going back to the client
//   query = query.select('-__v');
// }

// //PAGINATION
// const page = req.query.page * 1 || 1;
// const limit = req.query.limit * 1 || 100; ///change to number with multiplication and set the default to 100 using the logicall OR operator to shortcircuit

// //page=3&limit=10, 1-10 > page1 > skips 0 fields------11-20 > page2 > skips 10 fields-----21-30 > page3 > skips 20 fields
// const skip = (page - 1) * limit;
// query = query.skip(skip).limit(limit);

// if (req.query.page) {
//   const numberOfTours = await Tour.countDocuments();
//   if (skip >= numberOfTours) {
//     throw new Error('this page does not exist');
//   }
// }
// const tours= await query
