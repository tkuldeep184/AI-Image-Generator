import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/mongodb.js';
import userRouter from './routes/userRoutes.js';
import imageRouter from './routes/imageRoutes.js';

const PORT = process.env.PORT || 4000;
const app = express();

// ✅ CORS configuration — must come BEFORE routes
const allowedOrigins = [
  'https://ai-image-generator-five-peach.vercel.app', // your frontend
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

// ✅ Middleware
app.use(express.json());

// ✅ Routes
app.use('/api/users', userRouter);
app.use('/api/image', imageRouter);

// ✅ Root route
app.get('/', (req, res) => {
  res.send('API Working');
});

// ✅ Connect DB & start server
await connectDB();

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
