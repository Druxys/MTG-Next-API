import express from 'express';
import {
  getAllCards,
  getCardById,
  getCardImage
} from '../controllers/cardController';

const router = express.Router();

// GET /api/cards - Get all cards with optional filtering and pagination
// Query parameters: name, type, rarity, page, limit
router.get('/', getAllCards);

// GET /api/cards/:id - Get a specific card by ID
router.get('/:id', getCardById);

// GET /api/cards/:id/image - Get card image (decrypted)
router.get('/:id/image', getCardImage);

export default router;