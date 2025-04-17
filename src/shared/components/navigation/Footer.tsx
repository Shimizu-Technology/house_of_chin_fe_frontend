// src/shared/components/navigation/Footer.tsx

import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { useRestaurantStore } from '../../store/restaurantStore';
import { formatPhoneNumber } from '../../utils/formatters';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { restaurant } = useRestaurantStore();
  
  // No need to fetch restaurant data here as it's already being handled by RestaurantProvider
  // This prevents duplicate API calls

  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo and description */}
          <div className="col-span-1 md:col-span-2">
            <h2 className="text-2xl font-serif text-[#E42423] mb-4">House of Chin Fe</h2>
            <p className="text-gray-300 mb-4 font-sans">
              Authentic Chinese cuisine served in a welcoming atmosphere. Bringing the
              flavors of traditional Chinese cooking to Guam since 1962.
            </p>
            <div className="flex space-x-4">
              {restaurant?.facebook_url && (
                <a
                  href={restaurant.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-[#E42423]"
                >
                  <Facebook />
                </a>
              )}
              {restaurant?.instagram_url && (
                <a
                  href={restaurant.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-[#E42423]"
                >
                  <Instagram />
                </a>
              )}
              {restaurant?.twitter_url && (
                <a
                  href={restaurant.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-[#E42423]"
                >
                  <Twitter />
                </a>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-lg font-serif mb-4">Quick Links</h3>
            <ul className="space-y-3 font-sans">
              <li>
                <Link to="/" className="text-gray-300 hover:text-[#E42423] transition-colors duration-200">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/menu" className="text-gray-300 hover:text-[#E42423] transition-colors duration-200">
                  Menu
                </Link>
              </li>
              <li>
                <Link to="/reservations" className="text-gray-300 hover:text-[#E42423] transition-colors duration-200">
                  Reservations
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-gray-300 hover:text-[#E42423] transition-colors duration-200">
                  Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact info */}
          <div>
            <h3 className="text-lg font-serif mb-4">Contact Us</h3>
            <address className="not-italic text-gray-300 space-y-3 font-sans">
              <p>{restaurant?.address || "620 N Marine Corps Dr, Hagåtña, 96910, Guam"}</p>
              <p>Phone: {formatPhoneNumber(restaurant?.phone_number) || "+1 (671) 472-6135"}</p>
              <p>Email: {restaurant?.contact_email || "info@houseofchinfe.com"}</p>
            </address>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p className="font-sans">&copy; {currentYear} House of Chin Fe. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
