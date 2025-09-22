import express, {Application} from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cardRoutes from './routes/cards';
import authRoutes from './routes/auth';
import {specs, swaggerUi} from './config/swagger';

dotenv.config();
const app: Application = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || '')
    .then(() => console.log("Mongo connected"))
    .catch((err) => console.error(err));

// Swagger documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.use('/api/cards', cardRoutes);
app.use('/api/auth', authRoutes);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check API health status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: "OK"
 *               timestamp: "2025-17-07T10:30:00.000Z"
 *               uptime: 3600.5
 */
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

export default app;
