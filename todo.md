# Morele Price Tracker - TODO

## Core Features
- [x] Database schema for products and price history
- [x] Product management API (add, list, delete, get details)
- [x] Price scraping from morele.net (extract from div#product_price)
- [x] Admin configuration panel for tracking interval
- [x] Automated background job for price tracking
- [x] Price comparison logic (up/down/unchanged indicators)
- [x] Price history storage and retrieval
- [x] Price alert system for significant drops (10%+)
- [x] Owner notifications for price alerts

## Frontend Pages
- [x] Dashboard/Home page with product list
- [x] Add product form (URL or product code input)
- [x] Product detail page with price history chart
- [x] Admin settings page for tracking interval configuration
- [x] Price history visualization with charts
- [x] Landing page with feature overview

## UI Components
- [x] Product list table with price indicators
- [x] Add product modal/form
- [x] Admin settings panel
- [x] Price chart component (Recharts)
- [x] Alert notification display (via owner notifications)

## Testing & Deployment
- [x] Write vitest tests for backend logic
- [x] Test price scraping functionality
- [x] Test alert notification system
- [ ] Create checkpoint and prepare for deployment

## Bug Fixes
- [x] Fix price scraping from div#product_price - implement multi-strategy price extraction
- [x] Fix URL validation to accept morele.net links without .html extension
- [x] Refine scraper to extract main product price - successfully extracting prices from morele.net products




## New Enhancements
- [x] Add detailed error logging for scraping failures (only for sigarencja@gmail.com)
- [x] Add price graph on product detail page with historical data
- [x] Show detailed price information (price value and date) on hover/tooltip


## UI Redesign
- [x] Change product list to show clickable product names that open modal
- [x] Add product image scraping from morele.net product pages
- [x] Create product detail modal with image, price, and price graph
- [x] Remove separate product detail page navigation


## Bug Fixes (Current)
- [x] Fix price extraction to use data-price attribute from #product_price div


## New Feature: Product Categories
- [x] Add category field to products table schema
- [x] Implement category scraping from .main-breadcrumb last element
- [x] Add category filtering UI on dashboard
- [x] Display category in product list


## Bug Fixes (Current Session)
- [x] Fix category scraper to extract text from .breadcrumb a element and filter out brand links


## Major Refactor: Remove Authentication & Create Admin Panel
- [x] Remove user authentication from main application
- [x] Make dashboard public without login
- [x] Remove DashboardLayout sidebar
- [x] Create admin panel route with separate login
- [x] Add admin users table with SHA1 password hashing
- [x] Implement admin login functionality
- [ ] Create admin user management interface
- [ ] Test public dashboard and admin panel


## New Feature: User-Requested Price Check
- [x] Add "Request Price Check" button to product modal
- [x] Implement 15-minute cooldown logic (hide button if last check < 15 min ago)
- [x] Create API endpoint for manual price check requests
- [x] Show loading state and success/error feedback


## Admin Dashboard Development
- [x] Create admin dashboard layout with sidebar navigation
- [x] Implement product management (add, edit, delete products)
- [x] Build settings panel (tracking interval, alert threshold configuration)
- [x] Add scraping logs viewer with error details
- [x] Create admin user management interface
- [ ] Test admin dashboard functionality
