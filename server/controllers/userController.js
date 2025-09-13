import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import razorpay from "razorpay";
import crypto from 'crypto';
import transactionModel from "../models/transactionModel.js";

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({success: false, message: "Please fill all the fields" });
        }

        // Check if user already exists
        // const existingUser = await userModel.findOne({ email });
        // if (existingUser) {
        //     return res.status(400).json({ message: "User already exists" });
        // }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new userModel({
            name,
            email,
            password: hashedPassword,
        });

        const user = await newUser.save();

        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET)

        res.json({success:true, token, user: {name: user.name}})


    } catch (error) {
        console.error(error);
        res.status(500).json({success: false, message: error.message });
    }
}

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: "Please fill all the fields" });
        }

        // Check if user exists
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(400).json({success:false ,  message: "User does not exist" });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET)

        res.json({success:true, token, id: user._id, user: {name: user.name}})

    } catch (error) {
        console.error(error);
        res.status(500).json({success: false, message: error.message });
    }
}

const userCredits = async (req, res) => {
    try {
        const { userId } = req;

        const user = await userModel.findById(userId);
        res.json({ success: true, credits: user.creditBalance, user:{name: user.name} });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({success: false, message: error.message });
    }
}

const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const paymentRazorpay = async (req, res) => {
    try {
        const { planId } = req.body;
        const userId = req.userId; // Get from auth middleware

        const userData = await userModel.findById(userId);
        if (!userData) {
            return res.status(404).json({success: false, message: "User not found" });
        }

        if (!planId) {
            return res.status(400).json({success: false, message: "Plan ID is required" });
        }

        let credits, plan, amount;

        switch (planId) {
            case "Basic":
                credits = 100;
                plan = "Basic Plan";
                amount = 10;
                break;
            case "Advanced":
                credits = 500;
                plan = "Advanced Plan";
                amount = 50;
                break;
            case "Business":
                credits = 5000;
                plan = "Business Plan";
                amount = 250;
                break;
            default:
                return res.status(400).json({success: false, message: "Plan not found" });
        }

        const transactionData = {
            userId,
            plan,
            credits,
            amount,
            date: Date.now()
        };

        const newTransaction = await transactionModel.create(transactionData);

        const options = {
            amount: amount * 100, // amount in smallest currency unit
            currency: process.env.CURRENCY || 'INR',
            receipt: newTransaction._id.toString(),
            payment_capture: 1
        };

        try {
            const razorOrder = await razorpayInstance.orders.create(options);
            res.json({
                success: true,
                order: {
                    id: razorOrder.id,
                    amount: razorOrder.amount,
                    currency: razorOrder.currency,
                    receipt: razorOrder.receipt
                }
            });
        } catch (err) {
            console.error('Razorpay Order Creation Error:', err);
            return res.status(500).json({
                success: false,
                message: "Error creating payment order"
            });
        }

    } catch (error) {
        console.error('Payment Controller Error:', error);
        res.status(500).json({success: false, message: error.message });
    }
};

const verifyRazorpay = async (req, res) => {
    try {
        // Support payloads where frontend sends { response } or direct fields
        const { response } = req.body || {};
        const razorpay_order_id = response?.razorpay_order_id || req.body.razorpay_order_id;
        const razorpay_payment_id = response?.razorpay_payment_id || req.body.razorpay_payment_id;
        const razorpay_signature = response?.razorpay_signature || req.body.razorpay_signature;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            console.error('Payment Verification Error: missing fields', { razorpay_order_id, razorpay_payment_id, razorpay_signature });
            return res.status(400).json({ success: false, message: 'Missing payment details' });
        }

        // Verify signature
        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(sign.toString()).digest('hex');
        if (expectedSign !== razorpay_signature) {
            console.error('Payment Verification Error: invalid signature', { expectedSign, razorpay_signature });
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }

        // Fetch order info from Razorpay
        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);

        if (!orderInfo) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (orderInfo.status !== 'paid') {
            return res.status(400).json({ success: false, message: 'Payment not completed' });
        }

        const transactionData = await transactionModel.findById(orderInfo.receipt);
        if (!transactionData) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }
        if (transactionData.payment) {
            return res.status(400).json({ success: false, message: 'Transaction already processed' });
        }

        const userData = await userModel.findById(transactionData.userId);
        if (!userData) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const creditBalance = (userData.creditBalance || 0) + (transactionData.credits || 0);
        await userModel.findByIdAndUpdate(userData._id, { creditBalance });
        await transactionModel.findByIdAndUpdate(transactionData._id, { payment: true });

        return res.json({ success: true, message: 'Credits Added Successfully', credits: creditBalance });
    } catch (error) {
        console.error('Payment Verification Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export { registerUser, loginUser, userCredits, paymentRazorpay, verifyRazorpay };