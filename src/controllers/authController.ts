import { Request, Response } from 'express';
import { User } from '../models/User';
import { generateToken } from '../middleware/auth';

export const register = async (req: Request, res: Response) => {
    try {
        const { username, email, password } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                error: 'Username, email, and password are required'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            const field = existingUser.email === email ? 'email' : 'username';
            return res.status(409).json({
                error: `User with this ${field} already exists`
            });
        }

        // Create new user
        const user = new User({
            username: username.trim(),
            email: email.trim().toLowerCase(),
            password
        });

        await user.save();

        // Generate JWT token
        const token = generateToken(user._id.toString());

        // Return user info (without password) and token
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                createdAt: user.createdAt
            },
            token
        });
    } catch (error: any) {
        console.error('Registration error:', error);
        
        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map((err: any) => err.message);
            return res.status(400).json({
                error: 'Validation failed',
                details: errors
            });
        }

        // Handle mongoose duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(409).json({
                error: `User with this ${field} already exists`
            });
        }

        res.status(500).json({
            error: 'Registration failed due to server error'
        });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        // Validate required fields
        if (!username || !password) {
            return res.status(400).json({
                error: 'Username and password are required'
            });
        }

        // Find user by username or email
        const user = await User.findOne({
            $or: [
                { username: username.trim() },
                { email: username.trim().toLowerCase() }
            ]
        });

        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = generateToken(user._id.toString());

        // Return user info (without password) and token
        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed due to server error'
        });
    }
};

export const getProfile = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'User not authenticated'
            });
        }

        res.json({
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                createdAt: req.user.createdAt
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Failed to get user profile'
        });
    }
};