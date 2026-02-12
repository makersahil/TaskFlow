# TaskFlow Deployment Guide

## Prerequisites
- GitHub account
- Render.com account (free tier)
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

## Step 2: Deploy Backend on Render

1. Go to https://render.com and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `makersahil/TaskFlow`
4. Configure:
   - **Name**: `taskflow-backend`
   - **Root Directory**: `backend-app`
   - **Runtime**: `Java`
   - **Build Command**: `./mvnw clean package -DskipTests`
   - **Start Command**: `java -jar target/taskflow-backend-0.0.1-SNAPSHOT.jar`
   - **Plan**: Free

5. Add PostgreSQL Database:
   - Click "New +" → "PostgreSQL"
   - **Name**: `taskflow-db`
   - **Database**: `taskflow`
   - **User**: `taskflow_user`
   - **Plan**: Free (expires after 90 days, but easy to renew)

6. Set Environment Variables in Render:
   - `SPRING_PROFILES_ACTIVE` = `prod`
   - `DATABASE_URL` = (copy from PostgreSQL → Internal Database URL)
   - `JWT_SECRET` = (generate random 64-char string from https://generate-secret.vercel.app/)
   - `CORS_ALLOWED_ORIGINS` = `https://taskflow-yourusername.vercel.app` (will update after frontend deploy)
   - `PORT` = `9090`

7. Click "Create Web Service"
8. Wait for deployment (5-10 minutes)
9. Note your backend URL: `https://taskflow-backend.onrender.com`

## Step 3: Deploy Frontend on Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click "Add New" → "Project"
3. Import `makersahil/TaskFlow`
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

5. Add Environment Variable:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://taskflow-backend.onrender.com/api`

6. Click "Deploy"
7. Wait for deployment (2-3 minutes)
8. Your frontend URL: `https://taskflow-yourusername.vercel.app`

## Step 4: Update CORS Origins

1. Go back to Render.com → `taskflow-backend` → Environment
2. Update `CORS_ALLOWED_ORIGINS` to your Vercel URL: `https://taskflow-yourusername.vercel.app`
3. Click "Save Changes" (will trigger redeploy)

## Step 5: Test Your Deployment

1. Visit your Vercel frontend URL
2. Register a new account
3. Create a project and tasks
4. Test all features

## Auto-Deploy from GitHub

✅ **Render**: Automatically deploys when you push to `main` branch
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
- **Backend**: https://taskflow-backend.onrender.com
- **Backend Health**: https://taskflow-backend.onrender.com/api/health
- **Database**: Managed by Render (internal)

## Free Tier Limitations

**Render Free Tier:**
- Backend sleeps after 15 minutes of inactivity (first request takes ~30s to wake)
- 750 hours/month
- PostgreSQL free for 90 days (then $7/month or renew free tier)

**Vercel Free Tier:**
- 100 GB bandwidth/month
- Unlimited deployments
- No sleep/cold starts

## Troubleshooting

**Backend won't start:**
- Check Render logs for errors
- Verify DATABASE_URL is set correctly
- Ensure JWT_SECRET is at least 32 characters

**Frontend can't connect to backend:**
- Check CORS_ALLOWED_ORIGINS matches your Vercel URL exactly
- Verify NEXT_PUBLIC_API_BASE_URL in Vercel environment variables
- Check backend health endpoint works

**Database connection errors:**
- Verify PostgreSQL is running in Render
- Check DATABASE_URL format: `jdbc:postgresql://host:port/database`
- Ensure backend and database are in same Render region

## Cost Optimization

To avoid PostgreSQL expiry:
- Use Supabase free tier instead (permanent free tier)
- Or accept 90-day renewals on Render
- Or upgrade to Render paid tier ($7/month)

## Security Notes

- Never commit `.env` files with secrets
- Rotate JWT_SECRET periodically
- Use strong database passwords
- Enable HTTPS only (both services provide this by default)
