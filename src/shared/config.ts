// src/shared/config.ts

// Environment variables
export const config = {
  // API base URL
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  
  // Default restaurant ID (for public endpoints)
  restaurantId: import.meta.env.VITE_RESTAURANT_ID || '3',
  
  // Primary domain for links and redirects
  primaryDomain: import.meta.env.VITE_PRIMARY_DOMAIN || 'http://localhost:5176',
  
  // Restaurant name and branding
  restaurantName: 'House of Chin Fe',
  primaryColor: '#E42423',
  
  // Social media links
  facebookUrl: 'https://www.facebook.com/thenewhouseofchinfeguam/',
  instagramUrl: 'https://www.instagram.com/houseofchinfe/',
  
  // Feature flags
  enableReservations: false
};
