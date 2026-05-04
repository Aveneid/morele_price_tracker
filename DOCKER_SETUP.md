# Docker Setup Guide - Morele Price Tracker

This guide explains how to build and run the Morele Price Tracker application using Docker.

## Prerequisites

- **Docker**: [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose**: [Install Docker Compose](https://docs.docker.com/compose/install/)
- **Git**: For cloning the repository

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd morele_price_tracker
```

### 2. Create Environment File

Create a `.env` file in the project root with the required environment variables:

```bash
# Database Configuration
DB_ROOT_PASSWORD=rootpassword
DB_NAME=morele_tracker
DB_USER=tracker
DB_PASSWORD=trackerpass
DB_PORT=3306

# Application Configuration
NODE_ENV=production
APP_PORT=3000

# JWT Secret (change this in production!)
JWT_SECRET=your-jwt-secret-key-change-in-production

# OAuth Configuration (if using Manus OAuth)
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# Owner Information
OWNER_NAME=Your Name
OWNER_OPEN_ID=your-open-id

# Manus Built-in APIs (if applicable)
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-api-key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your-frontend-api-key

# Application Metadata
VITE_APP_TITLE=Morele Price Tracker
VITE_APP_LOGO=https://your-logo-url.png

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=your-website-id

# HMR Configuration (for development)
VITE_HMR_HOST=localhost

# Email Configuration (SMTP Settings for Price Alerts)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=noreply@moreletracker.com
MAIL_USE_TLS=true
```

### 3. Build and Run with Docker Compose

```bash
# Build the Docker image
docker-compose build

# Start the services (database + application)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop the services
docker-compose down
```

The application will be available at `http://localhost:3000`

## Email Configuration

The application supports SMTP-based email notifications for price alerts. Configure your email server in the `.env` file:

### Gmail Configuration

```bash
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=your_app_password  # Use App Password, not your regular password
MAIL_FROM=noreply@moreletracker.com
MAIL_USE_TLS=true
```

**Note**: For Gmail, you need to:
1. Enable 2-Factor Authentication
2. Generate an [App Password](https://support.google.com/accounts/answer/185833)
3. Use the App Password in `MAIL_PASSWORD`

### Generic SMTP Server

```bash
MAIL_HOST=smtp.your-server.com
MAIL_PORT=587
MAIL_USER=your_username
MAIL_PASSWORD=your_password
MAIL_FROM=noreply@moreletracker.com
MAIL_USE_TLS=true
```

### Email Features

- **Price Drop Alerts**: Sends HTML-formatted emails when product prices drop
- **Rich Templates**: Professional email formatting with product details
- **Configurable Sender**: Set custom sender email address

## Docker Architecture

### Multi-Stage Build

The Dockerfile uses a multi-stage build process for optimal image size:

1. **Builder Stage**: Installs dependencies and builds the application
2. **Runtime Stage**: Contains only production dependencies and built artifacts

### Services

The `docker-compose.yml` includes:

- **MySQL Database** (`db`): Stores products, price history, and admin credentials
- **Application** (`app`): Node.js server running the price tracker

## Database Setup

### Initial Database Migration

After starting the containers, run database migrations:

```bash
# Access the app container
docker-compose exec app sh

# Run migrations
pnpm db:push

# Exit the container
exit
```

### Creating Admin User

To create an admin account, access the database:

```bash
# Access MySQL container
docker-compose exec db mysql -u tracker -p morele_tracker

# In MySQL shell, insert admin credentials (password hashed with SHA1):
INSERT INTO adminUsers (username, passwordHash) 
VALUES ('admin', SHA1('your_password_here'));

# Exit MySQL
exit
```

## Production Deployment

### Environment Variables

For production, update the `.env` file with:

- Strong `JWT_SECRET` (use a secure random string)
- Production database credentials
- Valid OAuth configuration
- Proper API keys and URLs

### Building for Production

```bash
# Build the image with a tag
docker build -t morele-price-tracker:latest .

# Or with docker-compose
docker-compose -f docker-compose.yml build --no-cache
```

### Running in Production

```bash
# Using docker-compose
docker-compose -f docker-compose.yml up -d

# Or using Docker directly
docker run -d \
  --name morele-tracker \
  -p 3000:3000 \
  --env-file .env \
  morele-price-tracker:latest
```

### Health Checks

The container includes a built-in health check that runs every 30 seconds:

```bash
# Check container health
docker ps

# View health status
docker inspect morele-tracker-app --format='{{.State.Health.Status}}'
```

## Volumes and Persistence

### Database Volume

The `db_data` volume persists MySQL data:

```bash
# View volumes
docker volume ls | grep morele

# Backup database volume
docker run --rm -v morele_price_tracker_db_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/db_backup.tar.gz -C /data .

# Restore database volume
docker run --rm -v morele_price_tracker_db_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/db_backup.tar.gz -C /data
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs app

# Verify database connection
docker-compose exec app node -e "require('mysql2').createConnection({host:'db',user:'tracker',password:'trackerpass',database:'morele_tracker'}).connect()"
```

### Database Connection Issues

```bash
# Test MySQL connectivity
docker-compose exec db mysql -u tracker -p trackerpass -e "SELECT 1"

# Check database URL in app logs
docker-compose logs app | grep DATABASE_URL
```

### Port Already in Use

```bash
# Change port in .env
APP_PORT=3001
DB_PORT=3307

# Or kill existing process
lsof -ti:3000 | xargs kill -9
```

## Development with Docker

### Running Development Server

```bash
# Start containers
docker-compose up -d

# Access app container
docker-compose exec app sh

# Run development server
pnpm dev

# Exit container
exit
```

### Rebuilding After Code Changes

```bash
# Rebuild the image
docker-compose build --no-cache

# Restart services
docker-compose restart app
```

### Viewing Real-time Logs

```bash
# Follow application logs
docker-compose logs -f app

# Follow all services
docker-compose logs -f

# Follow specific number of lines
docker-compose logs -f --tail=50 app
```

## Networking

The application uses a custom bridge network (`morele-network`) for service communication:

- **Database**: Accessible at `db:3306` from the app container
- **Application**: Accessible at `localhost:3000` from the host

## Security Considerations

1. **Change Default Passwords**: Update all default passwords in `.env`
2. **Use Strong JWT Secret**: Generate a strong random string for `JWT_SECRET`
3. **Database Credentials**: Use strong, unique credentials for database access
4. **Environment Variables**: Never commit `.env` files to version control
5. **Non-root User**: The container runs as a non-root user (`nodejs`) for security
6. **Health Checks**: Built-in health checks monitor container status

## Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes data!)
docker-compose down -v

# Remove images
docker rmi morele-price-tracker:latest

# Remove all unused Docker resources
docker system prune -a
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MySQL Docker Image](https://hub.docker.com/_/mysql)
- [Node.js Docker Image](https://hub.docker.com/_/node)

## Support

For issues or questions about Docker setup, please check:

1. Docker logs: `docker-compose logs app`
2. Database connectivity: `docker-compose exec db mysql -u tracker -p`
3. Environment variables: Verify `.env` file is properly configured


## Email Troubleshooting

### Email Service Not Initialized

If you see a warning about email configuration being incomplete:

```
[Email Service] Email configuration incomplete, email notifications disabled
```

**Solution**: Verify all email environment variables are set in `.env`:
- `MAIL_HOST` - SMTP server hostname
- `MAIL_PORT` - SMTP server port
- `MAIL_USER` - SMTP username
- `MAIL_PASSWORD` - SMTP password

### Authentication Failed

If you see authentication errors in logs:

```
[Email Service] Failed to initialize: Invalid login
```

**Solutions**:
1. Verify credentials are correct
2. For Gmail, use App Password instead of regular password
3. Check if SMTP server requires different port (465 for SSL, 587 for TLS)
4. Ensure firewall allows outbound SMTP connections

### Email Not Sending

If emails are not being sent:

1. Check application logs for errors:
   ```bash
   docker-compose logs app | grep "Email Service"
   ```

2. Verify email configuration:
   ```bash
   docker-compose exec app env | grep MAIL_
   ```

3. Test SMTP connection from container:
   ```bash
   docker-compose exec app node -e "
   const nodemailer = require('nodemailer');
   const transporter = nodemailer.createTransport({
     host: process.env.MAIL_HOST,
     port: process.env.MAIL_PORT,
     secure: process.env.MAIL_USE_TLS === 'true' ? false : true,
     auth: {
       user: process.env.MAIL_USER,
       pass: process.env.MAIL_PASSWORD
     }
   });
   transporter.verify((err, success) => {
     if (err) console.log('Error:', err);
     else console.log('SMTP connection successful');
   });
   "
   ```

### Testing Email Configuration

To test if emails are being sent correctly:

1. Trigger a price drop alert in the application
2. Check application logs for email sending status
3. Verify email was received in the recipient's inbox
4. Check spam/junk folder if email is not in inbox

## Email Service Features

The email service includes:

- **Automatic Initialization**: Initializes on first use
- **Error Handling**: Graceful handling of SMTP errors
- **HTML Templates**: Professional email formatting
- **Logging**: Detailed logging of email operations
- **Configuration Validation**: Validates email settings on startup

## Production Email Setup

For production deployment:

1. **Use a professional email service**:
   - SendGrid
   - AWS SES
   - Mailgun
   - Your own SMTP server

2. **Configure SPF and DKIM records** for your domain

3. **Use environment variables** for sensitive credentials

4. **Monitor email delivery** and bounce rates

5. **Set up email templates** for different notification types

6. **Test email configuration** before going live
