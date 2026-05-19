export const PLATFORMS = {
  1: { id: 1, name: "StreamP2P", slug: "streamp2p", baseUrl: "https://streamp2p.com/api/v1", playerUrl: "https://roninxstream.strp2p.live" },
  2: { id: 2, name: "UpnShare", slug: "upnshare", baseUrl: "https://upnshare.com/api/v1", playerUrl: "https://roninxstream.upns.one" },
  3: { id: 3, name: "RPMShare", slug: "rpmshare", baseUrl: "https://rpmshare.com/api/v1", playerUrl: "https://roninxstream.rpmlive.online" },
  4: { id: 4, name: "SeekStreaming", slug: "seekstreaming", baseUrl: "https://seekstreaming.com/api/v1", playerUrl: "https://roninxstream.seekplayer.vip" },
};

export const getApiKeys = () => {
  try {
    const keys = localStorage.getItem("uploader_api_keys");
    if (keys) {
      return JSON.parse(keys);
    }
  } catch (error) {
    console.error("Failed to load API keys from localStorage", error);
  }

  // Fallback to Vite environment variables or hardcoded values
  return {
    streamp2p: import.meta.env.VITE_STREAM_P2P_KEY || "d701066f233b919e370275cd",
    upnshare: import.meta.env.VITE_UPNSHARE_KEY || "2258b7e8684e8bf0eefa9d32",
    rpmshare: import.meta.env.VITE_RPMSHARE_KEY || "fa2f8e6074fb55ede40aec86",
    seekstreaming: import.meta.env.VITE_SEEKSTREAMING_KEY || "e5549f6ef3493b639c5dd31b"
  };
};

export const saveApiKeys = (keys) => {
  try {
    localStorage.setItem("uploader_api_keys", JSON.stringify(keys));
    return true;
  } catch (error) {
    console.error("Failed to save API keys", error);
    return false;
  }
};

export const getPlatformConfig = (platformId) => {
  const keys = getApiKeys();
  const platform = PLATFORMS[platformId];
  if (!platform) return null;
  
  // Map slugs to API keys
  let apiKey = "";
  if (platform.slug === "streamp2p") apiKey = keys.streamp2p;
  else if (platform.slug === "upnshare") apiKey = keys.upnshare;
  else if (platform.slug === "rpmshare") apiKey = keys.rpmshare;
  else if (platform.slug === "seekstreaming") apiKey = keys.seekstreaming;

  return {
    ...platform,
    apiKey
  };
};

export const getCorsProxy = () => {
  const saved = localStorage.getItem("uploader_cors_proxy");
  if (saved) return saved;

  // Auto-detect production environment (Cloudflare Pages)
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return "/api/cors?url=";
  }

  // Fallback for local development
  return "https://corsproxy.io/?";
};

export const saveCorsProxy = (proxyUrl) => {
  localStorage.setItem("uploader_cors_proxy", proxyUrl);
};

