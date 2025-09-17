import mongoose, {Document, Schema} from 'mongoose';

export interface ICard extends Document {
    name: string;
    rarity: string;
    type: string;
    text: string;
    imagePath?: string;
    scryfallId?: string;
    manaCost?: string;
    convertedManaCost?: number;
    colors?: string[];
    createdAt: Date;
    updatedAt: Date;
}

const CardSchema: Schema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    rarity: {
        type: String,
        required: true,
        enum: ['common', 'uncommon', 'rare', 'mythic']
    },
    type: {
        type: String,
        required: true,
        trim: true
    },
    text: {
        type: String,
        required: true
    },
    imagePath: {
        type: String,
        default: null
    },
    scryfallId: {
        type: String,
        unique: true,
        sparse: true
    },
    manaCost: {
        type: String,
        default: ''
    },
    convertedManaCost: {
        type: Number,
        default: 0
    },
    colors: [{
        type: String,
        enum: ['W', 'U', 'B', 'R', 'G']
    }]
}, {
    timestamps: true
});

CardSchema.index({name: 1});
CardSchema.index({type: 1});
CardSchema.index({rarity: 1});

export const Card = mongoose.model<ICard>('Card', CardSchema);