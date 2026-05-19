# Ronin X Stream Uploader 🚀

A premium, serverless dashboard designed to upload and manage videos directly to multiple video hosting platforms (StreamP2P, UpnShare, RPMShare, and SeekStreaming) directly from your browser. 

Featuring a modern dark-themed glassmorphism interface, unified video searching, multi-host parallel uploading, and built-in database-less password protection.

---

## ✨ Features

- **🔒 DB-Less Secure Login**: Secure password protection using client-side environment configuration. No database setup required.
- **⚡ Parallel Multi-Platform Upload**: Enter a direct video URL and upload it in parallel to all selected platforms.
- **🔍 Unified Search**: Search for uploaded videos across all active platforms simultaneously.
- **📁 Integrated Video Manager**: View, filter, watch, rename, or permanently delete videos across different hosts.
- **🔗 Quick Link Copier**: Instant copy-to-clipboard buttons for Watch URLs and direct Download links.
- **🌐 Client-Side Settings**: Save custom platform API keys and configure custom CORS Proxies securely in your local browser storage.

---

## 🛠️ Environment Variables Configuration

The app loads credentials and fallback API tokens from the `.env` file. Copy `.env` to create your own configuration:

```env
# Admin Credentials for Password Protection
VITE_ADMIN_USERNAME=admin
VITE_ADMIN_PASSWORD=admin

# Platform API Fallback Keys
VITE_STREAM_P2P_KEY=your_streamp2p_api_key
VITE_UPNSHARE_KEY=your_upnshare_api_key
VITE_RPMSHARE_KEY=your_rpmshare_api_key
VITE_SEEKSTREAMING_KEY=your_seekstreaming_api_key
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173` (or the port specified by Vite). Log in with the configured `VITE_ADMIN_USERNAME` and `VITE_ADMIN_PASSWORD` (default: `admin` / `admin`).

### 3. Build for Production
```bash
npm run build
```
This generates optimized static files inside the `dist/` directory, ready to be hosted on any static provider.

---

## ☁️ Deployment (Cloudflare Pages)

Because this is a serverless static application, it can be hosted for free on **Cloudflare Pages** in minutes.

1. Create a **Private** repository on GitHub and push this code.
2. In the Cloudflare Dashboard, go to **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
3. Choose the repository, select **Vite** as the framework preset, and verify:
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
4. Under **Environment variables (advanced)**, configure your secure credentials:
   - `VITE_ADMIN_USERNAME` -> *your_private_username*
   - `VITE_ADMIN_PASSWORD` -> *your_private_password*
5. Click **Save and Deploy**.

> [!IMPORTANT]
> Since environment variables are injected at build time in Vite, any changes to environment variables in the Cloudflare dashboard will require triggering a new deployment for them to take effect.
