# 🚀 3D Galaxy

A modern, scalable, Shopify-inspired eCommerce platform for 3D Printing products, accessories, materials, scanners, STEM kits, and manufacturing solutions.

3D Galaxy provides a complete storefront, configurable admin panel, dynamic category hierarchy, homepage builder, menu builder, theme customization, and Node.js/PostgreSQL backend.

---

# 🌟 Features

## Customer Storefront

* Dynamic Homepage
* Hero Banners
* Mega Menu Navigation
* Product Catalog
* Product Search
* Product Filters
* Category Pages
* Brand Pages
* Product Variants
* Shopping Cart
* Wishlist
* Checkout
* Customer Accounts
* Order Tracking
* SEO Optimized Pages

---

## Admin Dashboard

Shopify-style Admin Panel

### Dashboard

* Revenue Analytics
* Orders Overview
* Product Statistics
* Customer Statistics
* Inventory Monitoring

### Product Management

* Create Products
* Edit Products
* Delete Products
* Product Variants
* Product Images
* Inventory Management
* Product SEO

### Category Management

* Unlimited Category Levels
* Parent / Child Relationships
* Tree View
* Drag & Drop Sorting
* Category SEO
* Category Banners

Example:

```text
3D Printers
├── FDM Printers
│ ├── Bambu Lab
│ │ ├── A1
│ │ ├── A1 Mini
│ │ └── P1S
│ ├── Creality
│ └── Flashforge
│
├── Resin Printers
│ ├── Elegoo
│ └── Uniformation
│
└── Industrial Printers
```

### Brand Management

* Create Brands
* Brand Pages
* Brand SEO
* Brand Logos

### Homepage Builder

* Hero Banners
* Featured Products
* Best Sellers
* Category Sections
* Brand Showcase
* Testimonials

### Menu Builder

* Dynamic Mega Menus
* Nested Menus
* Category Links
* Brand Links

### Theme Settings

* Logo Upload
* Favicon Upload
* Color Configuration
* Typography
* Header Settings
* Footer Settings

### User Management

* Users
* Roles
* Permissions
* Activity Logs

---

# 🛠 Technology Stack

## Frontend

* Angular
* TypeScript
* SCSS
* Angular Material
* RxJS

## Backend

* Node.js
* NestJS / Express.js
* TypeScript

## Database

* PostgreSQL
* Prisma ORM

## Authentication

* JWT Authentication
* Refresh Tokens
* Role Based Access Control

## File Storage

* Local Storage
* AWS S3 Compatible Storage

---

# 📂 Project Structure

```text
3d-galaxy/
│
├── client/
│   ├── src/
│   ├── assets/
│   ├── environments/
│   └── angular.json
│
├── server/
│   ├── src/
│   │   ├── modules/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── validators/
│   │   ├── config/
│   │   ├── database/
│   │   ├── uploads/
│   │   └── app.ts
│   │
│   ├── prisma/
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

---

# 🗄 Database Architecture

## Core Entities

### Categories

Supports unlimited hierarchy.

Fields:

* id
* parentId
* name
* slug
* description
* image
* banner
* sortOrder
* isActive
* isFeatured
* seoTitle
* seoDescription

### Brands

* id
* name
* slug
* logo
* banner

### Products

* id
* categoryId
* brandId
* sku
* name
* description
* price
* salePrice
* stock
* status

### Product Variants

* Color
* Size
* Material
* Model

### Orders

* Customer Orders
* Order Status
* Payment Status
* Shipment Tracking

### Customers

* Profiles
* Addresses
* Wishlist
* Reviews

---

# 🔌 API Modules

## Authentication

```text
/api/auth
```

## Categories

```text
/api/categories
```

## Brands

```text
/api/brands
```

## Products

```text
/api/products
```

## Orders

```text
/api/orders
```

## Customers

```text
/api/customers
```

## Menus

```text
/api/menus
```

## Homepage Builder

```text
/api/homepage
```

## Theme Settings

```text
/api/settings
```

---

# 🔐 Security

* JWT Authentication
* Password Hashing
* RBAC Permissions
* Input Validation
* SQL Injection Protection
* XSS Protection
* Rate Limiting
* Audit Logging

---

# 🎨 Theme Customization

Administrators can configure:

* Store Logo
* Favicon
* Colors
* Typography
* Homepage Layout
* Header
* Footer
* Menus
* Banners

Without changing code.

---

# 📈 Future Enhancements

* Multi Vendor Marketplace
* AI Product Recommendations
* Advanced Analytics
* Mobile App
* Subscription Products
* Loyalty Program
* Referral System
* Multi Language Support
* Multi Currency Support

---

# 🚀 Getting Started

## Frontend

```bash
cd client
npm install
ng serve
```

## Backend

```bash
cd server
npm install
npm run dev
```

## Prisma Migration

```bash
npx prisma migrate dev
```

## Prisma Seed

```bash
npx prisma db seed
```

---

# 📄 License

Private Project - 3D Galaxy

All rights reserved.

---

# 👨‍💻 Developed For

3D Galaxy

A complete ecosystem for:

* 3D Printers
* Filaments
* Resins
* 3D Scanners
* Laser Engravers
* STEM Kits
* Manufacturing Solutions

Built with scalability, performance, and enterprise-grade architecture in mind.
