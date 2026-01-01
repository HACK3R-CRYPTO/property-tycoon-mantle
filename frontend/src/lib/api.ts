// Get API URL with fallback
// IMPORTANT: In Next.js, NEXT_PUBLIC_* vars are embedded at BUILD TIME
// If env var wasn't set during build, it will be undefined even if set later in Vercel
// So we ALWAYS check for production at runtime as a reliable fallback
const getApiUrl = () => {
  // Priority 1: Auto-detect production at runtime FIRST (most reliable)
  // This works even if env var wasn't set during build
  if (typeof window !== 'undefined') {
    const isProduction = window.location.hostname.includes('vercel.app') || 
                         window.location.hostname.includes('railway.app') ||
                         window.location.hostname.includes('netlify.app');
    
    if (isProduction) {
      const prodUrl = 'https://property-tycoon-mantle-production.up.railway.app/api';
      console.log('🌐 [PRODUCTION] Auto-detected production environment, using Railway backend:', prodUrl);
      return prodUrl;
    }
  }
  
  // Priority 2: Use environment variable if set AND valid (check after production detection)
  // This allows overriding the auto-detection if needed
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '' && !envUrl.includes('localhost')) {
    // Ensure it ends with /api if it doesn't already
    const url = envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/api$/, '')}/api`;
    console.log('🌐 [ENV VAR] Using API URL from NEXT_PUBLIC_API_URL:', url);
    return url;
  }
  
  // Priority 3: Check NODE_ENV (build-time detection, less reliable)
  if (process.env.NODE_ENV === 'production') {
    const prodUrl = 'https://property-tycoon-mantle-production.up.railway.app/api';
    console.log('🌐 [NODE_ENV] NODE_ENV is production, using Railway backend:', prodUrl);
    return prodUrl;
  }
  
  // Default fallback for local development ONLY
  const localUrl = 'http://localhost:3001/api';
  console.log('🌐 [LOCAL] Using local development backend:', localUrl);
  return localUrl;
};

const API_URL = getApiUrl();

export const api = {
  async get(endpoint: string) {
    const url = `${API_URL}${endpoint}`;
    console.log('🌐 API GET:', url);
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API GET error:', response.status, errorText);
      throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
  },

  async post(endpoint: string, data?: any) {
    const url = `${API_URL}${endpoint}`;
    console.log('🌐 API POST:', url, data);
    const options: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    };
    if (data) {
      options.body = JSON.stringify(data);
    }
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API POST error:', response.status, errorText);
      throw new Error(`API error: ${response.statusText} - ${errorText}`);
    }
    return response.json();
  },

  async put(endpoint: string, data: any) {
    const url = `${API_URL}${endpoint}`;
    console.log('🌐 API PUT:', url, data);
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API PUT error:', response.status, errorText);
      throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
  },
};

