# QUIPO - Expense Sharing App

Modern expense-sharing application built with Next.js 15 and Fastify.

## 🚀 Tech Stack

### Backend
- **Framework**: Fastify 4.25
- **Database**: PostgreSQL 16 + Prisma ORM
- **Cache**: Redis (optional)
- **Auth**: JWT + bcrypt

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19 + Tailwind CSS
- **State**: Zustand + TanStack Query
- **Validation**: Zod

## 📦 Installation

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database URL
npx prisma generate
npx prisma db push
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🔧 Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://user:password@localhost:5432/quipo_db"
JWT_SECRET="your-secret-key"
PORT=3001
```

## 📚 Documentation

- [SRS](./EXPENSE-manage/documents/SRS.md) - Software Requirements
- [HLD](./EXPENSE-manage/documents/HLD.md) - High-Level Design
- [LLD](./EXPENSE-manage/documents/LLD.md) - Low-Level Design
- [Migration Plan](./MIGRATION_PLAN.md) - Implementation roadmap

## 🎯 Features

- ✅ User authentication (JWT)
- ✅ Group management
- ✅ Expense splitting (5 types)
- ✅ Balance calculation
- ✅ Debt simplification
- 🚧 Payment integration (Razorpay)
- 🚧 Analytics & reports

 
