import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/mongodb.js';
import userRouter from './routes/userRoutes.js';
import imageRouter from './routes/imageRoutes.js';

const PORT = process.env.PORT || 4000;
const app = express();

// Middleware
app.use(express.json());

// Explicit CORS setup
app.use(cors({
  origin: 'https://ai-image-generator-five-peach.vercel.app', // frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Handle preflight requests
app.options('*', cors());

// Connect to DB
await connectDB(); 

// Routes
app.use('/api/users', userRouter);
app.use('/api/image', imageRouter);

app.get('/', (req, res) => {
  res.send('API Working');
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
