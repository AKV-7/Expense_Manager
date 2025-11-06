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

## 🧠 Algorithms

This project uses two main algorithms for managing expenses and debts:

### Expense Splitting

The application supports various ways to split an expense among participants:

-   **Equal:** The expense is divided equally among all participants.
-   **Percentage:** Participants owe a certain percentage of the total amount.
-   **Exact:** Participants owe a specific amount.
-   **Shares:** The expense is divided based on the number of shares each participant has.

### Debt Simplification

To minimize the number of transactions required to settle debts within a group, a cash flow minimization algorithm is used. Here's how it works:

1.  **Calculate Net Balances:** For each user in a group, the algorithm calculates their net balance by summing up all their credits (money owed to them) and subtracting all their debts (money they owe).
2.  **Identify Creditors and Debtors:** Users are then divided into two groups:
    *   **Creditors:** Those with a positive net balance (they are owed money).
    *   **Debtors:** Those with a negative net balance (they owe money).
3.  **Greedy Matching:** The algorithm then uses a greedy approach to match debtors and creditors. It sorts both groups and matches the largest debtor with the largest creditor, creating a transaction for the minimum of the two amounts. This process is repeated until all debts are settled.

This approach significantly reduces the number of transactions needed to clear all balances, making it easier for users to settle up. For example, if A owes B $10 and B owes C $10, the simplified transaction would be A pays C $10.

## 🎯 Features

- ✅ User authentication (JWT)
- ✅ Group management
- ✅ Expense splitting (5 types)
- ✅ Balance calculation
- ✅ Debt simplification
- 🚧 Payment integration (Razorpay)
- 🚧 Analytics & reports

 
