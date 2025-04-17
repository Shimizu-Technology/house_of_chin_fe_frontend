// src/ordering/OnlineOrderingApp.tsx

import React, { useEffect, Suspense, useState } from 'react';
import { Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';

import { Hero } from './components/Hero';
import { MenuPage } from './components/MenuPage';
import { CartPage } from './components/CartPage';
import { CheckoutPage } from './components/CheckoutPage';
import { OrderConfirmation } from './components/OrderConfirmation';
import MerchandisePage from './components/MerchandisePage';
import AdminDashboard from './components/admin/AdminDashboard';
import { LoadingSpinner } from '../shared/components/ui';
import { LoginForm, SignUpForm, ForgotPasswordForm, ResetPasswordForm, VerifyPhonePage } from '../shared/components/auth';
import { OrderHistory } from './components/profile/OrderHistory';
import { ProfilePage } from '../shared/components/profile';

import { useMenuStore } from './store/menuStore';
import { useCategoryStore } from './store/categoryStore';
import { useLoadingStore } from './store/loadingStore';
import { useAuthStore } from './store/authStore';
import { useMerchandiseStore } from './store/merchandiseStore';
import { MenuItem as MenuItemCard } from './components/MenuItem';
import { useSiteSettingsStore } from './store/siteSettingsStore'; // <-- IMPORTANT
import { useRestaurantStore } from '../shared/store/restaurantStore';
import { useMenuLayoutStore } from './store/menuLayoutStore';
import { validateRestaurantContext } from '../shared/utils/tenantUtils';
import type { MenuItem, MenuItemFilterParams } from './types/menu';

import { ProtectedRoute, AnonymousRoute, PhoneVerificationRoute } from '../shared';

function OrderingLayout() {
  const loadingCount = useLoadingStore((state) => state.loadingCount);
  const [showSpinner, setShowSpinner] = React.useState(false);
  const [timerId, setTimerId] = React.useState<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (loadingCount > 0) {
      // Start a short timer so spinner doesn't show if loading is very quick
      if (!timerId) {
        const id = setTimeout(() => {
          setShowSpinner(true);
          setTimerId(null);
        }, 700);
        setTimerId(id);
      }
    } else {
      // No more loading → clear timer and hide spinner
      if (timerId) {
        clearTimeout(timerId);
        setTimerId(null);
      }
      setShowSpinner(false);
    }
  }, [loadingCount, timerId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      <main className="flex-grow tropical-pattern">
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet />
        </Suspense>
      </main>

      {showSpinner && (
        <div
          className="
            fixed top-0 left-0 w-screen h-screen
            bg-black bg-opacity-40 
            flex items-center justify-center
            z-[9999999]
          "
        >
          <div className="bg-gray-800 p-6 rounded shadow-lg flex flex-col items-center">
            <LoadingSpinner />
            <p className="mt-3 text-white font-semibold">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OnlineOrderingApp() {
  const { fetchFeaturedItems } = useMenuStore();
  const { fetchSiteSettings } = useSiteSettingsStore(); // <-- destructure the store method
  const { fetchCollections } = useMerchandiseStore();
  const { restaurant } = useRestaurantStore();
  const { initializeLayout } = useMenuLayoutStore();
  
  // State for featured items and loading state
  const [featuredItems, setFeaturedItems] = useState<MenuItem[]>([]);
  const [featuredItemsLoading, setFeaturedItemsLoading] = useState(false);

  // Initialize menu layout preferences based on restaurant settings
  useEffect(() => {
    if (restaurant?.id) {
      console.debug('OnlineOrderingApp: Initializing menu layout preferences');
      initializeLayout(restaurant.id);
    }
  }, [restaurant?.id, initializeLayout]);

  useEffect(() => {
    // Initialize WebSocket connection as soon as the app loads
    // Use silent mode during initial load to reduce console noise
    const isInitialLoad = !restaurant;
    if (validateRestaurantContext(restaurant, isInitialLoad)) {
      console.debug('OnlineOrderingApp: Initializing WebSocket connection for menu items');
      const { startMenuItemsWebSocket, stopInventoryPolling } = useMenuStore.getState();
      
      // Ensure any existing polling is stopped before starting WebSocket
      stopInventoryPolling();
      
      // Only initialize WebSocket if user is authenticated
      const user = useAuthStore.getState().user;
      const isAuthenticated = !!user;
      
      if (isAuthenticated) {
        // Initialize WebSocketManager with restaurant ID for proper tenant isolation
        import('../shared/services/WebSocketManager').then(({ default: webSocketManager }) => {
          if (restaurant && restaurant.id) {
            webSocketManager.initialize(restaurant.id.toString());
            startMenuItemsWebSocket();
          }
        });
      } else {
        console.debug('OnlineOrderingApp: Skipping WebSocket initialization for unauthenticated user');
      }
      
      // Prefetch all menu items data when the app initializes
      prefetchMenuData();
      
      // Double-check that polling is stopped after WebSocket connection
      setTimeout(() => {
        if (useMenuStore.getState().inventoryPollingInterval !== null) {
          console.debug('OnlineOrderingApp: Stopping lingering inventory polling after WebSocket connection');
          stopInventoryPolling();
        }
      }, 1000);
      
      return () => {
        console.debug('OnlineOrderingApp: Cleaning up WebSocket connection');
        stopInventoryPolling();
      };
    }
  }, [restaurant]);
  
  // Function to prefetch menu data at app initialization
  const prefetchMenuData = async () => {
    if (!validateRestaurantContext(restaurant)) {
      console.warn('OnlineOrderingApp: Restaurant context missing, cannot prefetch menu data');
      return;
    }
    
    try {
      console.debug('OnlineOrderingApp: Prefetching menu data at app initialization');
      
      // Get menu store methods
      const { 
        fetchVisibleMenuItems, 
        fetchMenus, 
        fetchMenuItemsForAdmin 
      } = useMenuStore.getState();
      const { fetchCategoriesForMenu } = useCategoryStore.getState();
      const { user } = useAuthStore.getState();
      
      // Check if user has admin privileges
      const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
      
      // 1. Fetch menus first to get the current menu ID
      await fetchMenus();
      
      // 2. Get the current menu ID after fetching menus
      const { currentMenuId } = useMenuStore.getState();
      
      if (currentMenuId) {
        // 3. Fetch categories for the current menu
        await fetchCategoriesForMenu(currentMenuId, restaurant?.id);
        
        // 4. Prefetch data for customer-facing menu page
        console.debug('OnlineOrderingApp: Prefetching customer-facing menu data');
        
        // 4a. Prefetch "All Items" view (no category filter)
        await fetchVisibleMenuItems(undefined, restaurant?.id, false, false);
        
        // 4b. Get categories after they've been fetched
        const { categories } = useCategoryStore.getState();
        const menuCategories = categories.filter((cat: { menu_id: number; id: number; name: string }) => 
          cat.menu_id === currentMenuId
        );
        
        // 4c. Prefetch first few categories (limit to 3 to avoid too many requests)
        const categoriesToPrefetch = menuCategories.slice(0, 3);
        
        for (const category of categoriesToPrefetch) {
          console.debug(`OnlineOrderingApp: Prefetching customer data for category ${category.name}`);
          await fetchVisibleMenuItems(category.id, restaurant?.id, false, false);
        }
        
        // 5. Only prefetch admin data if the user has admin privileges
        if (isAdmin) {
          console.debug('OnlineOrderingApp: Prefetching admin menu data');
          
          // 5a. Prefetch admin "All Items" view with stock information
          const adminFilterParams: MenuItemFilterParams = {
            view_type: 'admin' as 'admin',
            include_stock: true,
            restaurant_id: restaurant?.id,
            menu_id: currentMenuId
          };
          
          await fetchMenuItemsForAdmin(adminFilterParams);
          
          // 5b. Prefetch first category for admin view
          if (categoriesToPrefetch.length > 0) {
            const firstCategory = categoriesToPrefetch[0];
            const adminCategoryParams = {
              ...adminFilterParams,
              category_id: firstCategory.id
            };
            
            console.debug(`OnlineOrderingApp: Prefetching admin data for category ${firstCategory.name}`);
            await fetchMenuItemsForAdmin(adminCategoryParams);
          }
        }
        
        console.debug('OnlineOrderingApp: Menu data prefetching complete');
      }
    } catch (error) {
      console.error('Error prefetching menu data:', error);
    }
  };

  useEffect(() => {
    // Load featured items with optimized backend filtering
    const loadFeaturedItems = async () => {
      // Validate restaurant context for tenant isolation
      // Use silent mode during initial load to reduce console noise
      const isInitialLoad = !restaurant;
      if (!validateRestaurantContext(restaurant, isInitialLoad)) {
        // Only log warning if not in initial load
        if (!isInitialLoad) {
          console.warn('OnlineOrderingApp: Restaurant context missing, cannot fetch featured items');
        }
        return;
      }
      
      setFeaturedItemsLoading(true);
      try {
        // Use optimized backend filtering instead of loading all items
        // Pass the restaurant ID if available, otherwise the utility will try to get it from localStorage
        const items = await fetchFeaturedItems(restaurant?.id);
        setFeaturedItems(items);
      } catch (error) {
        console.error('Error fetching featured items:', error);
      } finally {
        setFeaturedItemsLoading(false);
      }
    };
    
    loadFeaturedItems();
    fetchSiteSettings();     // load hero/spinner image URLs
    fetchCollections();      // load merchandise collections
  }, [fetchFeaturedItems, fetchSiteSettings, fetchCollections, restaurant]);

  // We no longer need to slice the featured items as we're showing all of them in the grid

  return (
    <Routes>
      <Route element={<OrderingLayout />}>
        {/* index => "/" => hero & popular items */}
        <Route
          index
          element={
            <>
              <Hero />
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {featuredItemsLoading ? (
                  // Show loading spinner while featured items are loading
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c1902f]"></div>
                  </div>
                ) : featuredItems.length > 0 ? (
                  // Show Popular Items with an improved layout
                  <div className="animate-fadeIn">
                    <div className="flex items-center justify-between mb-8">
                      <div className="relative">
                        <h2 className="text-2xl sm:text-3xl font-display text-gray-900 relative z-10">
                          Popular Items
                        </h2>
                        <div className="absolute bottom-0 left-0 h-3 w-48 bg-[#E42423] opacity-20 rounded-full"></div>
                      </div>
                      <Link 
                        to="/menu" 
                        className="text-sm font-medium text-[#c1902f] hover:text-[#d4a43f] transition-colors flex items-center"
                      >
                        View All
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </Link>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {featuredItems.map((item) => (
                        <div key={item.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-gray-100 hover:border-gray-200">
                          <MenuItemCard item={item} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Enhanced empty state with visual elements and better layout
                  <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto animate-fadeIn">
                    <div className="text-center mb-12">
                      <h2 className="text-3xl sm:text-4xl font-serif text-gray-900 relative inline-block">
                        Discover Our Menu
                        <div className="absolute -bottom-2 left-0 right-0 h-1 bg-[#E42423] rounded-full transform translate-y-1"></div>
                      </h2>
                      <p className="mt-4 max-w-2xl mx-auto text-gray-600 font-sans">
                        Experience authentic Chinese cuisine with a modern twist, prepared with fresh ingredients and traditional techniques
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Main Menu Card */}
                      <div className="lg:col-span-2 bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                        <div className="flex flex-col h-full">
                          <div className="relative h-48 sm:h-64 overflow-hidden">
                            <div className="grid grid-cols-3 gap-0 h-full">
                              <div className="col-span-1 bg-[#E42423] flex items-center justify-center p-4 relative">
                                {/* Decorative pattern overlay */}
                                <div className="absolute inset-0 opacity-10">
                                  <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                                </div>
                                <div className="text-white text-center relative z-10">
                                  <h3 className="text-2xl font-serif mb-2">Full Menu</h3>
                                  <div className="w-12 h-0.5 bg-white mx-auto mb-2"></div>
                                  <p className="text-sm font-sans">Authentic Chinese Cuisine</p>
                                </div>
                              </div>
                              <div className="col-span-2 relative overflow-hidden">
                                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5">
                                  {/* Food category icons with background patterns */}
                                  <div className="bg-[#f8f0e3] flex flex-col items-center justify-center p-4 hover:bg-[#f5e9d9] transition-colors duration-300">
                                    <div className="w-12 h-12 rounded-full bg-[#E42423] bg-opacity-10 flex items-center justify-center mb-2">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#E42423]" viewBox="0 0 24 24" fill="none">
                                        {/* Dim sum / Dumplings icon */}
                                        <path d="M7 7C7 5.89543 7.89543 5 9 5H15C16.1046 5 17 5.89543 17 7V9C17 9 15 11 12 11C9 11 7 9 7 9V7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M12 11C14.5 11 16.5 9.5 16.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M12 11C9.5 11 7.5 9.5 7.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M6 13C6 13 8 15 12 15C16 15 18 13 18 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M5 17C5 17 8 19 12 19C16 19 19 17 19 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </div>
                                    <span className="text-sm font-sans text-gray-700">Appetizers</span>
                                  </div>
                                  <div className="bg-[#fdf2f2] flex flex-col items-center justify-center p-4 hover:bg-[#fbe7e7] transition-colors duration-300">
                                    <div className="w-12 h-12 rounded-full bg-[#E42423] bg-opacity-10 flex items-center justify-center mb-2">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#E42423]" viewBox="0 0 24 24" fill="none">
                                        {/* Wok with chopsticks icon */}
                                        <path d="M5 14C5 11.2386 8.13401 9 12 9C15.866 9 19 11.2386 19 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M5 14V16C5 18.7614 8.13401 21 12 21C15.866 21 19 18.7614 19 16V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M7.5 9.5L5.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M16.5 9.5L18.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M14 7L16 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M10 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </div>
                                    <span className="text-sm font-sans text-gray-700">Main Dishes</span>
                                  </div>
                                  <div className="bg-[#f0f7f4] flex flex-col items-center justify-center p-4 hover:bg-[#e6f0ea] transition-colors duration-300">
                                    <div className="w-12 h-12 rounded-full bg-[#E42423] bg-opacity-10 flex items-center justify-center mb-2">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#E42423]" viewBox="0 0 24 24" fill="none">
                                        {/* Peking duck / Chef's hat icon */}
                                        <path d="M8 14C8 14 9 18 12 18C15 18 16 14 16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M12 18V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M7 20H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M6 10C6 6.68629 8.68629 4 12 4C15.3137 4 18 6.68629 18 10C18 11.5 17.5 12.5 16.5 13.5C15.5 14.5 14 14 14 14H10C10 14 8.5 14.5 7.5 13.5C6.5 12.5 6 11.5 6 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M12 4V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </div>
                                    <span className="text-sm font-sans text-gray-700">Chef's Specials</span>
                                  </div>
                                  <div className="bg-[#f7f7fd] flex flex-col items-center justify-center p-4 hover:bg-[#efeffa] transition-colors duration-300">
                                    <div className="w-12 h-12 rounded-full bg-[#E42423] bg-opacity-10 flex items-center justify-center mb-2">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#E42423]" viewBox="0 0 24 24" fill="none">
                                        {/* Fortune cookie / Dessert icon */}
                                        <path d="M12 7C15.3137 7 18 8.34315 18 10C18 11.6569 15.3137 13 12 13C8.68629 13 6 11.6569 6 10C6 8.34315 8.68629 7 12 7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M6 10V14C6 15.6569 8.68629 17 12 17C15.3137 17 18 15.6569 18 14V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M12 17L14 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M12 17L10 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M9 5L12 7L15 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </div>
                                    <span className="text-sm font-sans text-gray-700">Desserts</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-6 flex flex-col flex-grow">
                            <div className="mb-6 flex-grow">
                              <p className="text-gray-600 font-sans">
                                Discover our extensive menu featuring traditional Chinese favorites and chef's specialties, from savory dim sum to sizzling stir-fry dishes and comforting noodle soups.
                              </p>
                              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                                <li className="flex items-center text-gray-600 font-sans">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#E42423] mr-2"></span>
                                  <span>Appetizers</span>
                                </li>
                                <li className="flex items-center text-gray-600 font-sans">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#E42423] mr-2"></span>
                                  <span>Soups</span>
                                </li>
                                <li className="flex items-center text-gray-600 font-sans">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#E42423] mr-2"></span>
                                  <span>Noodle Dishes</span>
                                </li>
                                <li className="flex items-center text-gray-600 font-sans">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#E42423] mr-2"></span>
                                  <span>Rice Dishes</span>
                                </li>
                                <li className="flex items-center text-gray-600 font-sans">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#E42423] mr-2"></span>
                                  <span>Chef's Specials</span>
                                </li>
                                <li className="flex items-center text-gray-600 font-sans">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#E42423] mr-2"></span>
                                  <span>Desserts</span>
                                </li>
                              </ul>
                            </div>
                            <Link
                              to="/menu"
                              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-sans rounded-md text-white bg-[#E42423] hover:bg-[#f45a59] transition-all duration-200 shadow-sm hover:shadow-md w-full sm:w-auto"
                            >
                              View Full Menu
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                      
                      {/* Quick Links Column */}
                      <div className="flex flex-col space-y-4">
                        {/* Popular Dishes Card */}
                        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                          <div className="p-5">
                            <div className="flex items-center mb-3">
                              <div className="w-10 h-10 bg-[#E42423] bg-opacity-10 rounded-full flex items-center justify-center mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#E42423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                              </div>
                              <h3 className="text-lg font-serif text-gray-900">Quick Order</h3>
                            </div>
                            <p className="text-gray-600 font-sans text-sm mb-3">Try our customer favorites, prepared with authentic recipes</p>
                            <Link to="/menu" className="text-[#E42423] font-sans text-sm hover:underline inline-flex items-center">
                              View popular dishes
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                        
                        {/* Quick Order Card */}
                        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                          <div className="p-5">
                            <div className="flex items-center mb-3">
                              <div className="w-10 h-10 bg-[#E42423] bg-opacity-10 rounded-full flex items-center justify-center mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#E42423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <h2 className="text-2xl font-serif text-gray-800 mb-6 text-center">Discover Our Menu</h2>
                            </div>
                            <p className="text-gray-600 font-sans text-sm mb-3">Place your order in minutes with our streamlined process</p>
                            <Link to="/menu" className="text-[#E42423] font-sans text-sm hover:underline inline-flex items-center">
                              Start ordering
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                        
                        {/* Special Items Card */}
                        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                          <div className="p-5">
                            <div className="flex items-center mb-3">
                              <div className="w-10 h-10 bg-[#E42423] bg-opacity-10 rounded-full flex items-center justify-center mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#E42423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                              </div>
                              <h3 className="text-lg font-serif text-gray-900">Seasonal Specials</h3>
                            </div>
                            <p className="text-gray-600 font-sans text-sm mb-3">Discover our limited-time seasonal offerings and chef's creations</p>
                            <Link to="/menu" className="text-[#E42423] font-sans text-sm hover:underline inline-flex items-center">
                              See specials
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          }
        />

        {/* /menu => the MenuPage */}
        <Route path="menu" element={<MenuPage />} />
        
        {/* /merchandise => the MerchandisePage */}
        <Route path="merchandise" element={<MerchandisePage />} />

        {/* /cart => Cart */}
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="order-confirmation" element={<OrderConfirmation />} />

        {/* Admin only => /admin */}
        <Route
          path="admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Auth */}
        <Route path="login" element={
          <AnonymousRoute>
            <LoginForm />
          </AnonymousRoute>
        } />
        <Route path="signup" element={
          <AnonymousRoute>
            <SignUpForm />
          </AnonymousRoute>
        } />
        <Route path="forgot-password" element={
          <AnonymousRoute>
            <ForgotPasswordForm />
          </AnonymousRoute>
        } />
        <Route path="reset-password" element={<ResetPasswordForm />} />

        {/* Phone verification */}
        <Route path="verify-phone" element={
          <PhoneVerificationRoute>
            <VerifyPhonePage />
          </PhoneVerificationRoute>
        } />

        {/* Protected user pages => /orders, /profile */}
        <Route
          path="orders"
          element={
            <ProtectedRoute>
              <OrderHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* If unknown => redirect to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
