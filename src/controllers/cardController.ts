import {Request, Response} from 'express';
import {Card} from '../models/Card';
import {createDecryptStream} from '../utils/encryption';
import path from 'path';
import fs from 'fs';

// Get all cards with optional filtering
export const getAllCards = async (req: Request, res: Response) => {
    try {
        const {name, type, rarity, page = 1, limit = 10} = req.query;

        // Build filter object
        const filter: any = {};
        if (name) {
            filter.name = {$regex: name, $options: 'i'};
        }
        if (type) {
            filter.type = {$regex: type, $options: 'i'};
        }
        if (rarity) {
            filter.rarity = rarity;
        }

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const cards = await Card.find(filter)
            .select('-__v')
            .skip(skip)
            .limit(limitNum)
            .sort({name: 1});

        const total = await Card.countDocuments(filter);
        const totalPages = Math.ceil(total / limitNum);

        res.json({
            cards,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCards: total,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1
            }
        });
    } catch (error) {
        console.error('Error fetching cards:', error);
        res.status(500).json({error: 'Internal server error'});
    }
};

// Get a single card by ID
export const getCardById = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const card = await Card.findById(id).select('-__v');

        if (!card) {
            return res.status(404).json({error: 'Card not found'});
        }

        res.json(card);
    } catch (error) {
        console.error('Error fetching card:', error);
        res.status(500).json({error: 'Internal server error'});
    }
};

// Get card image
export const getCardImage = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;

        const card = await Card.findById(id);
        if (!card) {
            return res.status(404).json({error: 'Card not found'});
        }

        if (!card.imagePath || !fs.existsSync(card.imagePath)) {
            return res.status(404).json({error: 'Image not found'});
        }

        // Set appropriate content type
        const ext = path.extname(card.imagePath).toLowerCase();
        let contentType = 'image/jpeg'; // default
        if (ext.includes('.png')) contentType = 'image/png';
        if (ext.includes('.gif')) contentType = 'image/gif';
        if (ext.includes('.webp')) contentType = 'image/webp';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

        // Create decrypt stream and pipe to response
        const decryptStream = createDecryptStream(card.imagePath);
        decryptStream.pipe(res);

        decryptStream.on('error', (error) => {
            console.error('Error decrypting image:', error);
            if (!res.headersSent) {
                res.status(500).json({error: 'Failed to decrypt image'});
            }
        });

    } catch (error) {
        console.error('Error serving card image:', error);
        if (!res.headersSent) {
            res.status(500).json({error: 'Internal server error'});
        }
    }
};