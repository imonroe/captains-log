# Captain's Log

A Star Trek-inspired web application for recording, transcribing, and managing audio logs.

## Features

- 🎙️ One-tap audio recording
- 📝 Audio transcription (placeholder in current version)
- 🔍 Search through logs
- 🖖 LCARS-inspired Star Trek interface
- 📱 Responsive design for all devices
- ⭐ PWA support for offline use
- 🔐 User authentication system
- 🐳 Docker containerization for easy deployment

## Setup and Usage

### Development
1. Clone the repository
2. Install dependencies:
   ```
   yarn
   ```
3. Set up the SQLite database:
   ```
   yarn setup-db
   ```
4. Start the development server:
   ```
   yarn start
   ```
5. The app will open in your default browser at `http://localhost:8080`

### Building for Production
1. Generate a production build:
   ```
   yarn build
   ```
2. The optimized build will be created in the `dist` directory
3. Start the Express server:
   ```
   yarn start
   ```
4. The application will be available at `http://localhost:3000`

### Docker Deployment
1. Build and start the containerized application using Docker Compose:
   ```
   docker-compose up -d
   ```
2. The application will be available at `http://localhost:3000`
3. The PostgreSQL database will be available at `localhost:5432`
4. The pgAdmin interface will be available at `http://localhost:5050`
   - Email: admin@captainslog.com
   - Password: admin

### Default Admin User
The application comes with a default admin user:
- Email: captain@starfleet.com
- Password: enterprise

*Note: In a production environment, you should change these credentials and secrets in the .env file*

### Using the App
1. Click "RECORD" to start recording your log
2. Allow microphone permissions when prompted
3. Click "STOP" when finished recording
4. Browse your logs in the "LOGS" section

## Future Enhancements

- Integration with OpenAI Whisper API for real transcription
- Multi-device synchronization
- Advanced search capabilities with vector embeddings
- Customizable themes and settings

## Technical Details

The application is built with:
- HTML5, SCSS, and JavaScript (ES6+)
- Webpack for module bundling and asset optimization
- Web Audio API for audio recording
- PostgreSQL database for data persistence
- Express.js for backend API
- JWT-based authentication
- Bcrypt for password hashing
- Docker and Docker Compose for containerization
- Knex.js for SQL query building and migrations
- LocalStorage for client-side caching
- Workbox for PWA and service worker generation
- SASS for modular styling
- Babel for JavaScript transpilation

## License

This project is open source and available under the MIT License.

---

*"Captain's log, stardate [current stardate]..."*