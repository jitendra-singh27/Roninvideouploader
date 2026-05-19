import React, { useState, useEffect } from 'react';
import {
  Upload,
  Video,
  Search,
  Settings,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Edit3,
  ExternalLink,
  Copy,
  Check,
  Info,
  RefreshCw,
  Layers,
  FileVideo,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Globe,
  LogOut,
  Lock,
  User
} from 'lucide-react';
import { PLATFORMS, getApiKeys, saveApiKeys, getPlatformConfig, getCorsProxy, saveCorsProxy } from './services/config';
import { uploadFromUrl, getUploadStatus, getAllVideos, deleteVideo, renameVideo } from './services/api';

export default function App() {
  // Navigation & Alerts
  const [activeTab, setActiveTab] = useState('upload');
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  const [copiedId, setCopiedId] = useState('');

  // Settings state
  const [apiKeys, setApiKeys] = useState({ streamp2p: '', upnshare: '', rpmshare: '', seekstreaming: '' });
  const [proxyUrl, setProxyUrl] = useState('');

  // Upload State
  const [uploadUrl, setUploadUrl] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState([1]);
  const [uploadQueue, setUploadQueue] = useState([]);

  // Video Manager State
  const [selectedPlatformForVideos, setSelectedPlatformForVideos] = useState(1);
  const [videos, setVideos] = useState({ 1: [], 2: [], 3: [], 4: [] });
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  const [videoPage, setVideoPage] = useState(1);
  const VIDEOS_PER_PAGE = 10;

  // Unified Search State
  const [unifiedSearchQuery, setUnifiedSearchQuery] = useState('');
  const [unifiedSearchResults, setUnifiedSearchResults] = useState([]);
  const [loadingUnifiedSearch, setLoadingUnifiedSearch] = useState(false);

  // Modals
  const [renameModal, setRenameModal] = useState({ isOpen: false, videoId: '', currentName: '', newName: '', platformId: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, videoId: '', videoName: '', platformId: null });

  // Custom Alert Handler
  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Clipboard Copier
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showAlert("Copied to clipboard!", "success");
    setTimeout(() => setCopiedId(''), 2000);
  };

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('ronin_is_logged_in') === 'true';
  });
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const envUsername = import.meta.env.VITE_ADMIN_USERNAME;
    const envPassword = import.meta.env.VITE_ADMIN_PASSWORD;

    if (loginUsername === envUsername && loginPassword === envPassword) {
      sessionStorage.setItem('ronin_is_logged_in', 'true');
      setIsLoggedIn(true);
      setLoginError('');
      showAlert("Logged in successfully!", "success");
    } else {
      setLoginError("Invalid username or password");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ronin_is_logged_in');
    setIsLoggedIn(false);
    setLoginUsername('');
    setLoginPassword('');
    showAlert("Logged out successfully!", "success");
  };

  // Load Settings on Mount
  useEffect(() => {
    setApiKeys(getApiKeys());
    setProxyUrl(getCorsProxy());
  }, []);

  // Fetch videos when video tab becomes active or active platform changes
  useEffect(() => {
    if (activeTab === 'videos') {
      fetchVideos(selectedPlatformForVideos);
    }
  }, [activeTab, selectedPlatformForVideos]);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    saveApiKeys(apiKeys);
    saveCorsProxy(proxyUrl);
    showAlert("Settings saved successfully!", "success");
  };

  const fetchVideos = async (platformId, showLoading = true, search = '') => {
    const config = getPlatformConfig(platformId);
    if (!config || !config.apiKey) {
      setVideos(prev => ({ ...prev, [platformId]: [] }));
      return;
    }

    if (showLoading) setLoadingVideos(true);
    try {
      const data = await getAllVideos(platformId, search);
      setVideos(prev => ({
        ...prev,
        [platformId]: data.data || []
      }));
    } catch (err) {
      showAlert(`${PLATFORMS[platformId].name} API error: ${err.message}`, 'danger');
    } finally {
      if (showLoading) setLoadingVideos(false);
    }
  };

  // Parallel Upload Handlers
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadUrl.trim()) {
      showAlert("Please enter a valid URL", "warning");
      return;
    }
    if (selectedPlatforms.length === 0) {
      showAlert("Please select at least one platform", "warning");
      return;
    }

    const targetUrl = uploadUrl.trim();
    setUploadUrl('');

    // Trigger upload on all chosen platforms
    selectedPlatforms.forEach(async (platformId) => {
      const platform = PLATFORMS[platformId];
      const config = getPlatformConfig(platformId);

      const queueTaskId = Date.now() + Math.random().toString(36).substr(2, 9);
      const newTask = {
        id: queueTaskId,
        url: targetUrl,
        platformId,
        platformName: platform.name,
        status: 'pending',
        taskId: null,
        videoLink: '',
        downloadLink: '',
        error: null,
        createdAt: new Date().toLocaleTimeString(),
      };

      setUploadQueue(prev => [newTask, ...prev]);

      if (!config || !config.apiKey) {
        setUploadQueue(prev => prev.map(t =>
          t.id === queueTaskId
            ? { ...t, status: 'failed', error: 'API key is not configured for this platform.' }
            : t
        ));
        return;
      }

      try {
        setUploadQueue(prev => prev.map(t =>
          t.id === queueTaskId ? { ...t, status: 'uploading' } : t
        ));

        const response = await uploadFromUrl(targetUrl, platformId);
        const apiTaskId = response.id;

        if (!apiTaskId) {
          throw new Error("No Task ID returned from API");
        }

        setUploadQueue(prev => prev.map(t =>
          t.id === queueTaskId ? { ...t, taskId: apiTaskId } : t
        ));

        pollUploadStatus(apiTaskId, platformId, queueTaskId);

      } catch (err) {
        setUploadQueue(prev => prev.map(t =>
          t.id === queueTaskId ? { ...t, status: 'failed', error: err.message } : t
        ));
      }
    });
  };

  const pollUploadStatus = async (apiTaskId, platformId, queueTaskId) => {
    const platform = PLATFORMS[platformId];
    let isDone = false;
    let attempts = 0;
    const maxAttempts = 120; // 10 mins (120 * 5s)

    while (!isDone && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 5000));
      attempts++;

      try {
        const statusData = await getUploadStatus(apiTaskId, platformId);

        if (statusData.status === 'completed') {
          const videoId = statusData.video?.id;
          const videoLink = videoId ? `${platform.playerUrl}/#${videoId}` : '';
          const downloadLink = videoId ? `${platform.playerUrl}/#${videoId}&dl=1` : '';

          setUploadQueue(prev => prev.map(t =>
            t.id === queueTaskId
              ? { ...t, status: 'completed', videoLink, downloadLink }
              : t
          ));
          isDone = true;
          showAlert(`Upload completed on ${platform.name}!`, "success");

          fetchVideos(platformId, false);
        } else if (statusData.status === 'failed') {
          setUploadQueue(prev => prev.map(t =>
            t.id === queueTaskId
              ? { ...t, status: 'failed', error: 'Platform failed to process the video URL.' }
              : t
          ));
          isDone = true;
        }
      } catch (err) {
        console.error("Polling error:", err.message);
      }
    }

    if (attempts >= maxAttempts) {
      setUploadQueue(prev => prev.map(t =>
        t.id === queueTaskId
          ? { ...t, status: 'failed', error: 'Upload process timed out (10 mins).' }
          : t
      ));
    }
  };

  // Unified Search Handler
  const handleUnifiedSearchSubmit = async (e) => {
    e.preventDefault();
    if (!unifiedSearchQuery.trim()) return;

    setLoadingUnifiedSearch(true);
    setUnifiedSearchResults([]);

    const keys = getApiKeys();
    const activePlatforms = Object.values(PLATFORMS).filter(p => {
      if (p.slug === 'streamp2p') return !!keys.streamp2p;
      if (p.slug === 'upnshare') return !!keys.upnshare;
      if (p.slug === 'rpmshare') return !!keys.rpmshare;
      if (p.slug === 'seekstreaming') return !!keys.seekstreaming;
      return false;
    });

    if (activePlatforms.length === 0) {
      showAlert("Please enter at least one API key in settings to search.", "warning");
      setLoadingUnifiedSearch(false);
      return;
    }

    const results = [];
    await Promise.all(activePlatforms.map(async (platform) => {
      try {
        const data = await getAllVideos(platform.id, unifiedSearchQuery);
        if (data && data.data) {
          const filtered = data.data.filter(v =>
            v.name?.toLowerCase().includes(unifiedSearchQuery.toLowerCase())
          );
          filtered.forEach(v => {
            results.push({
              ...v,
              platformId: platform.id,
              platformName: platform.name,
              playerUrl: platform.playerUrl
            });
          });
        }
      } catch (err) {
        console.error(`Search failed on ${platform.name}:`, err);
      }
    }));

    setUnifiedSearchResults(results);
    setLoadingUnifiedSearch(false);
  };

  // Manage Video Actions: Rename & Delete
  const handleRenameClick = (video, platformId) => {
    setRenameModal({
      isOpen: true,
      videoId: video.id,
      currentName: video.name || '',
      newName: video.name || '',
      platformId
    });
  };

  const handleRenameConfirm = async () => {
    const { videoId, newName, platformId } = renameModal;
    if (!newName.trim()) return;

    try {
      await renameVideo(videoId, newName.trim(), platformId);
      showAlert("Video renamed successfully!", "success");

      fetchVideos(platformId, false);

      setUnifiedSearchResults(prev => prev.map(v =>
        (v.id === videoId && v.platformId === platformId) ? { ...v, name: newName.trim() } : v
      ));
    } catch (err) {
      showAlert(`Rename failed: ${err.message}`, 'danger');
    } finally {
      setRenameModal({ isOpen: false, videoId: '', currentName: '', newName: '', platformId: null });
    }
  };

  const handleDeleteClick = (video, platformId) => {
    setDeleteModal({
      isOpen: true,
      videoId: video.id,
      videoName: video.name || 'Untitled Video',
      platformId
    });
  };

  const handleDeleteConfirm = async () => {
    const { videoId, platformId } = deleteModal;
    try {
      await deleteVideo(videoId, platformId);
      showAlert("Video deleted successfully!", "success");

      fetchVideos(platformId, false);

      setUnifiedSearchResults(prev => prev.filter(v => !(v.id === videoId && v.platformId === platformId)));
    } catch (err) {
      showAlert(`Delete failed: ${err.message}`, 'danger');
    } finally {
      setDeleteModal({ isOpen: false, videoId: '', videoName: '', platformId: null });
    }
  };

  const isPlatformActive = (slug) => {
    return !!apiKeys[slug];
  };

  const filteredVideos = (videos[selectedPlatformForVideos] || []).filter(v =>
    v.name?.toLowerCase().includes(videoSearchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredVideos.length / VIDEOS_PER_PAGE) || 1;
  const paginatedVideos = filteredVideos.slice(
    (videoPage - 1) * VIDEOS_PER_PAGE,
    videoPage * VIDEOS_PER_PAGE
  );

  if (!isLoggedIn) {
    return (
      <div className="login-screen-wrapper">
        {/* Toast Alert */}
        {alert.show && (
          <div className={`toast-alert toast-${alert.type}`}>
            {alert.type === 'success' ? <CheckCircle className="toast-icon" /> : <AlertTriangle className="toast-icon" />}
            <span className="toast-message">{alert.message}</span>
          </div>
        )}

        <div className="login-card glass-container">
          <div className="login-logo-container">
            <div className="login-logo-icon-wrapper">
              <Layers className="login-logo-icon" />
            </div>
            <h1 className="login-title-text">Ronin X Stream</h1>
            <p className="login-subtitle-text">Enter credentials to unlock uploader dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            {loginError && (
              <div className="login-error-msg">
                <AlertTriangle className="toast-icon" style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                <span>{loginError}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="login-input-wrapper">
                <User className="login-input-icon" />
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Enter username"
                  className="login-input"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="login-input-wrapper">
                <Lock className="login-input-icon" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  className="login-input"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary login-button">
              <Lock className="btn-icon" />
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Toast Alert */}
      {alert.show && (
        <div className={`toast-alert toast-${alert.type}`}>
          {alert.type === 'success' ? <CheckCircle className="toast-icon" /> : <AlertTriangle className="toast-icon" />}
          <span className="toast-message">{alert.message}</span>
        </div>
      )}

      {/* Top Banner / Header */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon-wrapper">
            <Layers className="logo-icon" />
          </div>
          <div className="logo-text-wrapper">
            <h1 className="logo-title">Ronin X Stream</h1>
            <p className="logo-subtitle">Direct Video Upload Dashboard</p>
          </div>
        </div>

        {/* Platform API Key Status indicators & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div className="platform-status-bar">
            {Object.values(PLATFORMS).map(platform => {
              const active = isPlatformActive(platform.slug);
              return (
                <div
                  key={platform.id}
                  className={`status-indicator ${active ? 'indicator-active' : 'indicator-inactive'}`}
                >
                  <div className={`status-dot ${active ? 'dot-active' : 'dot-inactive'}`} />
                  {platform.name}
                </div>
              );
            })}
          </div>

          <button onClick={handleLogout} className="logout-button-header" title="Lock Dashboard">
            <LogOut className="btn-icon-sm" style={{ width: '14px', height: '14px' }} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="app-body">

        {/* Sidebar Nav */}
        <nav className="sidebar-menu">
          <button
            onClick={() => setActiveTab('upload')}
            className={`nav-button ${activeTab === 'upload' ? 'nav-active' : ''}`}
          >
            <Upload className="nav-icon" />
            <span className="nav-label">Upload Studio</span>
          </button>

          <button
            onClick={() => { setActiveTab('videos'); setVideoPage(1); }}
            className={`nav-button ${activeTab === 'videos' ? 'nav-active' : ''}`}
          >
            <Video className="nav-icon" />
            <span className="nav-label">My Videos</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`nav-button ${activeTab === 'search' ? 'nav-active' : ''}`}
          >
            <Search className="nav-icon" />
            <span className="nav-label">Unified Search</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`nav-button ${activeTab === 'settings' ? 'nav-active' : ''}`}
          >
            <Settings className="nav-icon" />
            <span className="nav-label">Settings</span>
          </button>
        </nav>

        {/* Tab Contents */}
        <main className="content-area">

          {/* TAB 1: UPLOAD STUDIO */}
          {activeTab === 'upload' && (
            <div className="tab-pane">
              <section className="panel-card glass-container">
                <div className="panel-header">
                  <h2 className="panel-title">Upload Video</h2>
                  <p className="panel-subtitle">Submit a public direct video URL to process and upload to video hosts.</p>
                </div>

                <form onSubmit={handleUploadSubmit} className="upload-form">
                  <div className="form-group">
                    <label className="form-label">Video URL</label>
                    <input
                      type="url"
                      value={uploadUrl}
                      onChange={(e) => setUploadUrl(e.target.value)}
                      placeholder="https://example.com/video.mp4"
                      className="form-input"
                    />
                  </div>

                  {/* Target Platforms checkbox grid */}
                  <div className="form-group">
                    <label className="form-label">Select Platforms to Upload</label>
                    <div className="platforms-grid">
                      {Object.values(PLATFORMS).map(platform => {
                        const isSelected = selectedPlatforms.includes(platform.id);
                        const isConfigured = isPlatformActive(platform.slug);

                        return (
                          <div
                            key={platform.id}
                            onClick={() => {
                              if (!isConfigured) return;
                              setSelectedPlatforms(prev =>
                                isSelected
                                  ? prev.filter(id => id !== platform.id)
                                  : [...prev, platform.id]
                              );
                            }}
                            className={`platform-checkbox-card ${!isConfigured ? 'card-disabled' :
                              isSelected ? 'card-selected' : 'card-unselected'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!isConfigured}
                              onChange={() => { }} // handled by click
                              className="checkbox-control"
                            />
                            <div className="platform-info">
                              <span className="platform-name">{platform.name}</span>
                              <span className="platform-subtext">
                                {isConfigured ? 'Ready' : 'Not configured'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => {
                        const configured = Object.values(PLATFORMS)
                          .filter(p => isPlatformActive(p.slug))
                          .map(p => p.id);

                        if (selectedPlatforms.length === configured.length) {
                          setSelectedPlatforms([]);
                        } else {
                          setSelectedPlatforms(configured);
                        }
                      }}
                      className="link-btn"
                    >
                      {selectedPlatforms.length === Object.values(PLATFORMS).filter(p => isPlatformActive(p.slug)).length
                        ? 'Deselect All'
                        : 'Select All Active'}
                    </button>

                    <button
                      type="submit"
                      className="btn btn-primary"
                    >
                      <Upload className="btn-icon" />
                      Start Upload
                    </button>
                  </div>
                </form>
              </section>

              {/* Upload Queue History */}
              <section className="panel-card glass-container">
                <div className="queue-header">
                  <h2 className="panel-title">Upload Queue</h2>
                  {uploadQueue.length > 0 && (
                    <button
                      onClick={() => setUploadQueue([])}
                      className="text-link-small"
                    >
                      Clear Queue
                    </button>
                  )}
                </div>

                {uploadQueue.length === 0 ? (
                  <div className="empty-state">
                    <FileVideo className="empty-icon" />
                    <div className="empty-title">No files currently in the upload queue</div>
                    <div className="empty-description">Enter a video URL above and select upload destinations to get started.</div>
                  </div>
                ) : (
                  <div className="queue-list">
                    {uploadQueue.map(task => (
                      <div key={task.id} className="queue-card glass-card">
                        <div className="queue-card-meta">
                          <div className="meta-left">
                            <span className="badge badge-primary">{task.platformName}</span>
                            <span className="time-stamp">{task.createdAt}</span>
                          </div>

                          <div className="meta-right">
                            {task.status === 'pending' && (
                              <span className="badge badge-warning">Pending</span>
                            )}
                            {task.status === 'uploading' && (
                              <span className="badge badge-primary badge-pulse">
                                <RefreshCw className="spinner-icon" />
                                Processing...
                              </span>
                            )}
                            {task.status === 'completed' && (
                              <span className="badge badge-success">Completed</span>
                            )}
                            {task.status === 'failed' && (
                              <span className="badge badge-danger">Failed</span>
                            )}
                          </div>
                        </div>

                        <div className="queue-url">
                          {task.url}
                        </div>

                        {task.taskId && (
                          <div className="task-id-info">
                            Task ID: <span className="task-id-value">{task.taskId}</span>
                          </div>
                        )}

                        {task.error && (
                          <div className="error-panel">
                            Error: {task.error}
                          </div>
                        )}

                        {task.status === 'completed' && (
                          <div className="queue-card-actions">
                            <a
                              href={task.videoLink}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                            >
                              <ExternalLink className="btn-icon-sm" />
                              Watch Video
                            </a>
                            <button
                              onClick={() => copyToClipboard(task.videoLink, task.id + '_watch')}
                              className="btn btn-secondary btn-sm"
                            >
                              {copiedId === task.id + '_watch' ? <Check className="btn-icon-sm text-success" /> : <Copy className="btn-icon-sm" />}
                              Copy Link
                            </button>
                            <button
                              onClick={() => copyToClipboard(task.downloadLink, task.id + '_dl')}
                              className="btn btn-secondary btn-sm"
                            >
                              {copiedId === task.id + '_dl' ? <Check className="btn-icon-sm text-success" /> : <Copy className="btn-icon-sm" />}
                              Copy Download
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 2: MY VIDEOS */}
          {activeTab === 'videos' && (
            <section className="panel-card glass-container">
              <div className="manager-header">
                <div className="manager-title-section">
                  <h2 className="panel-title">Video Manager</h2>
                  <p className="panel-subtitle">View and manage uploaded videos on each host platform.</p>
                </div>

                {/* Platform tabs inside manager */}
                <div className="tabs-selector">
                  {Object.values(PLATFORMS).map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPlatformForVideos(p.id);
                        setVideoPage(1);
                      }}
                      className={`tab-trigger ${selectedPlatformForVideos === p.id ? 'tab-trigger-active' : ''}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status validation */}
              {!isPlatformActive(PLATFORMS[selectedPlatformForVideos].slug) ? (
                <div className="empty-state-card">
                  <ShieldCheck className="empty-card-icon" />
                  <div className="empty-card-text">
                    <h3 className="empty-card-title">Platform Not Configured</h3>
                    <p className="empty-card-description">You must configure an API key for {PLATFORMS[selectedPlatformForVideos].name} in the settings tab to view your videos.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="btn btn-primary btn-sm"
                  >
                    Go to Settings
                  </button>
                </div>
              ) : (
                <>
                  {/* Search Bar & Refresh */}
                  <div className="videos-toolbar">
                    <div className="search-wrapper">
                      <Search className="search-icon" />
                      <input
                        type="text"
                        value={videoSearchQuery}
                        onChange={(e) => { setVideoSearchQuery(e.target.value); setVideoPage(1); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            fetchVideos(selectedPlatformForVideos, true, videoSearchQuery);
                          }
                        }}
                        placeholder="Filter locally or press Enter to search server..."
                        className="form-input search-input"
                      />
                    </div>

                    <button
                      onClick={() => fetchVideos(selectedPlatformForVideos, true, videoSearchQuery)}
                      disabled={loadingVideos}
                      className="btn btn-secondary btn-icon-only"
                      title="Refresh / Search Server"
                    >
                      <RefreshCw className={`btn-icon ${loadingVideos ? 'animate-spin icon-accent' : ''}`} />
                    </button>
                  </div>

                  {/* Videos Table / Cards */}
                  {loadingVideos ? (
                    <div className="loading-state">
                      <div className="spinner spinner-large"></div>
                      <div className="loading-text">Fetching videos from host API...</div>
                    </div>
                  ) : filteredVideos.length === 0 ? (
                    <div className="empty-table-state">
                      No videos found on {PLATFORMS[selectedPlatformForVideos].name} {videoSearchQuery ? `matching "${videoSearchQuery}"` : ''}.
                    </div>
                  ) : (
                    <div className="videos-table-wrapper">
                      <div className="videos-table-container">
                        <table className="premium-table">
                          <thead>
                            <tr>
                              <th>Video Details</th>
                              <th className="hidden-mobile">Video ID</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedVideos.map(video => {
                              const streamUrl = `${PLATFORMS[selectedPlatformForVideos].playerUrl}/#${video.id}`;
                              const downloadUrl = `${streamUrl}&dl=1`;

                              return (
                                <tr key={video.id}>
                                  <td>
                                    <div className="table-video-details">
                                      <span className="table-video-name" title={video.name}>
                                        {video.name || 'Untitled Video'}
                                      </span>
                                      <span className="table-video-id-mobile">
                                        ID: {video.id}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="hidden-mobile table-video-id">
                                    {video.id}
                                  </td>
                                  <td>
                                    <div className="table-actions">
                                      <a
                                        href={streamUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="action-btn watch-btn"
                                        title="Watch Video"
                                      >
                                        <ExternalLink className="action-icon" />
                                      </a>

                                      <button
                                        onClick={() => copyToClipboard(streamUrl, video.id + '_stream')}
                                        className="action-btn copy-btn"
                                        title="Copy Watch Link"
                                      >
                                        {copiedId === video.id + '_stream' ? <Check className="action-icon text-success" /> : <Copy className="action-icon" />}
                                      </button>

                                      <button
                                        onClick={() => copyToClipboard(downloadUrl, video.id + '_dl')}
                                        className="action-btn copy-btn copy-dl-btn"
                                        title="Copy Download Link"
                                      >
                                        {copiedId === video.id + '_dl' ? <Check className="action-icon text-success" /> : <Copy className="action-icon" />}
                                        <span className="xl-text-only">DL</span>
                                      </button>

                                      <button
                                        onClick={() => handleRenameClick(video, selectedPlatformForVideos)}
                                        className="action-btn edit-btn"
                                        title="Rename Video"
                                      >
                                        <Edit3 className="action-icon" />
                                      </button>

                                      <button
                                        onClick={() => handleDeleteClick(video, selectedPlatformForVideos)}
                                        className="action-btn delete-btn"
                                        title="Delete Video"
                                      >
                                        <Trash2 className="action-icon" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="pagination-bar">
                          <span className="pagination-info">
                            Showing {(videoPage - 1) * VIDEOS_PER_PAGE + 1} - {Math.min(videoPage * VIDEOS_PER_PAGE, filteredVideos.length)} of {filteredVideos.length} videos
                          </span>

                          <div className="pagination-buttons">
                            <button
                              onClick={() => setVideoPage(prev => Math.max(prev - 1, 1))}
                              disabled={videoPage === 1}
                              className="btn btn-secondary btn-sm"
                            >
                              <ChevronLeft className="btn-icon-sm" />
                              Prev
                            </button>
                            <span className="pagination-current-page">
                              Page {videoPage} of {totalPages}
                            </span>
                            <button
                              onClick={() => setVideoPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={videoPage === totalPages}
                              className="btn btn-secondary btn-sm"
                            >
                              Next
                              <ChevronRight className="btn-icon-sm" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* TAB 3: UNIFIED SEARCH */}
          {activeTab === 'search' && (
            <section className="panel-card glass-container">
              <div className="panel-header">
                <h2 className="panel-title">Unified Search</h2>
                <p className="panel-subtitle">Search simultaneously across all configured platforms.</p>
              </div>

              <form onSubmit={handleUnifiedSearchSubmit} className="search-form">
                <div className="relative-flex-input">
                  <Search className="search-icon-input" />
                  <input
                    type="text"
                    value={unifiedSearchQuery}
                    onChange={(e) => setUnifiedSearchQuery(e.target.value)}
                    placeholder="Enter video title query..."
                    className="form-input unified-search-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loadingUnifiedSearch}
                  className="btn btn-primary search-submit-btn"
                >
                  {loadingUnifiedSearch ? <RefreshCw className="btn-icon spinner-icon animate-spin" /> : 'Search'}
                </button>
              </form>

              {loadingUnifiedSearch ? (
                <div className="loading-state">
                  <div className="spinner spinner-large"></div>
                  <div className="loading-text">Searching all platforms in parallel...</div>
                </div>
              ) : unifiedSearchResults.length === 0 ? (
                <div className="empty-table-state">
                  {unifiedSearchQuery ? 'No videos match your query.' : 'Enter a search term above.'}
                </div>
              ) : (
                <div className="results-container">
                  <div className="results-count-label">
                    FOUND {unifiedSearchResults.length} RESULTS
                  </div>

                  <div className="videos-table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Video Info</th>
                          <th>Platform</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unifiedSearchResults.map(video => {
                          const streamUrl = `${video.playerUrl}/#${video.id}`;
                          const downloadUrl = `${streamUrl}&dl=1`;

                          return (
                            <tr key={`${video.platformId}_${video.id}`}>
                              <td>
                                <div className="table-video-details">
                                  <span className="table-video-name" title={video.name}>
                                    {video.name || 'Untitled Video'}
                                  </span>
                                  <span className="table-video-id-mobile">
                                    ID: {video.id}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className="badge badge-primary">{video.platformName}</span>
                              </td>
                              <td>
                                <div className="table-actions">
                                  <a
                                    href={streamUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="action-btn watch-btn"
                                    title="Watch Video"
                                  >
                                    <ExternalLink className="action-icon" />
                                  </a>

                                  <button
                                    onClick={() => copyToClipboard(streamUrl, `${video.platformId}_${video.id}_watch`)}
                                    className="action-btn copy-btn"
                                    title="Copy Watch Link"
                                  >
                                    {copiedId === `${video.platformId}_${video.id}_watch` ? <Check className="action-icon text-success" /> : <Copy className="action-icon" />}
                                  </button>

                                  <button
                                    onClick={() => copyToClipboard(downloadUrl, `${video.platformId}_${video.id}_dl`)}
                                    className="action-btn copy-btn copy-dl-btn"
                                    title="Copy Download Link"
                                  >
                                    {copiedId === `${video.platformId}_${video.id}_dl` ? <Check className="action-icon text-success" /> : <Copy className="action-icon" />}
                                    <span className="xl-text-only">DL</span>
                                  </button>

                                  <button
                                    onClick={() => handleRenameClick(video, video.platformId)}
                                    className="action-btn edit-btn"
                                    title="Rename Video"
                                  >
                                    <Edit3 className="action-icon" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteClick(video, video.platformId)}
                                    className="action-btn delete-btn"
                                    title="Delete Video"
                                  >
                                    <Trash2 className="action-icon" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === 'settings' && (
            <section className="panel-card glass-container">
              <div className="panel-header">
                <h2 className="panel-title">Settings</h2>
                <p className="panel-subtitle">Configure your platform API keys and CORS proxy configurations. Data is stored locally in your browser.</p>
              </div>

              <form onSubmit={handleSaveSettings} className="settings-form">
                <div className="settings-grid">
                  <div className="form-group">
                    <label className="form-label">StreamP2P API Key</label>
                    <input
                      type="password"
                      value={apiKeys.streamp2p}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, streamp2p: e.target.value }))}
                      placeholder="Enter StreamP2P api token"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">UpnShare API Key</label>
                    <input
                      type="password"
                      value={apiKeys.upnshare}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, upnshare: e.target.value }))}
                      placeholder="Enter UpnShare api token"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">RPMShare API Key</label>
                    <input
                      type="password"
                      value={apiKeys.rpmshare}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, rpmshare: e.target.value }))}
                      placeholder="Enter RPMShare api token"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">SeekStreaming API Key</label>
                    <input
                      type="password"
                      value={apiKeys.seekstreaming}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, seekstreaming: e.target.value }))}
                      placeholder="Enter SeekStreaming api token"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="proxy-section">
                  <div className="form-group">
                    <div className="proxy-label-row">
                      <label className="form-label label-flex">
                        <Globe className="label-icon-decor" />
                        CORS Proxy URL
                      </label>
                      <button
                        type="button"
                        onClick={() => setProxyUrl("")}
                        className="reset-btn"
                      >
                        Reset to default
                      </button>
                    </div>

                    <input
                      type="url"
                      value={proxyUrl}
                      onChange={(e) => setProxyUrl(e.target.value)}
                      placeholder="https://thingproxy.freeboard.io/fetch/ (leave blank for direct connection)"
                      className="form-input"
                    />
                    <p className="form-tip">
                      Note: A CORS proxy is required to circumvent browser security restrictions (CORS) when communicating directly with platform APIs. Leave empty only if running in a browser extension or with disabled security.
                    </p>
                  </div>
                </div>

                <div className="settings-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Save Configuration
                  </button>
                </div>
              </form>

              <div className="privacy-info-block">
                <Info className="privacy-info-icon" />
                <div className="privacy-info-text">
                  <span className="privacy-info-bold">Privacy Information:</span> Your keys are stored completely in your local browser storage using industry-standard API security. No data is collected or transmitted to any middleman server.
                </div>
              </div>
            </section>
          )}

        </main>
      </div>

      {/* RENAME MODAL */}
      {renameModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-card glass-container">
            <div className="modal-header">
              <h3 className="modal-title">Rename Video</h3>
              <p className="modal-subtitle">Modify the filename on the hosting platform.</p>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Current Name</label>
                <div className="modal-current-name">
                  {renameModal.currentName}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">New Name</label>
                <input
                  type="text"
                  value={renameModal.newName}
                  onChange={(e) => setRenameModal(prev => ({ ...prev, newName: e.target.value }))}
                  placeholder="Enter new filename..."
                  className="form-input"
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setRenameModal(prev => ({ ...prev, isOpen: false }))}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenameConfirm}
                disabled={!renameModal.newName.trim()}
                className="btn btn-primary"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-card glass-container">
            <div className="modal-header">
              <h3 className="modal-title alert-title">Delete Video</h3>
              <p className="modal-subtitle">Are you sure you want to permanently delete this video from the host?</p>
            </div>

            <div className="modal-body">
              <div className="modal-delete-info">
                {deleteModal.videoName}
              </div>

              <p className="modal-warning-label">
                Warning: This action is irreversible.
              </p>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="btn btn-danger"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer-bar">
        &copy; {new Date().getFullYear()} Ronin X Stream Uploader. All rights reserved. Runs backend-less in browser storage.
      </footer>
    </div>
  );
}
