import request from 'supertest';
import express from 'express';
import {Card} from '../src/models/Card';
import {getTextAnalysis} from '../src/controllers/cardController';

// Create test app
const app = express();
app.use(express.json());
app.get('/test/text-analysis', getTextAnalysis);

describe('Card Controller - getTextAnalysis', () => {
    describe('GET /text-analysis', () => {
        describe('Empty database scenarios', () => {
            it('should return null values when no cards exist', async () => {
                const response = await request(app)
                    .get('/test/text-analysis')
                    .expect(200);

                expect(response.body).toEqual({
                    mostFrequentWord: null,
                    longestWord: null,
                    averageTextLength: 0
                });
            });
        });

        describe('Single card scenarios', () => {
            it('should handle a single card with simple text', async () => {
                await Card.create({
                    name: 'Lightning Bolt',
                    rarity: 'common',
                    type: 'Instant',
                    text: 'Lightning Bolt deals three damage to any target.'
                });

                const response = await request(app)
                    .get('/test/text-analysis')
                    .expect(200);

                expect(response.body.mostFrequentWord).toBe('lightning');
                expect(response.body.longestWord).toBe(null); // Only one card, longest word needs ≥2 cards
                expect(response.body.averageTextLength).toBe(8); // 8 words in the text
            });

            it('should filter out stop words correctly', async () => {
                await Card.create({
                    name: 'Test Card',
                    rarity: 'common',
                    type: 'Creature',
                    text: 'The creature is very powerful and strong in the battle.'
                });

                const response = await request(app)
                    .get('/test/text-analysis')
                    .expect(200);

                // Stop words (the, is, very, and, in, the) should be filtered out
                // Remaining words: creature, powerful, strong, battle
                expect(['creature', 'powerful', 'strong', 'battle']).toContain(response.body.mostFrequentWord);
                expect(response.body.longestWord).toBe(null); // Only one card
                expect(response.body.averageTextLength).toBe(10); // Total 10 words
            });
        });

        describe('Multiple cards scenarios', () => {
            it('should find most frequent word across multiple cards', async () => {
                await Card.create([
                    {
                        name: 'Fire Spell 1',
                        rarity: 'common',
                        type: 'Instant',
                        text: 'Fire burns the enemy.'
                    },
                    {
                        name: 'Fire Spell 2',
                        rarity: 'common',
                        type: 'Instant',
                        text: 'Fire damages creatures.'
                    },
                    {
                        name: 'Water Spell',
                        rarity: 'common',
                        type: 'Instant',
                        text: 'Water extinguishes fire.'
                    }
                ]);

                const response = await request(app)
                    .get('/test/text-analysis')
                    .expect(200);

                expect(response.body.mostFrequentWord).toBe('fire'); // Appears 3 times
                expect(response.body.averageTextLength).toBe(3.33); // Average of 4, 3, 3 words = 3.33
            });

            it('should find longest word appearing in at least 2 cards', async () => {
                await Card.create([
                    {
                        name: 'Card 1',
                        rarity: 'common',
                        type: 'Creature',
                        text: 'Magnificent dragon soars high.'
                    },
                    {
                        name: 'Card 2',
                        rarity: 'common',
                        type: 'Creature',
                        text: 'Magnificent beast roams freely.'
                    },
                    {
                        name: 'Card 3',
                        rarity: 'common',
                        type: 'Spell',
                        text: 'Extraordinarily powerful spell.' // "extraordinarily" is longer but only in 1 card
                    }
                ]);

                const response = await request(app)
                    .get('/test/text-analysis')
                    .expect(200);

                expect(response.body.longestWord).toBe('magnificent'); // 11 letters, appears in 2 cards
                expect(response.body.mostFrequentWord).toBe('magnificent'); // Most frequent non-stop word
            });

            it('should calculate correct average text length', async () => {
                await Card.create([
                    {
                        name: 'Short',
                        rarity: 'common',
                        type: 'Instant',
                        text: 'Quick spell.' // 2 words
                    },
                    {
                        name: 'Medium',
                        rarity: 'common',
                        type: 'Creature',
                        text: 'Medium sized flying creature attacks.' // 5 words
                    },
                    {
                        name: 'Long',
                        rarity: 'common',
                        type: 'Sorcery',
                        text: 'This is a very long and complex magical spell description.' // 11 words
                    }
                ]);

                const response = await request(app)
                    .get('/test/text-analysis')
                    .expect(200);

                // Average: (2 + 5 + 11) / 3 = 5.67 (rounded to 2 decimal places)
                expect(response.body.averageTextLength).toBe(5.67);
            });
        });

        describe('Edge cases', () => {
            it('should handle cards with minimal text content', async () => {
                await Card.create([
                    {
                        name: 'Valid Card',
                        rarity: 'common',
                        type: 'Creature',
                        text: 'Valid creature text.'
                    },
                    {
                        name: 'Single Word Card',
                        rarity: 'common',
                        type: 'Artifact',
                        text: 'Artifact.'
                    }
                ]);

                const response = await request(app)
                    .get('/test/text-analysis')
                    .expect(200);

                // Should handle both cards properly
                expect(['valid', 'creature', 'text', 'artifact']).toContain(response.body.mostFrequentWord);
                expect(response.body.averageTextLength).toBe(2); // (3 + 1) / 2 = 2
            });

            it('should handle cards with special characters and punctuation', async () => {
                await Card.create([
                    {
                        name: 'Punctuation Card 1',
                        rarity: 'common',
                        type: 'Instant',
                        text: 'Deal 3 damage! Target: any creature/player.'
                    },
                    {
                        name: 'Punctuation Card 2',
                        rarity: 'common',
                        type: 'Instant',
                        text: 'Damage (2 points) to target creature, player!'
                    }
                ]);

                const response = await request(app)
                    .get('/test/text-analysis')
                    .expect(200);

                expect(['damage', 'target', 'creature', 'player']).toContain(response.body.mostFrequentWord);
                expect(['damage', 'target', 'creature', 'player']).toContain(response.body.longestWord);
            });

            it('should handle cards with only stop words', async () => {
                await Card.create([
                    {
                        name: 'Stop Words Only',
                        rarity: 'common',
                        type: 'Land',
                        text: 'The and or but in on at to for of with by.'
                    },
                    {
                        name: 'Mixed Content',
                        rarity: 'common',
                        type: 'Creature',
                        text: 'Powerful dragon flies above the clouds.'
                    }
                ]);

                const response = await request(app)
                    .get('/test/text-analysis')
                    .expect(200);

                // Should find non-stop words from the second card
                expect(['powerful', 'dragon', 'flies', 'above', 'clouds']).toContain(response.body.mostFrequentWord);
            });

            it('should handle case insensitivity correctly', async () => {
                await Card.create([
                    {
                        name: 'Case Test 1',
                        rarity: 'common',
                        type: 'Creature',
                        text: 'DRAGON attacks with FIRE.'
                    },
                    {
                        name: 'Case Test 2',
                        rarity: 'common',
                        type: 'Spell',
                        text: 'Dragon breathes fire and flame.'
                    }
                ]);

                const response = await request(app)
                    .get('/test/text-analysis')
                    .expect(200);

                expect(['dragon', 'fire']).toContain(response.body.mostFrequentWord);
                expect(['dragon', 'fire']).toContain(response.body.longestWord);
            });
        });


        describe('Complex algorithm validation', () => {
            it('should handle complex scenario with multiple word frequencies and lengths', async () => {
                await Card.create([
                    {
                        name: 'Card A',
                        rarity: 'common',
                        type: 'Creature',
                        text: 'Magnificent powerful dragon breathes fire.' // magnificent(11), powerful(8), dragon(6), breathes(8), fire(4)
                    },
                    {
                        name: 'Card B',
                        rarity: 'uncommon',
                        type: 'Instant',
                        text: 'Fire spell targets magnificent creature.' // fire(4), spell(5), targets(7), magnificent(11), creature(8)
                    },
                    {
                        name: 'Card C',
                        rarity: 'rare',
                        type: 'Artifact',
                        text: 'Extraordinary artifact grants tremendous power.' // extraordinary(13), artifact(8), grants(6), tremendous(10), power(5)
                    },
                    {
                        name: 'Card D',
                        rarity: 'mythic',
                        type: 'Planeswalker',
                        text: 'Magnificent planeswalker uses tremendous magic.' // magnificent(11), planeswalker(12), uses(4), tremendous(10), magic(5)
                    }
                ]);

                const response = await request(app)
                    .get('/test/text-analysis')
                    .expect(200);

                // Most frequent: "magnificent" appears 3 times
                expect(response.body.mostFrequentWord).toBe('magnificent');

                // Longest word in ≥2 cards: "magnificent" (11 chars, in 3 cards) vs "tremendous" (10 chars, in 2 cards)
                expect(response.body.longestWord).toBe('magnificent');

                // Average: (5+5+5+5)/4 = 5 words per card
                expect(response.body.averageTextLength).toBe(5);
            });
        });
    });
});