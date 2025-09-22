import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

// Extend Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
    }
}

interface JwtPayload {
    userId: string;
    iat: number;
    exp: number;
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ 
                error: 'Access token required. Please provide a valid authentication token.' 
            });
        }

        // Get JWT secret from environment variables
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET not found in environment variables');
            return res.status(500).json({ 
                error: 'Server configuration error' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
        
        // Find user
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ 
                error: 'Invalid token. User not found.' 
            });
        }

        // Add user to request object
        req.user = user;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ 
                error: 'Invalid token. Please authenticate again.' 
            });
        } else if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ 
                error: 'Token expired. Please authenticate again.' 
            });
        }
        
        console.error('Authentication error:', error);
        res.status(500).json({ 
            error: 'Authentication failed due to server error' 
        });
    }
};

export const generateToken = (userId: string): string => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET not found in environment variables');
    }
    
    return jwt.sign(
        { userId }, 
        jwtSecret, 
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};