# ChatMiyo 💬

A modern, feature-rich chat application built with Supabase and vanilla JavaScript. Experience seamless real-time communication with friends and groups.

## ✨ Features

### 🔐 Authentication & User Management
- **Google OAuth Integration** - Secure sign-in with Google accounts
- **User Profiles** - Custom usernames, avatars, and status indicators
- **Online Status** - Real-time presence indicators (Online, Away, Busy, Offline)

### 👥 Friends System
- **Friend Requests** - Send, accept, or reject friend requests
- **Friends List** - Manage your connections with status indicators
- **Search Friends** - Find and add new friends easily
- **Friend Status** - See when friends were last active

### 💬 Messaging
- **Direct Messages** - Private conversations between friends
- **Group Chats** - Create and manage group conversations
- **Real-time Updates** - Instant message delivery and notifications
- **Message Types** - Text messages, file attachments, and system messages
- **Message History** - Persistent chat history with pagination

### 🏢 Group Management
- **Create Groups** - Start group chats with multiple members
- **Member Management** - Add/remove members, assign roles (Owner, Admin, Member)
- **Group Invitations** - Invite friends to join your groups
- **Group Settings** - Customize group names and permissions

### 📱 Modern UI/UX
- **Dark Theme** - Beautiful dark mode interface
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Smooth Animations** - Polished interactions and transitions
- **Modern Components** - Clean, intuitive interface design
- **Notifications** - Toast notifications for important events
- **Modals** - Clean modal dialogs for complex interactions

### 🔧 Technical Features
- **Real-time Sync** - Powered by Supabase real-time subscriptions
- **File Uploads** - Share images, documents, and other files
- **Security** - Row Level Security (RLS) for data protection
- **Scalable Architecture** - Built on Supabase's robust infrastructure

## 🚀 Quick Start

### Prerequisites
- Node.js (for local development)
- Supabase account
- Netlify account (for deployment)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/miyo-chat.git
   cd miyo-chat
   ```

2. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL scripts in the `sql/` directory:
     ```sql
     -- Run schema.sql first
     -- Then run rls.sql for security policies
     ```

3. **Configure Environment Variables**
   - Set up your Supabase URL and anon key in Netlify environment variables:
     - `SUPABASE_URL`
     - `SUPABASE_ANON`

4. **Deploy to Netlify**
   - Connect your repository to Netlify
   - Deploy with default settings
   - Configure environment variables in Netlify dashboard

### Local Development

1. **Install dependencies** (if using a build process)
   ```bash
   npm install
   ```

2. **Start local server**
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

## 📁 Project Structure

```
miyo-chat/
├── index.html          # Main HTML file
├── app.js             # JavaScript application logic
├── style.css          # Modern CSS styles
├── sql/
│   ├── schema.sql     # Database schema
│   └── rls.sql       # Row Level Security policies
├── netlify/
│   └── functions/
│       └── env.js     # Environment variables endpoint
├── netlify.toml       # Netlify configuration
└── README.md          # This file
```

## 🗄️ Database Schema

### Core Tables
- **users** - User profiles and authentication data
- **friend_requests** - Friend request management
- **friendships** - Friend relationships
- **rooms** - Chat rooms (DM and group)
- **room_members** - Room membership with roles
- **messages** - Chat messages with metadata
- **user_room_settings** - Per-room user preferences
- **user_preferences** - Global user settings

### Key Features
- **Row Level Security** - Ensures users can only access their own data
- **Real-time Functions** - Optimized queries for real-time updates
- **Referential Integrity** - Proper foreign key relationships
- **Audit Trails** - Created/updated timestamps on all records

## 🎨 UI Components

### Login Page
- Modern gradient background with grid pattern
- Feature highlights
- Google OAuth integration
- Responsive design

### Main Interface
- **Left Sidebar** - Profile, controls, chats, and friends
- **Right Panel** - Active chat with message history
- **Header** - Branding and user menu
- **Modals** - Group creation, member management, settings

### Design System
- **Color Palette** - Dark theme with accent colors
- **Typography** - Inter font family
- **Spacing** - Consistent spacing scale
- **Animations** - Smooth transitions and hover effects
- **Icons** - Font Awesome icon set

## 🔒 Security

- **Authentication** - Google OAuth with Supabase Auth
- **Authorization** - Row Level Security policies
- **Data Validation** - Input sanitization and validation
- **HTTPS** - Secure connections in production
- **CORS** - Proper cross-origin resource sharing

## 🚀 Deployment

### Netlify (Recommended)
1. Connect your GitHub repository
2. Set build command: `echo "Static site"`
3. Set publish directory: `.`
4. Add environment variables
5. Deploy!

### Other Platforms
- **Vercel** - Similar to Netlify
- **GitHub Pages** - For static hosting
- **Firebase Hosting** - Google's hosting platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Supabase** - Backend-as-a-Service platform
- **Netlify** - Hosting and deployment
- **Font Awesome** - Icon library
- **Google Fonts** - Typography

## 📞 Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check the documentation
- Review the code comments

---

**Built with ❤️ using modern web technologies**
