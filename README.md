# Business Dashboard Application

A complete, production-ready full-stack Next.js application for managing customers, sales records, and business analytics.

## Tech Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI**: [TailwindCSS](https://tailwindcss.com/) + [ShadCN UI](https://ui.shadcn.com/)
- **Database**: PostgreSQL (Support for [Neon](https://neon.tech/), [Supabase](https://supabase.com/), etc.)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: [NextAuth.js v5](https://authjs.dev/) (Credentials Provider)
- **Charts**: [Recharts](https://recharts.org/) (via ShadCN)
- **Excel Parsing**: [xlsx](https://sheetjs.com/)

## Features

- **Secure Authentication**: Login and Register pages with password hashing (bcryptjs).
- **Protected Dashboard**: Middleware-based route protection for all sensitive pages.
- **Analytics Dashboard**: Summary cards for total customers, sales, revenue, paid, and remaining amounts. Interactive charts for monthly sales and payments.
- **Customer Management**:
  - Full CRUD operations.
  - Search by Name/House and sorting.
  - **Excel Import**: Bulk upload customers with preview and duplicate handling (upsert).
  - Downloadable Excel template.
- **Sales Tracking**:
  - Full CRUD operations with inline editing.
  - Auto-calculation of `TotalAmount` and `RemainingAmount` based on customer rates.
  - Advanced filtering (Date range, Name, House, Balance status).
  - **Excel Import**: Bulk upload sales with automatic customer matching.
  - **Excel Export**: Export filtered sales reports.
- **Customer Ledger**: Detailed view of each customer's sales history and outstanding balance.
- **Responsive Design**: Mobile-friendly sidebar and data tables.
- **Premium Aesthetics**: Glassmorphism UI, smooth gradients, and dark mode by default.

## Local Setup

### 1. Prerequisites
- Node.js (v18 or higher)
- A PostgreSQL database (local or cloud-based)

### 2. Installation
```bash
git clone <repository-url>
cd biz-dashboard
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add the following:
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
AUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```
*Note: Use `npx auth secret` to generate a secure `AUTH_SECRET`.*

### 4. Database Setup
```bash
# Push schema to database
npx prisma db push

# (Optional) Seed the database with demo data
npm run db:seed
```

### 5. Run the App
```bash
npm run dev
```
Visit `http://localhost:3000`. 
Default admin login (if seeded): `admin@example.com` / `password123`.

## Vercel Deployment Guide

### 1. Database Configuration
Use a cloud PostgreSQL provider like **Neon** (highly recommended for Next.js).
- Create a project in Neon.
- Use the **Pooled** connection string (it ends with `-pooler`).

### 2. Vercel Project Setup
- Import your repository to Vercel.
- Add the following Environment Variables in Vercel:
  - `DATABASE_URL`: Your pooled PostgreSQL connection string.
  - `AUTH_SECRET`: A random 32-character string.
  - `NEXTAUTH_URL`: Your deployment URL (e.g., `https://your-app.vercel.app`).

### 3. Build & Deployment
Vercel will automatically detect the Next.js project. The `package.json` includes a `postinstall` script to ensure Prisma Client is generated:
```json
"postinstall": "prisma generate"
```
Schema migrations are handled by `npx prisma db push` (for quick setup) or `npx prisma migrate deploy` (for production history).

## Excel Import Rules

### Customer Upload
- **Format**: `.xlsx` or `.xls`
- **Required Columns**: `Name`, `House`, `RatePerBottle`
- **Rule**: If a customer with the same `Name` and `House` exists, their `RatePerBottle` will be updated. Otherwise, a new record is created.

### Sales Upload
- **Format**: `.xlsx` or `.xls`
- **Required Columns**: `Name`, `House`, `Date`, `Quantity`, `AmountPaid`
- **Rule**: Every record must match an existing customer by `Name` and `House`. The rate is fetched automatically from the customer record at import time.

## License
MIT
