import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {Card} from '../models/Card';
import {encryptFile, generateEncryptedFilename} from '../utils/encryption';

// Load environment variables
dotenv.config();

// Scryfall API endpoint for random cards
const SCRYFALL_RANDOM_API = 'https://api.scryfall.com/cards/random';
const CARDSTOFETCH = 100;

interface ScryfallCard {
    id: string;
    name: string;
    mana_cost?: string;
    cmc: number;
    type_line: string;
    oracle_text?: string;
    rarity: string;
    colors?: string[];
    image_uris?: {
        normal: string;
        large: string;
        small: string;
    };
}

/**
 * Download image from URL and save to temporary file
 */
async function downloadImage(imageUrl: string, filename: string): Promise<string> {
    const tempDir = path.join(process.cwd(), 'src', 'uploads', 'temp');
    await fs.promises.mkdir(tempDir, {recursive: true});

    const tempPath = path.join(tempDir, filename);

    const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'stream'
    });

    const writer = fs.createWriteStream(tempPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(tempPath));
        writer.on('error', reject);
    });
}

/**
 * Convert Scryfall rarity to our enum format
 */
function normalizeRarity(scryfallRarity: string): string {
    switch (scryfallRarity) {
        case 'mythic':
            return 'mythic';
        case 'rare':
            return 'rare';
        case 'uncommon':
            return 'uncommon';
        case 'common':
        default:
            return 'common';
    }
}

/**
 * Fetch a single random card from Scryfall API
 */
async function fetchSingleCardFromScryfall(seenIds: Set<string>): Promise<ScryfallCard | null> {
    try {
        const response = await axios.get(SCRYFALL_RANDOM_API, {
            params: {q: 'has:image'}
        });

        const card = response.data;

        // Avoid duplicate cards
        if (!seenIds.has(card.id)) {
            seenIds.add(card.id);
            console.log(`Fetched random card: ${card.name}`);
            return card;
        } else {
            console.log(`Duplicate card skipped: ${card.name}`);
            return null;
        }

    } catch (error) {
        console.error('Failed to fetch random card:', (error as any).message);
        return null;
    }
}

/**
 * Fetch cards from Scryfall API using truly random calls for better randomization
 * @deprecated - kept for backwards compatibility, use fetchSingleCardFromScryfall instead
 */
async function fetchCardsFromScryfall(count: number): Promise<ScryfallCard[]> {
    const cards: ScryfallCard[] = [];
    const seenIds = new Set<string>();

    try {
        console.log(`Fetching ${count} unique cards from Scryfall API using random calls...`);

        // Use only random API calls for truly random selection
        while (cards.length < count) {
            const card = await fetchSingleCardFromScryfall(seenIds);
            if (card) {
                cards.push(card);
                console.log(`Progress: ${cards.length}/${count} cards fetched`);
            }

            // Add delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 100));

            // Safety check to avoid infinite loops
            if (seenIds.size > count * 3) {
                console.warn('Too many duplicate cards encountered, breaking fetch loop');
                break;
            }
        }

    } catch (error) {
        console.error('Error fetching cards from Scryfall:', error);
    }

    return cards;
}

/**
 * Save card to database with encrypted image
 */
