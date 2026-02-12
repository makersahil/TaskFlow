# TaskFlow Deployment Guide

## Prerequisites
- GitHub account
- Railway.app account (free $5/month credit)
- Vercel account (free tier)

## Step 1: Push to GitHub

1. Initialize git and push:
```bash
git init
git add .
git commit -m "Finished MVP of a project manager"
git branch -M main
git remote add origin https://github.com/makersahil/TaskFlow.git
git push -u origin main
```

## Step 2: Deploy Backend on Railway

1. Go to https://railway.app and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository: `makersahil/TaskFlow`
4. Railway will detect it's a Spring Boot app automatically

5. Configure Service:
   - Click on the service that was created
   - Go to "Settings"
   - **Root Directory**: `backend-app` ⚠️ **IMPORTANT: Set this first!**
   - Railway will use `backend-app/railway.json` for build configuration
   - Build/Start commands are defined in railway.json (no manual config needed)

6. Add PostgreSQL Database:
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway automatically creates database and sets `DATABASE_URL` environment variable

7. Set Additional Environment Variables:
   - Click your backend service → "Variables" tab
   - Add these variables:
     - `SPRING_PROFILES_ACTIVE` = `prod`
     - `JWT_SECRET` = (click "Generate" or paste a random 64-char string)
     - `CORS_ALLOWED_ORIGINS` = `https://taskflow-yourusername.vercel.app` (update after frontend deploy)
     - `PORT` = `9090`

8. Generate Domain:
   - Go to "Settings" → "Networking"
   - Click "Generate Domain"
   - Note your backend URL (e.g., `taskflow-backend-production.up.railway.app`)

9. Deploy:
   - Railway automatically deploys on first setup
   - Wait 3-5 minutes for build and deployment
   - Check "Deployments" tab for status

## Step 3: Deploy Frontend on Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click "Add New" → "Project"
3. Import `makersahil/TaskFlow`
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend` ⚠️ **IMPORTANT: Set this!**
   - **Install Command**: Leave empty (use default `npm install`)
   - **Build Command**: Leave empty (use default `npm run build`)
   - **Output Directory**: Leave empty (use default `.next`)

5. Add Environment Variable:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://your-backend-url.up.railway.app/api`
   - (Replace with your actual Railway backend URL from Step 2)

6. Click "Deploy"
7. Wait for deployment (2-3 minutes)
8. Your frontend URL: `https://taskflow-yourusername.vercel.app`

## Step 4: Update CORS Origins
ailway.app → your backend service → Variables
2. Update `CORS_ALLOWED_ORIGINS` to your actual Vercel URL (e.g., `https://taskflow-abc123.vercel.app`)
3. Railway will automatically redeploy with new variable URL: `https://taskflow-yourusername.vercel.app`
3. Click "Save Changes" (will trigger redeploy)

## Step 5: Test Your Deployment

1. Visit your Vercel frontend URL
2. Register a new account
3. Create a project and tasks
4. Test all features

## Auto-Deploy from GitHub

✅ **Railway**: Automatically deploys when you push to `main` branch
✅ **Vercel**: Automatically deploys when you push to `main` branch

To update your app:
```bash
git add .
git commit -m "Your update message"
git push
```

Both services will automatically detect changes and redeploy!

## Important URLs

- **Frontend**: https://taskflow-yourusername.vercel.app
- **Backend**: https://your-backend-url.up.railway.app
- **Backend Health**: https://your-backend-url.up.railway.app/api/health
- **Database**: Managed by Railway (internal)

## Free Tier Limitations

**Railway Free Tier:**
- $5 credit per month (resets monthly)
- ~500 hours runtime for hobby projects
- No sleep/downtime (always running)
- Includes PostgreSQL database
- After credit exhausted: $10/month minimum or service pauses

**Vercel Free Tier:**
- 100 GB bandwidth/month
- Unlimited deployments
- No sleep/cold starts

## Troubleshooting

**"cd: frontend: No such file or directory" on Vercel:**
- **Solution**: In Vercel project settings → "General" → set **Root Directory** to `frontend`
- Clear any custom Install/Build/Output commands - use Vercel's defaults
- Redeploy from Vercel dashboard

**"Script start.sh not found" or "Railpack could not determine how to build":**
- **Solution**: Make sure Root Directory is set to `backend-app` in Railway Settings
- Railway needs to see `railway.json` file which is in the backend-app directory
- After setting root directory, trigger a manual redeploy from the Deployments tab

**Backend deployment fails on Railway:**
- Check Railway logs: Click service → "Deployments" → Click latest deployment → View logs
- Verify DATABASE_URL is automatically set by Railway
- Ensure JWT_SECRET is set in variables
- Check Java version is 17+ in logs

**Frontend can't connect to backend:**
- Check CORS_ALLOWED_ORIGINS matches your Vercel URL exactly (no trailing slash)
- Verify NEXT_PUBLIC_API_BASE_URL in Vercel environment variables
- Test backend health endpoint: `https://your-backend-url.up.railway.app/api/health`
- Ensure Railway service has a public domain generated

**Database connection errors:**
- Railway automatically sets DATABASE_URL - don't override it
- Verify PostgreSQL service is running in Railway dashboard
- Check both services are in the same Railway project
- Check DATABASE_URL format: `jdbc:postgresql://host:port/database`
**To stay within $5 free credit:**
- Railway includes PostgreSQL in the $5 credit
- Monitor usage in Railway dashboard
- Typical small project uses ~$3-4/month
- If you exceed: add payment method for $10/month minimum

**Alternative if Railway credit runs out:**
- Move database to Supabase (permanent free tier)
- Keep backend on Railway (uses less credit without DB
To avoid PostgreSQL expiry:
- Use Supabase free tier instead (permanent free tier)
- Or accept 90-day renewals on Render
- Or upgrade to Render paid tier ($7/month)

## Security Notes

- Never commit `.env` files with secrets
- Rotate JWT_SECRET periodically
- Use strong database passwords
- Enable HTTPS only (both services provide this by default)
