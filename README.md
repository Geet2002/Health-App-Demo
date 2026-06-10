<div align="center">
  <h1>CareCommunityWebApp</h1>
  <p>A comprehensive, full-stack platform designed to connect individuals in need of healthcare support, blood donations, and community resources.</p>
</div>

---

## 📖 Overview

**CareCommunityWebApp** is a modern, responsive web application that bridges the gap between individuals seeking healthcare support and those willing to provide it. It empowers users to create and join communities, share personal health experiences, ask questions, handle medical emergencies, and coordinate life-saving blood donations effectively. 

Built with scalability, accessibility, and real-time communication in mind, this platform leverages AI tools like OpenAI and Google Cloud Speech, paired with interactive geographic mapping, to create a deeply engaging and supportive environment.

---

## 🌟 Features Deep Dive

### 1. Robust User Ecosystem & Medical Verification
- **Secure Authentication**: Traditional credentials and seamless Google OAuth integration.
- **Medical Professional Verification**: Users can verify their status as healthcare professionals, giving their advice more weight and trust within the community.
- **Public & Private Profiles**: Detailed user profiles showing activity, health shares, and verified status.

### 2. Lifesaving Blood Donation Network
- **Interactive Requests**: Create urgent blood requests specifying blood group, units required, and urgency level.
- **Geospatial Mapping**: Requests are pinned on interactive maps (via MapLibre GL) so nearby donors can easily locate and respond.
- **Direct Coordination**: Donors can browse requests, submit direct offers with contact details, and coordinate via dedicated comment threads on the request.

### 3. Community Hub & Resources
- **Niche Communities**: Create or join public/private communities tailored to specific health topics (e.g., "Diabetes Support", "Mental Health Check-in").
- **Admin Management**: Community creators can manage member approvals, moderate content, and assign roles.
- **Resource Sharing**: Share helpful articles, links, and uploaded files directly to community boards.
- **Real-World Events**: Organize local community events with map integrations, date/time scheduling, and attendee tracking.

### 4. Dynamic Feed & Emergency Alerts
- **Categorized Posts**: Publish standard 'Queries' or urgent 'Emergency' posts that trigger immediate visibility.
- **Engagement**: Upvote/downvote system for posts and comments to surface the most helpful information.
- **Nested Discussions**: Detailed, threaded comment sections for in-depth conversations on community posts.

### 5. "Health Moments" Social Feed
- **Media-Rich Sharing**: A dedicated space to share health journeys, tips, and recovery milestones.
- **Multimedia Support**: Upload images, audio recordings, or videos using robust backend processing (Sharp & Multer).
- **Community Support**: React to Health Moments with likes or dislikes to show support and solidarity.

### 6. Real-Time & AI Integrations
- **Live Notifications**: Powered by Socket.io, users receive instant updates on comments, community approvals, and blood donation offers.
- **Accessibility & AI**: Integrates **Google Cloud Speech** for voice-to-text functionality and **OpenAI API** for smart content generation or assistance throughout the app.

---

## 🛠️ Technology Stack

**Frontend Architecture**
- **Core Framework**: React 19 & Vite for lightning-fast builds and optimized rendering.
- **Styling**: Tailwind CSS for a utility-first, fully responsive design, combined with Framer Motion for fluid UI animations.
- **Routing**: React Router DOM v7 for seamless client-side navigation.
- **Maps**: MapLibre GL & React Leaflet for interactive, location-based features.
- **Real-time**: Socket.io-client for instant bidirectional communication.

**Backend Architecture**
- **Server**: Node.js & Express 5 for a robust and scalable API layer.
- **Database**: MySQL 2 for complex, relational data storage ensuring data integrity across users, communities, and posts.
- **Real-time Event Broadcasting**: Socket.io server-side implementation.
- **Security & Auth**: JWT (JSON Web Tokens), bcryptjs for hashing, Helmet & XSS for security, and Google Auth Library.
- **Media Processing**: Multer for handling multipart/form-data uploads and Sharp for on-the-fly image optimization.
- **Cloud Integrations**: `@google-cloud/speech` and `openai` Node SDKs.

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites
- **Node.js** (v18.x or higher recommended)
- **MySQL Server** (v8.x recommended)
- Google Cloud Console Project (for Speech API & OAuth)
- OpenAI API Key

### 1. Database Initialization
1. Launch your MySQL server and create a new database.
2. The complete database schema is located at `backend/schema.txt`. Execute these SQL commands to initialize all required tables (users, posts, communities, blood_requests, etc.).

### 2. Backend Environment Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install the necessary Node packages:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` directory. You will need to configure:
   - Database credentials (`DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`)
   - JWT Secret (`JWT_SECRET`)
   - Google Cloud Credentials (Path to `service-account.json`)
   - Port configurations
4. Start the development server (runs with nodemon):
   ```bash
   npm run dev
   ```

### 3. Frontend Environment Setup
1. Open a new terminal tab and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend` directory. Include necessary variables such as:
   - `VITE_API_BASE_URL` (pointing to your local backend, e.g., `http://localhost:5000`)
   - Google OAuth Client ID
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to the local URL provided by Vite (usually `http://localhost:5173`).

---

## 📂 Project Structure

```text
CareCommunityWebApp/
├── frontend/                 # React UI application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # React Context (Auth, Theme, etc.)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Application routes (Feed, Communities, AdminPanel, etc.)
│   │   └── socket.js         # Socket.io client configuration
│   └── ...
├── backend/                  # Node.js Express API
│   ├── services/             # External service wrappers (Google Speech, OpenAI)
│   ├── uploads/              # Local storage for user media
│   ├── server.js             # Main application entry point
│   └── schema.txt            # Complete MySQL database schema
└── README.md                 # Project documentation
```
