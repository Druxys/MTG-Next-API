import express from 'express';
import {
  getAllCards,
  getCardById,
  getCardImage
} from '../controllers/cardController';

const router = express.Router();

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