async function saveCard(scryfallCard: ScryfallCard): Promise<boolean> {
    try {
        // Check if card already exists
        const existingCard = await Card.findOne({
            $or: [
                {scryfallId: scryfallCard.id},
                {name: scryfallCard.name}
            ]
        });

        if (existingCard) {
            console.log(`Card "${scryfallCard.name}" already exists, skipping...`);
            return false;
        }

        let imagePath: string | undefined;

        // Download and encrypt image if available
        if (scryfallCard.image_uris?.normal) {
            try {
                console.log(`Downloading image for "${scryfallCard.name}"...`);

                const imageExt = '.jpg'; // Scryfall images are typically JPEGs
                const tempFilename = `${scryfallCard.id}${imageExt}`;
                const tempPath = await downloadImage(scryfallCard.image_uris.normal, tempFilename);

                // Encrypt the downloaded image
                const encryptedFilename = generateEncryptedFilename(tempFilename);
                const encryptedPath = path.join(process.cwd(), 'src', 'uploads', 'encrypted', encryptedFilename);

                await encryptFile(tempPath, encryptedPath);
                imagePath = encryptedPath;

                // Clean up temporary file
                await fs.promises.unlink(tempPath);

                console.log(`Image encrypted and saved for "${scryfallCard.name}"`);

            } catch (imageError) {
                console.warn(`Failed to process image for "${scryfallCard.name}":`, (imageError as any).message);
            }
        }

        // Create and save the card
        const card = new Card({
            name: scryfallCard.name,
            rarity: normalizeRarity(scryfallCard.rarity),
            type: scryfallCard.type_line,
            text: scryfallCard.oracle_text || '',
            manaCost: scryfallCard.mana_cost || '',
            convertedManaCost: scryfallCard.cmc || 0,
            colors: scryfallCard.colors || [],
            scryfallId: scryfallCard.id,
            imagePath
        });

        await card.save();
        console.log(`Saved card: ${card.name} (${card.rarity})`);
        return true;

    } catch (error) {
        console.error(`Failed to save card "${scryfallCard.name}":`, error);
        return false;
    }
}

/**
 * Main function to populate the database with a target number of successfully saved cards
 */
async function populateCards(targetCount: number = 100) {
    try {
        // Connect to MongoDB
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('Connected to MongoDB');

        // Ensure directories exist
        const encryptedDir = path.join(process.cwd(), 'src', 'uploads', 'encrypted');
        await fs.promises.mkdir(encryptedDir, {recursive: true});

        console.log(`\nTarget: Save ${targetCount} new cards to the database`);
        let savedCount = 0;
        let totalFetched = 0;
        const maxRetries = targetCount * 5; // Safety limit to avoid infinite loops
        const seenIds = new Set<string>(); // Track seen card IDs globally

        console.log('Starting one-by-one fetch and process approach...');
        console.log('This ensures we reach the exact target count even with failures!\n');

        // Keep fetching and saving until we reach the target count
        while (savedCount < targetCount && totalFetched < maxRetries) {
            console.log(`Progress: ${savedCount}/${targetCount} cards saved (${totalFetched} total fetched)`);

            // Fetch a single card
            const scryfallCard = await fetchSingleCardFromScryfall(seenIds);
            totalFetched++;

            if (!scryfallCard) {
                console.log('Failed to fetch card, trying another...');
                // Add delay to respect rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }

            // Try to save the card
            console.log(`Attempting to save: ${scryfallCard.name}`);
            const saved = await saveCard(scryfallCard);

            if (saved) {
                savedCount++;
                console.log(`Success! Saved card ${savedCount}/${targetCount}: ${scryfallCard.name}`);
            } else {
                console.log(`Failed to save: ${scryfallCard.name} - fetching replacement...`);
            }

            // Add delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 100));

            // Progress update every 10 cards
            if (totalFetched % 10 === 0) {
                const successRate = ((savedCount / totalFetched) * 100).toFixed(1);
                console.log(`\n--- Progress Update ---`);
                console.log(`Saved: ${savedCount}/${targetCount} (${successRate}% success rate)`);
                console.log(`Total API calls: ${totalFetched}`);
                console.log(`Remaining: ${targetCount - savedCount} cards\n`);
            }

            // Safety check
            if (totalFetched >= maxRetries) {
                console.warn(`\nReached maximum fetch limit (${maxRetries}). This might indicate API issues or a very populated database.`);
                break;
            }
        }

        console.log(`\nSuccessfully saved ${savedCount} cards to the database!`);

    } catch (error) {
        console.error('Error populating cards:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n\nDone');
        console.log('\nDisconnected from MongoDB');
    }
}

// Run the script
if (require.main === module) {
    populateCards().catch(console.error);
}

export {populateCards};