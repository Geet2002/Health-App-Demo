# CareCommunityWebApp

CareCommunityWebApp is a comprehensive, full-stack platform designed to connect individuals in need of healthcare support, blood donations, and community resources. It empowers users to create and join communities, share health experiences, ask questions, and handle medical emergencies effectively.

## 🌟 Key Features

- **User Profiles & Authentication**: Secure registration and login, including Google OAuth integration. Features medical professional verification for trusted advice.
- **Blood Donation Network**: 
  - Create urgent blood requests with location tracking.
  - Browse and offer to fulfill blood requests.
  - Coordinate through comments and direct offers.
- **Interactive Communities**:
  - Join or create public and private communities.
  - Share resources, media, and files within communities.
  - Organize and attend community events with interactive map locations.
- **Real-time Discussions & Emergency Posts**: 
  - Post queries or emergency alerts.
  - Upvote/downvote system for comments and posts.
  - Real-time updates and notifications using Socket.io.
- **Health Shares**: Share your health journey, tips, and experiences through text, images, video, and audio.
- **AI & Accessibility**: Features integration with OpenAI and Google Cloud Speech for enhanced user interactions and accessibility.

## 🛠️ Technology Stack

**Frontend**
- **React 19 & Vite**: Fast, modern frontend framework.
- **Tailwind CSS & Framer Motion**: Beautiful, responsive, and animated UI design.
- **React Router**: Seamless client-side navigation.
- **MapLibre GL & React Leaflet**: Interactive maps for locating events and blood requests.
- **Socket.io-client**: Real-time bidirectional communication.

**Backend**
- **Node.js & Express**: Robust and scalable server environment.
- **MySQL**: Relational database for structured data storage (Users, Communities, Posts, etc.).
- **Socket.io**: Real-time event broadcasting and notification system.
- **Authentication**: JWT (JSON Web Tokens) and Google Auth Library.
- **Media Processing**: Multer for handling uploads and Sharp for image optimization.
- **Integrations**: OpenAI API and Google Cloud Speech API.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- MySQL Server

### 1. Database Setup
1. Create a MySQL database for the application.
2. The database schema can be found in `backend/schema.txt`. You can use it to initialize your tables.

### 2. Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` directory and add the necessary environment variables (e.g., database credentials, JWT secret, API keys).
4. Start the backend development server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend` directory for any required frontend environment variables.
4. Start the frontend development server:
   ```bash
   npm run dev
   ```

## 📂 Project Structure

- `/frontend` - Contains the React application and UI components.
- `/backend` - Contains the Express server, database connection, and API routes.
- `/backend/uploads` - Directory for user-uploaded media files.
- `/backend/services` - Specialized backend services (e.g., AI, Speech).
