import express from 'express';
import {
  getAllCards,
  getCardById,
  getCardImage,
  createCard,
  getTextAnalysis
} from '../controllers/cardController';
import upload from '../middleware/upload';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/cards:
 *   post:
 *     summary: Create a new card (with optional image upload)
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - rarity
 *               - type
 *               - text
 *             properties:
 *               name:
 *                 type: string
 *                 description: The card name
 *                 example: "Lightning Bolt"
 *               rarity:
 *                 type: string
 *                 enum: [common, uncommon, rare, mythic]
 *                 description: The card rarity
 *                 example: "common"
 *               type:
 *                 type: string
 *                 description: The card type
 *                 example: "Instant"
 *               text:
 *                 type: string
 *                 description: The card text/description
 *                 example: "Lightning Bolt deals 3 damage to any target."
 *               manaCost:
 *                 type: string
 *                 description: The mana cost of the card
 *                 example: "{R}"
 *               convertedManaCost:
 *                 type: number
 *                 minimum: 0
 *                 description: The converted mana cost
 *                 example: 1
 *               colors:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [W, U, B, R, G]
 *                 description: Array of color codes (W=White, U=Blue, B=Black, R=Red, G=Green)
 *                 example: ["R"]
 *               scryfallId:
 *                 type: string
 *                 description: Unique Scryfall identifier
 *                 example: "e3285e6e-fda6-42d8-8d44-d4fcb12443c8"
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - rarity
 *               - type
 *               - text
 *             properties:
 *               name:
 *                 type: string
 *                 description: The card name
 *                 example: "Lightning Bolt"
 *               rarity:
 *                 type: string
 *                 enum: [common, uncommon, rare, mythic]
 *                 description: The card rarity
 *                 example: "common"
 *               type:
 *                 type: string
 *                 description: The card type
 *                 example: "Instant"
 *               text:
 *                 type: string
 *                 description: The card text/description
 *                 example: "Lightning Bolt deals 3 damage to any target."
 *               manaCost:
 *                 type: string
 *                 description: The mana cost of the card
 *                 example: "{R}"
 *               convertedManaCost:
 *                 type: number
 *                 minimum: 0
 *                 description: The converted mana cost
 *                 example: 1
 *               colors:
 *                 type: string
 *                 description: JSON string array of color codes (W=White, U=Blue, B=Black, R=Red, G=Green)
 *                 example: '["R"]'
 *               scryfallId:
 *                 type: string
 *                 description: Unique Scryfall identifier
 *                 example: "e3285e6e-fda6-42d8-8d44-d4fcb12443c8"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Card image file (JPEG, PNG, GIF, WebP - max 10MB)
 *                 example: (binary data)
 *     responses:
 *       201:
 *         description: Card created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Card created successfully"
 *                 card:
 *                   $ref: '#/components/schemas/Card'
 *       400:
 *         description: Validation error or duplicate data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               validation_error:
 *                 summary: Missing required field
 *                 value:
 *                   error: "Name is required and must be a non-empty string"
 *               duplicate_error:
 *                 summary: Duplicate Scryfall ID
 *                 value:
 *                   error: "A card with this Scryfall ID already exists"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               no_token:
 *                 summary: No token provided
 *                 value:
 *                   error: "Access token required. Please provide a valid authentication token."
 *               invalid_token:
 *                 summary: Invalid token
 *                 value:
 *                   error: "Invalid token. Please authenticate again."
 *               expired_token:
 *                 summary: Token expired
 *                 value:
 *                   error: "Token expired. Please authenticate again."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authenticateToken, upload.single('image'), createCard);

/**
 * @swagger
 * /api/cards:
 *   get:
 *     summary: Get all cards with optional filtering and pagination
 *     tags: [Cards]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by card name (case-insensitive partial match)
 *         example: "Lightning"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by card type (case-insensitive partial match)
 *         example: "Instant"
 *       - in: query
 *         name: rarity
 *         schema:
 *           type: string
 *           enum: [common, uncommon, rare, mythic]
 *         description: Filter by rarity
 *         example: "rare"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Successfully retrieved cards
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CardsResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', getAllCards);

/**
 * @swagger
 * /api/cards/text-analysis:
 *   get:
 *     summary: Get text analysis statistics for all cards
 *     tags: [Cards]
 *     description: |
 *       Analyzes all stored Magic cards' texts and returns:
 *       - The most frequent word across all card texts (ignoring stop words)
 *       - The longest word that appears in at least 2 different cards
 *       - The average length of card texts (in words), rounded to 2 decimals
 *     responses:
 *       200:
 *         description: Successfully retrieved text analysis statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mostFrequentWord:
 *                   type: string
 *                   nullable: true
 *                   description: The most frequent word across all card texts (excluding stop words)
 *                   example: "damage"
 *                 longestWord:
 *                   type: string
 *                   nullable: true
 *                   description: The longest word that appears in at least 2 different cards
 *                   example: "indestructible"
 *                 averageTextLength:
 *                   type: number
 *                   description: The average length of card texts in words, rounded to 2 decimals
 *                   example: 12.45
 *                 totalCards:
 *                   type: integer
 *                   description: Total number of cards analyzed
 *                   example: 150
 *                 totalWords:
 *                   type: integer
 *                   description: Total number of words across all card texts
 *                   example: 1867
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/text-analysis', getTextAnalysis);

/**
 * @swagger
 * /api/cards/{id}:
 *   get:
 *     summary: Get a specific card by ID
 *     tags: [Cards]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Card ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Successfully retrieved card
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Card'
 *       404:
 *         description: Card not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Card not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getCardById);

/**
 * @swagger
 * /api/cards/{id}/image:
 *   get:
 *     summary: Get card image (decrypted)
 *     tags: [Cards]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Card ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Successfully retrieved card image
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/gif:
 *             schema:
 *               type: string
 *               format: binary
 *           image/webp:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Type:
 *             schema:
 *               type: string
 *               example: "image/jpeg"
 *           Cache-Control:
 *             schema:
 *               type: string
 *               example: "public, max-age=3600"
 *       404:
 *         description: Card or image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               card_not_found:
 *                 summary: Card not found
 *                 value:
 *                   error: "Card not found"
 *               image_not_found:
 *                 summary: Image not found
 *                 value:
 *                   error: "Image not found"
 *       500:
 *         description: Internal server error or failed to decrypt image
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               server_error:
 *                 summary: Server error
 *                 value:
 *                   error: "Internal server error"
 *               decrypt_error:
 *                 summary: Decryption failed
 *                 value:
 *                   error: "Failed to decrypt image"
 */
router.get('/:id/image', getCardImage);

export default router;