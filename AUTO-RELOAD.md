# HFT Frontend Auto-Reload Setup 🔄

## ✅ Live Hot Reloading Enabled!

Your HFT frontend is now configured for **automatic updates** without manual rebuilds!

## How It Works

### 1. Volume Mounting (Active Now)
The following directories are **live-mounted** from your host to the container:
- `./frontend/app` → `/app/app`
- `./frontend/components` → `/app/components`
- `./frontend/lib` → `/app/lib`
- `./frontend/public` → `/app/public`

**This means:**
- ✅ Edit any file in these directories
- ✅ Next.js Hot Module Replacement (HMR) automatically detects changes
- ✅ Browser updates in ~1-2 seconds
- ✅ No manual rebuild needed!

### 2. Optional File Watcher Script

For additional automation, you can run the watcher script in a separate terminal:

```bash
cd /home/pbieda/scripts/hft
./watch-and-reload.sh
```

This script will:
- 👀 Watch for file changes
- 🗑️ Clear Next.js cache on changes
- 🔄 Auto-restart the container
- 📢 Show notifications when changes are detected

## Testing the Auto-Reload

1. **Edit a file:**
   ```bash
   nano /home/pbieda/scripts/hft/frontend/components/OpenOrdersTable.tsx
   ```

2. **Make a small change** (e.g., change "Open Orders" to "My Open Orders")

3. **Save the file**

4. **Check your browser** at http://178.128.15.57:3003/trading
   - Changes should appear automatically in 1-2 seconds!
   - Look for the Next.js HMR notification in browser console

## Current Status

✅ **Volume mounting:** ACTIVE  
✅ **Next.js dev mode:** ACTIVE (with HMR)  
✅ **Auto-rebuild on save:** ACTIVE  

## Troubleshooting

If changes don't appear:

1. **Check HMR status:**
   - Open browser DevTools (F12)
   - Look for `[HMR] connected` in console
   - Should see `[Fast Refresh] rebuilding` when you save

2. **Hard refresh browser:**
   - `Ctrl + Shift + R` (Windows/Linux)
   - `Cmd + Shift + R` (Mac)

3. **Clear Next.js cache manually:**
   ```bash
   docker exec hft-frontend rm -rf /app/.next
   docker-compose restart hft-frontend
   ```

4. **Check container logs:**
   ```bash
   docker logs -f hft-frontend
   ```

## Access Points

- **Direct IP (fastest):** http://178.128.15.57:3003
- **Domain (CDN cached):** https://hft.widesurf.com

**Note:** Use the direct IP for development to avoid CDN caching issues!

---

**Last Updated:** Oct 25, 2025  
**HFT Trading System v2.0**

