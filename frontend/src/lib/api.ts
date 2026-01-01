// Get API URL with fallback
const getApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    // Ensure it ends with /api if it doesn't already
    return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/api$/, '')}/api`;
  }
  // Default fallback for local development
  return 'http://localhost:3001/api';
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

