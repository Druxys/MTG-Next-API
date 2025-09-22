import {Request, Response} from 'express';
import {Card} from '../models/Card';
import {createDecryptStream, encryptFile, generateEncryptedFilename} from '../utils/encryption';
import path from 'path';
import fs from 'fs';

// Get all cards with optional filtering
export const getAllCards = async (req: Request, res: Response) => {
    try {
        const {name, type, rarity, colors, page = 1, limit = 10} = req.query;

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
        if (colors) {
            // Handle both single color and multiple colors (comma-separated)
            const colorArray = typeof colors === 'string' ? colors.split(',').map(c => c.trim().toUpperCase()) : [];
            if (colorArray.length > 0) {
                filter.colors = {$in: colorArray};
            }
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

// Create a new card (with optional image upload)
export const createCard = async (req: Request, res: Response) => {
    let tempFilePath: string | null = null;
    
    try {
        console.log('Request body:', req.body);
        console.log('Uploaded file:', req.file);
        
        const { name, rarity, type, text, manaCost, convertedManaCost, colors, scryfallId } = req.body;

        // Validate required fields
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: 'Name is required and must be a non-empty string' });
        }

        if (!rarity || !['common', 'uncommon', 'rare', 'mythic'].includes(rarity)) {
            return res.status(400).json({ error: 'Rarity is required and must be one of: common, uncommon, rare, mythic' });
        }

        if (!type || typeof type !== 'string' || type.trim().length === 0) {
            return res.status(400).json({ error: 'Type is required and must be a non-empty string' });
        }

        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Text is required and must be a string' });
        }

        // Validate optional fields
        if (colors) {
            let colorArray: string[];
            try {
                // Handle both string (JSON) and array formats
                colorArray = Array.isArray(colors) ? colors : JSON.parse(colors);
            } catch {
                return res.status(400).json({ error: 'Colors must be a valid JSON array or array of color codes' });
            }
            
            if (!Array.isArray(colorArray) || !colorArray.every(color => ['W', 'U', 'B', 'R', 'G'].includes(color))) {
                return res.status(400).json({ error: 'Colors must be an array of valid color codes: W, U, B, R, G' });
            }
        }

        const convertedManaCostNum = convertedManaCost ? parseFloat(convertedManaCost) : undefined;
        if (convertedManaCostNum !== undefined && (isNaN(convertedManaCostNum) || convertedManaCostNum < 0)) {
            return res.status(400).json({ error: 'Converted mana cost must be a non-negative number' });
        }

        // Check for duplicate scryfallId if provided
        if (scryfallId) {
            const existingCard = await Card.findOne({ scryfallId });
            if (existingCard) {
                return res.status(400).json({ error: 'A card with this Scryfall ID already exists' });
            }
        }

        // Create card object
        const cardData: any = {
            name: name.trim(),
            rarity,
            type: type.trim(),
            text
        };

        // Add optional fields if provided
        if (manaCost) cardData.manaCost = manaCost;
        if (convertedManaCostNum !== undefined) cardData.convertedManaCost = convertedManaCostNum;
        if (colors) {
            const colorArray = Array.isArray(colors) ? colors : JSON.parse(colors);
            if (colorArray.length > 0) cardData.colors = colorArray;
        }
        if (scryfallId) cardData.scryfallId = scryfallId;

        // Handle image upload if file is provided
        if (req.file) {
            tempFilePath = req.file.path;
            
            // Generate encrypted filename and path
            const encryptedFilename = generateEncryptedFilename(req.file.originalname);
            const encryptedPath = path.join(__dirname, '..', 'uploads', 'encrypted', encryptedFilename);
            
            try {
                // Encrypt the uploaded file
                await encryptFile(tempFilePath, encryptedPath);
                cardData.imagePath = encryptedPath;
                
                console.log(`Image encrypted and saved: ${encryptedPath}`);
            } catch (encryptError) {
                console.error('Error encrypting image:', encryptError);
                return res.status(500).json({ error: 'Failed to process uploaded image' });
            }
        }

        // Create and save the card
        const card = new Card(cardData);
        const savedCard = await card.save();

        // Clean up temporary file after successful save
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                await fs.promises.unlink(tempFilePath);
                console.log(`Temporary file cleaned up: ${tempFilePath}`);
            } catch (cleanupError) {
                console.warn('Warning: Failed to cleanup temporary file:', cleanupError);
            }
        }

        // Return the created card without __v field
        const responseCard = savedCard.toObject();
        delete responseCard.__v;

        res.status(201).json({
            message: 'Card created successfully',
            card: responseCard,
            hasImage: !!req.file
        });

    } catch (error: any) {
        console.error('Error creating card:', error);

        // Clean up temporary file on error
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                await fs.promises.unlink(tempFilePath);
                console.log(`Temporary file cleaned up after error: ${tempFilePath}`);
            } catch (cleanupError) {
                console.warn('Warning: Failed to cleanup temporary file after error:', cleanupError);
            }
        }

        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map((err: any) => err.message);
            return res.status(400).json({ error: 'Validation failed', details: validationErrors });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(400).json({ error: 'A card with this unique field already exists' });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
};