# MTG Card API

A REST API for storing and managing Magic: The Gathering card data with encrypted image storage and text analysis features.

## Features

- **Card CRUD Operations**: Create, read, update, and delete MTG cards
- **File Encryption**: Images are encrypted using AES-256-CBC with streaming for memory efficiency
- **Filtering & Pagination**: Search cards by name, type, and rarity
- **Text Analysis**: Algorithmic endpoints for card text statistics
- **Sample Data**: Populated with 100 real MTG cards from Scryfall API

## Technologies

- **TypeScript** - Type-safe JavaScript
- **Node.js & Express** - Server framework
- **MongoDB & Mongoose** - Database and ODM
- **Multer** - File upload handling
- **Axios** - HTTP client for Scryfall API
- **Crypto** - Built-in Node.js encryption

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- MongoDB 
- pnpm package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Druxys/MTG-Next-API
cd mtg-api
```

2. Install dependencies:
```bash
pnpm install
```

3. Environment variables are already configured in `.env`:
```bash
MONGO_URI=mongodb://localhost:27017
PORT=4000
ENCRYPT_KEY=a729aac0695bfbe12f367057fdd73955c27c761d1083b2e55068d2be38a97ccd
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-environment-please
JWT_EXPIRES_IN=24h
SCRYFALL_API_URI=https://api.scryfall.com
```

4. Populate the database with sample cards:
```bash
pnpm run populate
```

5. Start the development server:
```bash
pnpm run dev
```

The API will be available at `http://localhost:4000`

## API Documentation

Complete interactive API documentation is available via Swagger UI at:
`http://localhost:4000/api/docs`

## Available Scripts

- `pnpm run dev` - Start development server with hot reload
- `pnpm run build` - Build TypeScript to JavaScript  
- `pnpm run start` - Start production server
- `pnpm run populate` - Populate database with sample MTG cards
- `pnpm run test` - Run tests

---
Time Spent: Approximately 4-5 hours on implementation and documentation


**Author**: Paul Turpin

