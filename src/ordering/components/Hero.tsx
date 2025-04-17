// src/ordering/components/Hero.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ReservationModal } from './reservation/ReservationModal';
import { config } from '../../shared/config';

export function Hero() {
  const [showReservationModal, setShowReservationModal] = useState(false);

  return (
    <>
      <div className="relative w-full h-[60vh] min-h-[400px] overflow-hidden">
        {/* Hero Image */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/hero.png"
            alt="House of Chin Fe restaurant"
            className="w-full h-full object-cover object-center"
            style={{ objectPosition: '50% 40%' }} /* This helps maintain focus on the food in the image */
          />
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 font-serif">
            Welcome to House of Chin Fe
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl font-sans">
            Guam's Authentic Chinese Cuisine Since 1962
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/menu"
              className="px-8 py-3 bg-house-of-chin-red hover:bg-house-of-chin-red-light text-white font-semibold rounded-md transition-colors font-sans"
            >
              Order Online
            </Link>
            <a
              href={`tel:${config.phoneNumber || '+16714726135'}`}
              className="px-8 py-3 bg-white text-house-of-chin-red hover:bg-gray-100 font-semibold rounded-md transition-colors font-sans"
            >
              Call Us
            </a>
          </div>
          
          {/* Restaurant Info */}
          <div className="mt-8 flex flex-col sm:flex-row gap-6 text-sm md:text-base">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>620 N Marine Corps Dr, Hagåtña, Guam</span>
            </div>
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Open 6:30am - 9:00pm Every Day</span>
            </div>
          </div>
          
          {/* Social Media Links */}
          <div className="mt-6 flex gap-4">
            <a 
              href={config.facebookUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white hover:text-house-of-chin-red-light transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
              </svg>
            </a>
            <a 
              href={config.instagramUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white hover:text-house-of-chin-red-light transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Reservation Modal - hidden for House of Chin Fe */}
      {showReservationModal && (
        <ReservationModal
          isOpen={showReservationModal}
          onClose={() => setShowReservationModal(false)}
        />
      )}
    </>
  );
}
