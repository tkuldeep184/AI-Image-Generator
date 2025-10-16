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

// Updated CORS configuration to handle preflight requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', allowedOrigins.join(','));
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

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
