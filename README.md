# Academic Portal - Multi-Role Academic Management System

## Overview

Academic Portal is a comprehensive web-based platform designed to facilitate academic management between faculty and students, with administrative oversight. The system handles assignment submissions, group management, and academic profiles for Jain University.

## Core Features

### Authentication System
- Email/password-based login with university email domain restriction (@jainuniversity.ac.in)
- Role-based access control (Super Admin, Faculty, Student)
- Secure password requirements

### User Roles & Permissions

1. **Super Admin**
   - Manages faculty accounts
   - Views system-wide statistics
   - Has complete oversight of all activities
   - Default credentials: superadmin@jainuniversity.ac.in

2. **Faculty (Admin)**
   - Manages student groups
   - Views student submissions
   - Tracks student progress
   - Manages their department information

3. **Students**
   - Create and manage academic profiles
   - Submit assignments via URLs (e.g., Google Drive, GitHub)
   - View their submission history
   - Join faculty groups
   - Track their academic progress

### Student Management
- Profile creation with academic details (Name, USN number, class, semester)
- Group assignment system
- Submission tracking

### Faculty Management
- Department assignment
- Student group creation and management
- Submission review system
- Dashboard with analytics

### Assignment Submission System
- URL-based submission system
- Timestamp tracking
- Faculty group association
- Submission history

## Technical Stack

- **Frontend**: Next.js with TypeScript
- **UI**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase + authentication
- **State Management**: Zustand
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd academic-portal
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Set up environment variables

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Deployment

This application can be easily deployed on Vercel:

1. Push your code to a GitHub repository
2. Import the project in Vercel
3. Set the environment variables
4. Deploy

## License

This project is licensed under the MIT License.
