# 🚀 Railway Deployment Guide

This guide will help you deploy your YNAB automation project to Railway with full Playwright support.

## 📋 Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Environment Variables**: You'll need your credit card and YNAB credentials

## 🚀 Deployment Steps

### 1. Connect GitHub to Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `ynab` repository
5. Railway will automatically detect the Dockerfile

### 2. Set Environment Variables

In your Railway project dashboard:

1. Go to **Variables** tab
2. Add the following environment variables:

```
CREDIT_CARD_USERNAME=your_username
CREDIT_CARD_PASSWORD=your_password
YNAB_ACCESS_TOKEN=your_access_token
BUDGET_ID=your_budget_id
BARAK_CARD=your_barak_account_id
ADI_CARD=your_adi_account_id
```

### 3. Deploy

Railway will automatically:
- Build the Docker container
- Install Playwright and browsers
- Start your application
- Provide a public URL

## 📱 Access Your Application

Once deployed, you'll get a Railway URL like: `https://your-app-name.railway.app`

### Available Endpoints:

- **Dashboard**: `https://your-app-name.railway.app/dashboard`
- **Run Script**: `https://your-app-name.railway.app/run-script`
- **Status**: `https://your-app-name.railway.app/status`
- **Logs**: `https://your-app-name.railway.app/logs`
- **Health Check**: `https://your-app-name.railway.app/health`

## ⏰ Scheduling Options

### Option 1: GitHub Actions (Recommended)

1. Go to your GitHub repository
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Add the same environment variables as secrets:
   - `CREDIT_CARD_USERNAME`
   - `CREDIT_CARD_PASSWORD`
   - `YNAB_ACCESS_TOKEN`
   - `BUDGET_ID`
   - `BARAK_CARD`
   - `ADI_CARD`

4. The workflow will run daily at 8 AM UTC
5. You can also trigger it manually from the **Actions** tab

### Option 2: Railway Cron (Alternative)

Railway supports cron jobs, but GitHub Actions is more reliable for this use case.

## 📱 iPhone Usage

1. **Bookmark the dashboard**: `https://your-app-name.railway.app/dashboard`
2. **Add to Home Screen**:
   - Open the dashboard in Safari
   - Tap the Share button
   - Select "Add to Home Screen"
3. **Run manually** anytime from your iPhone
4. **Check status and logs** from anywhere

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Test the full script
npm start
```

## 📊 Monitoring

### Railway Dashboard
- View logs in real-time
- Monitor resource usage
- Check deployment status

### Application Dashboard
- Real-time status updates
- Recent logs
- Manual trigger button
- Mobile-friendly interface

## 🚨 Troubleshooting

### Common Issues:

1. **Playwright not working**:
   - Ensure Dockerfile includes all browser dependencies
   - Check that browsers are installed in the container

2. **Environment variables not set**:
   - Verify all required variables are set in Railway
   - Check variable names match exactly

3. **Script fails**:
   - Check logs in Railway dashboard
   - Verify credit card credentials are correct
   - Ensure YNAB API token is valid

4. **Scheduled runs not working**:
   - Check GitHub Actions secrets are set
   - Verify workflow file is in `.github/workflows/`
   - Check GitHub Actions tab for errors

### Getting Help:

1. Check Railway logs: `railway logs`
2. Check application logs: `/logs` endpoint
3. Check GitHub Actions logs in the Actions tab

## 💰 Cost

- **Railway Free Tier**: $5 credit monthly (usually enough for small apps)
- **GitHub Actions**: Free for public repositories
- **Total Cost**: Essentially free for your use case

## 🔄 Updates

To update your deployment:

1. Push changes to your GitHub repository
2. Railway will automatically redeploy
3. No manual intervention needed

## 📈 Scaling

If you need more resources:
- Railway Pro: $20/month for more resources
- Custom domains available
- Database options for persistent storage

---

## 🎉 You're All Set!

Your YNAB automation is now running in the cloud with:
- ✅ Daily scheduled runs
- ✅ iPhone dashboard access
- ✅ Real-time logging
- ✅ Manual trigger capability
- ✅ Full Playwright support
- ✅ Free hosting (within limits)

Enjoy your automated expense tracking! 🚀
