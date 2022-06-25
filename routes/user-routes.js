const express = require('express');
const router = express.Router();
const userController = require('../controllers/user-controller');
const authController = require('../controllers/authentication-controller');

//USERS
router.post('/signup', authController.signUp);
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route('/:id')
  .get(userController.getSingleUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
