import axios from "axios";
import { getPlatformConfig, getCorsProxy } from "./config";

const getHeaders = (apiKey) => {
  if (!apiKey) {
    throw new Error("API key is not configured for this platform. Please set it in Settings.");
  }
  return {
    "api-token": apiKey,
    "Content-Type": "application/json",
  };
};

const buildUrl = (baseUrl, path, params = {}) => {
  let fullUrl = `${baseUrl}${path}`;
  const queryParts = [];

  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
    }
  });

  if (queryParts.length > 0) {
    fullUrl += `?${queryParts.join("&")}`;
  }

  return fullUrl;
};

const getRequestUrl = (targetUrl) => {
  const proxy = getCorsProxy();
  if (proxy && proxy.trim() !== "") {
    let cleanProxy = proxy.trim();

    // Check if the proxy URL already ends with a query indicator (? or =)
    if (cleanProxy.endsWith("?") || cleanProxy.endsWith("=")) {
      return `${cleanProxy}${targetUrl}`;
    }

    // Otherwise, ensure it ends with a slash for slash-based proxies
    if (!cleanProxy.endsWith("/")) {
      cleanProxy += "/";
    }
    return `${cleanProxy}${targetUrl}`;
  }
  return targetUrl;
};

export const uploadFromUrl = async (url, platformId) => {
  const config = getPlatformConfig(platformId);
  if (!config) throw new Error("Invalid platform selection");
  const { baseUrl, apiKey } = config;

  try {
    const targetUrl = buildUrl(baseUrl, "/video/advance-upload");
    const response = await axios.post(
      getRequestUrl(targetUrl),
      { url: url.trim() },
      { headers: getHeaders(apiKey) }
    );
    return response.data;
  } catch (error) {
    console.error(`Upload error on Platform ${platformId}:`, error);
    const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
    throw new Error(errorMsg);
  }
};

export const getUploadStatus = async (id, platformId) => {
  const config = getPlatformConfig(platformId);
  if (!config) throw new Error("Invalid platform selection");
  const { baseUrl, apiKey } = config;

  try {
    const targetUrl = buildUrl(baseUrl, `/video/advance-upload/${id}`);
    const response = await axios.get(
      getRequestUrl(targetUrl),
      { headers: getHeaders(apiKey) }
    );
    return response.data;
  } catch (error) {
    console.error(`Status error on Platform ${platformId}:`, error);
    const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
    throw new Error(errorMsg);
  }
};

export const getAllVideos = async (platformId, search = "") => {
  const config = getPlatformConfig(platformId);
  if (!config) throw new Error("Invalid platform selection");
  const { baseUrl, apiKey } = config;

  try {
    const params = {
      per_page: 500
    };
    if (search.trim()) {
      params.title = search.trim();
      params.search = search.trim();
    }
    const targetUrl = buildUrl(baseUrl, "/video/manage", params);
    const response = await axios.get(
      getRequestUrl(targetUrl),
      { headers: getHeaders(apiKey) }
    );
    return response.data;
  } catch (error) {
    console.error(`Get videos error on Platform ${platformId}:`, error);
    const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
    throw new Error(errorMsg);
  }
};

export const getVideo = async (id, platformId) => {
  const config = getPlatformConfig(platformId);
  if (!config) throw new Error("Invalid platform selection");
  const { baseUrl, apiKey } = config;

  try {
    const targetUrl = buildUrl(baseUrl, `/video/manage/${id}`);
    const response = await axios.get(
      getRequestUrl(targetUrl),
      { headers: getHeaders(apiKey) }
    );
    return response.data;
  } catch (error) {
    console.error(`Get video details error on Platform ${platformId}:`, error);
    const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
    throw new Error(errorMsg);
  }
};

export const deleteVideo = async (id, platformId) => {
  const config = getPlatformConfig(platformId);
  if (!config) throw new Error("Invalid platform selection");
  const { baseUrl, apiKey } = config;

  try {
    const targetUrl = buildUrl(baseUrl, `/video/manage/${id}`);
    const response = await axios.delete(
      getRequestUrl(targetUrl),
      { headers: getHeaders(apiKey) }
    );
    return response.data;
  } catch (error) {
    console.error(`Delete video error on Platform ${platformId}:`, error);
    const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
    throw new Error(errorMsg);
  }
};

export const renameVideo = async (id, name, platformId) => {
  const config = getPlatformConfig(platformId);
  if (!config) throw new Error("Invalid platform selection");
  const { baseUrl, apiKey } = config;

  try {
    const targetUrl = buildUrl(baseUrl, `/video/manage/${id}`);
    const response = await axios.patch(
      getRequestUrl(targetUrl),
      { name },
      { headers: getHeaders(apiKey) }
    );
    return response.data;
  } catch (error) {
    console.error(`Rename video error on Platform ${platformId}:`, error);
    const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
    throw new Error(errorMsg);
  }
};
