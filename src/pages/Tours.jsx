import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Filter, MapPin, Users, Star, Calendar, Clock, Grid, List, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import BookingModal from '../components/BookingModal';
import DataService, { SERVER_URL } from '../components/services/DataService';
import { useApi } from '../hooks/useApi.jsx';

const Tours = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
  });

  const [filters, setFilters] = useState({
    search: '',
    destination: '',
    minPrice: '',
    maxPrice: '',
    duration: '',
    difficulty: '',
    maxGroupSize: ''
  });

  const queryParams = {
    page: pagination.page,
    limit: pagination.limit,
    ...Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '')
    )
  };

  const { data: toursResponse, loading, error, refetch: fetchTours } = useApi(() => DataService.fetchAllTours(queryParams), [pagination.page, JSON.stringify(filters)]);

  const tours = toursResponse?.data || [];
  const toursPagination = toursResponse?.pagination || { total: 0, totalPages: 0 };

  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const state = location.state;
    if (state) {
      if (state.destination) {
        setFilters(prev => ({ ...prev, destination: state.destination }));
      }
    }
  }, [location.state]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setPagination(prev => ({...prev, page: 1}));
    fetchTours();
    setShowFilters(false);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: '', destination: '', minPrice: '', maxPrice: '',
      duration: '', difficulty: '', maxGroupSize: ''
    };
    setFilters(clearedFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= toursPagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBookTour = (tour) => {
    if (tour.isAvailable) {
      navigate(`/tours/${tour._id}`);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(price);
  };
  
  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'challenging': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderTourCard = (tour) => (
    <div key={tour._id} className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 ${
      viewMode === 'list' ? 'flex' : ''
    }`}>
      <div className={`${viewMode === 'list' ? 'w-80 h-48' : 'h-48'} bg-gray-200 overflow-hidden relative`}>
        {tour.images && tour.images.length > 0 ? (
          <img
            src={`${SERVER_URL}${tour.images[0]}`}
            alt={tour.title || tour.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300">
            <MapPin className="w-12 h-12 text-gray-500" />
          </div>
        )}
        
        {!tour.isAvailable && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-red-600 text-white px-3 py-1 rounded font-semibold">
              Not Available
            </div>
          </div>
        )}
      </div>
      
      <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-medium px-2 py-1 rounded ${getDifficultyColor(tour.difficulty)}`}>
            {tour.difficulty || 'Easy'}
          </span>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span className="text-sm text-gray-600">
              {tour.ratings?.average || 'N/A'} ({tour.ratings?.count || 0})
            </span>
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {tour.title || tour.name}
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>{tour.destination}</span></div>
          <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>{tour.duration}</span></div>
          <div className="flex items-center gap-2"><Users className="w-4 h-4" /><span>Max {tour.maxGroupSize} people</span></div>
          <div className="flex items-center gap-2"><Award className="w-4 h-4" /><span className="capitalize">{tour.difficulty || 'Easy'}</span></div>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-green-600">{formatPrice(tour.price)}</span>
            <span className="text-gray-500">/person</span>
          </div>
          <button
              onClick={() => handleBookTour(tour)}
              disabled={!tour.isAvailable}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold"
          >
              {tour.isAvailable ? 'Book Now' : 'Unavailable'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="text-center py-16">
        <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-gray-900 mb-4">No Tours Available</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {Object.values(filters).some(value => value !== '') 
            ? 'No tours match your current filters. Try adjusting your search criteria.'
            : 'Tour packages will appear here once added by our admin team.'
            }
        </p>
    </div>
  );

  const renderPagination = () => (
    <div className="flex items-center justify-center space-x-2 mt-8">
        <button
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {[...Array(toursPagination.totalPages).keys()].map(page => (
          <button
            key={page + 1}
            onClick={() => handlePageChange(page + 1)}
            className={`px-4 py-2 rounded-lg font-medium ${
              page + 1 === pagination.page
                ? 'bg-green-600 text-white'
                : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {page + 1}
          </button>
        ))}

        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === toursPagination.totalPages}
          className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tour Packages</h1>
              <p className="text-gray-600 mt-1">
                {loading ? 'Loading tours...' : `${toursPagination.total} amazing destinations available`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm text-green-600' : 'text-gray-600'}`}><Grid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm text-green-600' : 'text-gray-600'}`}><List className="w-4 h-4" /></button>
              </div>
              <button onClick={() => setShowFilters(!showFilters)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"><Filter className="w-4 h-4" />Filters</button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showFilters && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Tours</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input type="text" placeholder="Search" value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                    <input type="text" placeholder="Destination" value={filters.destination} onChange={e => handleFilterChange('destination', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                    <input type="number" placeholder="Min Price" value={filters.minPrice} onChange={e => handleFilterChange('minPrice', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                    <input type="number" placeholder="Max Price" value={filters.maxPrice} onChange={e => handleFilterChange('maxPrice', e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={clearFilters} className="px-4 py-2 text-gray-700">Clear</button>
                    <button onClick={applyFilters} className="px-4 py-2 bg-green-600 text-white rounded-lg">Apply</button>
                </div>
            </div>
        )}
        {loading ? (
          <div className="text-center py-16"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto"></div></div>
        ) : error ? (
            <div className="text-center py-16 text-red-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                <p>{error.message}</p>
                <button onClick={fetchTours} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg"><RefreshCw className="w-4 h-4 inline-block mr-2" />Retry</button>
            </div>
        ) : tours.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}`}>
              {tours.map(renderTourCard)}
            </div>
            {renderPagination()}
          </>
        )}
      </div>
    </div>
  );
};

export default Tours;