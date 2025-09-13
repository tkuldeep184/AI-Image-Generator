import express from "express";
import {registerUser, loginUser, userCredits, paymentRazorpay, verifyRazorpay} from "../controllers/userController.js";
import userAuth from "../middlewares/auth.js";


const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.get('/credits',userAuth ,userCredits);
userRouter.post('/pay-razor',userAuth ,paymentRazorpay);
userRouter.post('/verify-razor',userAuth ,verifyRazorpay);

export default userRouter;

// localhost:4000/api/users/register
// localhost:4000/api/users/login
// localhost:4000/api/users/credits