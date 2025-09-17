import express, { Application } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cardRoutes from './routes/cards';

dotenv.config();
const app: Application = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || '')
    .then(() => console.log("Mongo connected"))
    .catch((err) => console.error(err));

// Routes
app.use('/api/cards', cardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

export default app;
