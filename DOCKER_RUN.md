# Docker Build & Run Guide

## Build the Image

```bash
docker build -t morele-tracker:latest .
```

This creates a production-ready Docker image with:
- Node.js 22 Alpine (minimal size)
- All dependencies installed
- Application built and optimized
- Non-root user for security
- Health checks enabled

## Run the Container

### Basic Run (with all required environment variables)

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="mysql://user:password@mysql-host:3306/morele_db" \
  -e MAIL_HOST="smtp.gmail.com" \
  -e MAIL_PORT="587" \
  -e MAIL_USER="your-email@gmail.com" \
  -e MAIL_PASSWORD="your-app-password" \
  -e MAIL_FROM="noreply@yoursite.com" \
  -e JWT_SECRET="your-secret-key-here" \
  -e VITE_APP_ID="your-app-id" \
  -e OAUTH_SERVER_URL="https://api.manus.im" \
  -e VITE_OAUTH_PORTAL_URL="https://portal.manus.im" \
  morele-tracker:latest
```

### Run with Local MySQL (using Docker network)

```bash
# Create a Docker network
docker network create morele-network

# Run MySQL container
docker run -d \
  --name morele-mysql \
  --network morele-network \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=morele_db \
  -e MYSQL_USER=morele_user \
  -e MYSQL_PASSWORD=morele_pass \
  -p 3306:3306 \
  mysql:8.0

# Run the application
docker run -p 3000:3000 \
  --network morele-network \
  -e DATABASE_URL="mysql://morele_user:morele_pass@morele-mysql:3306/morele_db" \
  -e MAIL_HOST="smtp.gmail.com" \
  -e MAIL_PORT="587" \
  -e MAIL_USER="your-email@gmail.com" \
  -e MAIL_PASSWORD="your-app-password" \
  -e MAIL_FROM="noreply@yoursite.com" \
  -e JWT_SECRET="your-secret-key-here" \
  -e VITE_APP_ID="your-app-id" \
  -e OAUTH_SERVER_URL="https://api.manus.im" \
  -e VITE_OAUTH_PORTAL_URL="https://portal.manus.im" \
  morele-tracker:latest
```

### Run with Environment File

Create a `.env.docker` file:

```env
DATABASE_URL=mysql://user:password@mysql-host:3306/morele_db
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@yoursite.com
JWT_SECRET=your-secret-key-here
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
```

Then run:

```bash
docker run -p 3000:3000 \
  --env-file .env.docker \
  morele-tracker:latest
```

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/db` |
| `MAIL_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `MAIL_PORT` | SMTP port | `587` |
| `MAIL_USER` | Email account username | `your-email@gmail.com` |
| `MAIL_PASSWORD` | Email account password or app password | `your-app-password` |
| `MAIL_FROM` | Sender email address | `noreply@yoursite.com` |
| `JWT_SECRET` | Session signing secret | `any-random-string` |
| `VITE_APP_ID` | Manus OAuth app ID | `your-app-id` |
| `OAUTH_SERVER_URL` | Manus OAuth server | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal | `https://portal.manus.im` |

## Verify Container is Running

```bash
# Check container status
docker ps

# View logs
docker logs <container-id>

# Test health
curl http://localhost:3000
```

## Stop and Remove Container

```bash
# Stop container
docker stop <container-id>

# Remove container
docker rm <container-id>

# Remove image
docker rmi morele-tracker:latest
```

## Gmail SMTP Configuration

If using Gmail:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the generated password as `MAIL_PASSWORD`
4. Set `MAIL_HOST=smtp.gmail.com` and `MAIL_PORT=587`

## Database Setup

The application uses Drizzle ORM with MySQL. On first run, the database schema will be created automatically if it doesn't exist.

To manually run migrations:

```bash
docker run --rm \
  --network morele-network \
  -e DATABASE_URL="mysql://user:pass@mysql-host:3306/db" \
  morele-tracker:latest \
  npx drizzle-kit migrate
```

## Troubleshooting

### Container exits immediately
- Check logs: `docker logs <container-id>`
- Verify all required environment variables are set
- Ensure DATABASE_URL is correct and MySQL is accessible

### Cannot connect to MySQL
- Verify MySQL container is running: `docker ps`
- Check network connectivity: `docker network inspect morele-network`
- Test connection: `docker exec <app-container> mysql -h mysql-host -u user -p`

### Email not sending
- Verify MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD are correct
- Check Gmail app password if using Gmail
- View application logs for SMTP errors

### Port already in use
- Use a different port: `docker run -p 8080:3000 ...`
- Or stop the existing container: `docker stop <container-id>`
