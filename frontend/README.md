# Frontend - TechMart

## Structure

This frontend follows a feature-based architecture for better scalability:

### Directory Structure

```
src/
├── components/        # Shared components
│   ├── layout/        # Layout components (Header, Footer)
│   └── common/        # Reusable UI components
├── features/          # Feature modules
│   ├── products/      # Product listing, detail
│   ├── cart/          # Shopping cart
│   ├── auth/          # Authentication
│   └── orders/        # Order management
├── pages/             # Top-level pages
├── services/          # API service layer
├── store/             # State management (Zustand)
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Utility-first CSS
- **Zustand** - Lightweight state management
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **React Hot Toast** - Toast notifications

## Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development server
npm run dev
```

## State Management

Uses Zustand for global state:

- `authStore` - User authentication state
- `cartStore` - Shopping cart state

## Features

### Implemented
- ✅ Product listing with filters
- ✅ Product detail page
- ✅ Shopping cart
- ✅ User authentication
- ✅ Responsive design
- ✅ Toast notifications

### To Be Implemented
- ⏳ Checkout process
- ⏳ Order history
- ⏳ User profile
- ⏳ Product search
- ⏳ Admin dashboard

## Development

```bash
npm run dev      # Start dev server at http://localhost:5173
npm run build    # Build for production
npm run preview  # Preview production build
```

## Building for Production

```bash
npm run build
# Output will be in the dist/ directory
# Deploy the dist/ directory to your hosting service
```

## Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5001/api
```

## Code Style

- Use functional components with hooks
- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Keep components small and focused
- Organize by feature, not by type
