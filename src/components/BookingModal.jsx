// src/components/BookingModal.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Users, Upload, CheckCircle } from 'lucide-react';
import DataService, { SERVER_URL } from './services/DataService.jsx';
import CalendarBooking from './CalendarBooking.jsx';
import DropoffMap from './DropoffMap.jsx';
import { useAuth } from './Login.jsx';

const BookingModal = ({ isOpen, onClose, item, itemType }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    startDate: '',
    time: '',
    numberOfDays: 1,
    numberOfGuests: 1,
    specialRequests: '',
    agreedToTerms: false,
    paymentProof: null,
    pickupLocation: '',
    dropoffLocation: '',
    dropoffCoordinates: null,
    deliveryMethod: 'pickup',
    paymentReference: '',
    amountPaid: ''
  });

  const [bookingTerms, setBookingTerms] = useState('');
  const [paymentQR, setPaymentQR] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [calculatedEndDate, setCalculatedEndDate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const fetchContentAndSetDefaults = async () => {
      if (isOpen) {
        const initialState = {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            phone: user?.phone || '',
            startDate: '',
            time: '',
            numberOfDays: 1,
            numberOfGuests: 1,
            specialRequests: '',
            agreedToTerms: false,
            paymentProof: null,
            pickupLocation: '',
            dropoffLocation: '',
            dropoffCoordinates: null,
            deliveryMethod: 'pickup',
            paymentReference: '',
            amountPaid: ''
        };

        if (itemType === 'tour' && item) {
            initialState.startDate = item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '';
            initialState.time = '09:00';
        }
        
        setFormData(initialState);
        setTotalPrice(0);
        setCalculatedEndDate(null);
        setSubmitError('');
        setSubmitSuccess(false);

        try {
          const [termsRes, qrRes] = await Promise.all([
            DataService.fetchContent('bookingTerms'),
            DataService.fetchContent('paymentQR')
          ]);
          if (termsRes.success) setBookingTerms(termsRes.data.content);
          if (qrRes.success) setPaymentQR(qrRes.data.content);
        } catch (error) {
          console.error("Failed to fetch modal content:", error);
        }
      }
    };
    fetchContentAndSetDefaults();
  }, [isOpen, item, itemType, user]);

  useEffect(() => {
    if (itemType === 'car' && formData.startDate && formData.numberOfDays > 0) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + parseInt(formData.numberOfDays, 10));
      setCalculatedEndDate(endDate);
      setTotalPrice(formData.numberOfDays * (item.pricePerDay || 0));
    } else if (itemType === 'tour') {
      setTotalPrice(formData.numberOfGuests * (item.price || 0));
      setCalculatedEndDate(item.endDate ? new Date(item.endDate) : null);
    }
  }, [formData.startDate, formData.numberOfDays, formData.numberOfGuests, item, itemType]);
  
  const handleFileChange = (e) => setFormData(prev => ({ ...prev, paymentProof: e.target.files[0] }));
  
  const handleLocationSelect = useCallback((location) => {
    setFormData(prev => ({ ...prev, dropoffLocation: location.address, dropoffCoordinates: { lat: location.latitude, lng: location.longitude } }));
  }, []);
  
  const handleDateSelect = useCallback((date) => {
    setFormData(prev => ({ ...prev, startDate: date }));
  }, []);

  const combineDateAndTime = (date, time) => {
    if (!date || !time) return date;
    return new Date(`${date}T${time}`).toISOString();
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    
    // Validation: Personal Information
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      return setSubmitError('Please fill in all your personal information.');
    }
    
    // Validation: Car-specific
    if (itemType === 'car') {
      if (!formData.startDate || !formData.time || formData.numberOfDays < 1) {
        return setSubmitError('Please select a start date, time, and number of days.');
      }
      // --- FIX: Added validation for pickup location ---
      if (formData.deliveryMethod === 'pickup' && !formData.pickupLocation) {
        return setSubmitError('Please select a pickup location.');
      }
      if (formData.deliveryMethod === 'dropoff' && !formData.dropoffLocation) {
        return setSubmitError('Please select a drop-off location on the map.');
      }
    }
    
    // Validation: Tour-specific
    if (itemType === 'tour') {
      if (!formData.startDate) {
        return setSubmitError('Tour date is missing. Please contact support.');
      }
      if (!item.endDate) {
        return setSubmitError('Tour end date is missing. Please contact support.');
      }
    }
    
    // Validation: Payment
    if (!formData.paymentProof) {
      return setSubmitError('Please upload your proof of payment.');
    }
    if (!formData.paymentReference) {
      return setSubmitError('Please enter your payment reference number.');
    }
    if (!formData.amountPaid) {
      return setSubmitError('Please enter the amount you paid.');
    }
    if (!formData.agreedToTerms) {
      return setSubmitError('You must agree to the terms and conditions to proceed.');
    }

    setSubmitting(true);

    try {
      const bookingData = new FormData();
      
      const fullStartDate = combineDateAndTime(formData.startDate, formData.time);
      const fullEndDate = calculatedEndDate ? calculatedEndDate.toISOString() : fullStartDate;

      bookingData.append('startDate', fullStartDate);
      bookingData.append('endDate', fullEndDate);
      bookingData.append('firstName', formData.firstName);
      bookingData.append('lastName', formData.lastName);
      bookingData.append('email', formData.email);
      bookingData.append('phone', formData.phone);
      bookingData.append('numberOfGuests', formData.numberOfGuests);
      bookingData.append('agreedToTerms', formData.agreedToTerms);
      bookingData.append('paymentReference', formData.paymentReference);
      bookingData.append('amountPaid', formData.amountPaid);
      bookingData.append('itemId', item._id);
      bookingData.append('itemType', itemType);
      bookingData.append('totalPrice', totalPrice);
      bookingData.append('itemName', itemType === 'car' ? `${item.brand} ${item.model}` : item.title);
      
      if (formData.paymentProof) {
        bookingData.append('paymentProof', formData.paymentProof);
      }
      if (formData.specialRequests) {
        bookingData.append('specialRequests', formData.specialRequests);
      }
      if (formData.deliveryMethod) {
        bookingData.append('deliveryMethod', formData.deliveryMethod);
      }
      if (formData.pickupLocation) {
        bookingData.append('pickupLocation', formData.pickupLocation);
      }
      if (formData.dropoffLocation) {
        bookingData.append('dropoffLocation', formData.dropoffLocation);
      }
      if (formData.dropoffCoordinates) {
        bookingData.append('dropoffCoordinates', JSON.stringify(formData.dropoffCoordinates));
      }
      if (itemType === 'car' && formData.numberOfDays) {
        bookingData.append('numberOfDays', formData.numberOfDays);
      }

      const result = await DataService.createBooking(bookingData);
      
      if (result.success) {
        setSubmitSuccess(true);
      } else {
        throw new Error(result.message || 'Booking failed.');
      }
    } catch (error) {
      console.error('Booking submission error:', error);
      setSubmitError(error.message || 'An error occurred while submitting your booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(price);
  
  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
  };

  if (!isOpen) return null;
  
  const qrCodeSrc = paymentQR 
    ? (paymentQR.startsWith('http') ? paymentQR : `${SERVER_URL}${paymentQR.startsWith('/') ? '' : '/'}${paymentQR}`)
    : '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Book Your Trip</h2>
              <p className="text-gray-600">{itemType === 'car' ? `${item.brand} ${item.model}` : item.title}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
          </div>
          
          {submitSuccess ? (
            <div className="text-center p-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold">Booking Submitted!</h3>
              <p className="text-gray-600 mt-2">You will receive a confirmation email shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {submitError && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">{submitError}</div>}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {/* User Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3">Your Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label><input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full p-2 border rounded-md"/></div>
                       <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label><input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full p-2 border rounded-md"/></div>
                       <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full p-2 border rounded-md"/></div>
                       <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label><input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full p-2 border rounded-md"/></div>
                    </div>
                  </div>
                  
                  {itemType === 'tour' && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-3">Booking Details</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Guests *</label>
                        <select value={formData.numberOfGuests} onChange={(e) => setFormData({ ...formData, numberOfGuests: parseInt(e.target.value) })} className="w-full p-2 border rounded-md">
                          {Array.from({ length: item.maxGroupSize || 10 }, (_, i) => (<option key={i + 1} value={i + 1}>{i + 1} {i > 0 ? 'guests' : 'guest'}</option>))}
                        </select>
                      </div>
                       <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
                        <h3 className="font-semibold text-blue-800">Fixed Tour Schedule</h3>
                        <p className="text-sm text-blue-700">{new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}

                  {itemType === 'car' && (
                    <>
                      <CalendarBooking
                        serviceId={item._id}
                        onDateSelect={handleDateSelect}
                      />
                      <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="font-semibold mb-3">Rental Details</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Days *</label>
                                  <input type="number" required min="1" value={formData.numberOfDays} onChange={(e) => setFormData(prev => ({ ...prev, numberOfDays: parseInt(e.target.value) || 1 }))} className="w-full p-2 border rounded-md"/>
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup/Drop-off Time *</label>
                                  <input type="time" required value={formData.time} onChange={(e) => setFormData(prev => ({...prev, time: e.target.value}))} className="w-full p-2 border rounded-md"/>
                              </div>
                          </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-3">Delivery Method</h3>
                        <div className="flex gap-4 mb-4">
                          <label className="flex items-center"><input type="radio" name="deliveryMethod" value="pickup" checked={formData.deliveryMethod === 'pickup'} onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value })}/><span className="ml-2">Pickup</span></label>
                          <label className="flex items-center"><input type="radio" name="deliveryMethod" value="dropoff" checked={formData.deliveryMethod === 'dropoff'} onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value })}/><span className="ml-2">Drop-off</span></label>
                        </div>
                        {formData.deliveryMethod === 'pickup' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
                            <select value={formData.pickupLocation} onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })} className="w-full p-2 border rounded-md">
                              <option value="">Select a location</option>
                              {item.pickupLocations?.map((location, index) => (<option key={index} value={location}>{location}</option>))}
                            </select>
                          </div>
                        ) : (
                          <DropoffMap onLocationSelect={handleLocationSelect} />
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Payment */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold mb-3 text-blue-800">Payment Details</h3>
                    <div className="flex flex-col items-center">
                        {qrCodeSrc ? <img src={qrCodeSrc} alt="Payment QR Code" className="w-48 h-48 object-contain mb-4 border rounded-md" /> : <p className="text-sm text-gray-500 mb-4">QR code not available.</p>}
                        <div className="w-full space-y-4">
                          <input type="text" placeholder="Payment Reference Number *" required value={formData.paymentReference} onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })} className="w-full p-2 border rounded-md"/>
                          <input type="number" placeholder="Amount Paid *" required value={formData.amountPaid} onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })} className="w-full p-2 border rounded-md"/>
                          <label htmlFor="paymentProof" className="w-full text-center cursor-pointer bg-white border-2 border-dashed rounded-lg p-4 hover:bg-gray-50"><Upload className="w-8 h-8 mx-auto text-gray-400 mb-2"/><span className="text-sm font-medium text-gray-700">{formData.paymentProof ? formData.paymentProof.name : 'Upload Payment Proof *'}</span><input id="paymentProof" type="file" required onChange={handleFileChange} className="hidden"/></label>
                        </div>
                    </div>
                  </div>
                  
                  {/* Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
                    <div className="space-y-3">
                      {itemType === 'car' ? (
                        <>
                          <div className="flex justify-between text-sm"><span className="text-gray-600">Daily Rate:</span><span>{formatPrice(item.pricePerDay || 0)}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-gray-600">Rental Duration:</span><span>{formData.numberOfDays > 0 ? `${formData.numberOfDays} ${formData.numberOfDays === 1 ? 'day' : 'days'}` : '...'}</span></div>
                          {formData.startDate && <div className="flex justify-between text-sm"><span className="text-gray-600">Start Date:</span><span>{new Date(formData.startDate).toLocaleDateString()}</span></div>}
                          {calculatedEndDate && <div className="flex justify-between text-sm"><span className="text-gray-600">Return Date:</span><span>{calculatedEndDate.toLocaleDateString()}</span></div>}
                          {formData.time && <div className="flex justify-between text-sm"><span className="text-gray-600">Pickup/Drop-off Time:</span><span>{formatTime(formData.time)}</span></div>}
                          {formData.deliveryMethod === 'pickup' && formData.pickupLocation && <div className="flex justify-between text-sm"><span className="text-gray-600">Pickup Location:</span><span className="text-right truncate max-w-[150px]">{formData.pickupLocation}</span></div>}
                          {formData.deliveryMethod === 'dropoff' && formData.dropoffLocation && <div className="flex justify-between text-sm"><span className="text-gray-600">Drop-off Location:</span><span className="text-right truncate max-w-[150px]">{formData.dropoffLocation}</span></div>}
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between text-sm"><span className="text-gray-600">Price per Person:</span><span>{formatPrice(item.price || 0)}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-gray-600">Number of Guests:</span><span>{formData.numberOfGuests}</span></div>
                        </>
                      )}
                      <hr className="border-gray-200" />
                      <div className="flex justify-between items-center"><span className="text-lg font-semibold text-gray-900">Total Amount:</span><span className="text-2xl font-bold text-blue-600">{formatPrice(totalPrice)}</span></div>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="bg-gray-50 p-4 rounded-lg max-h-32 overflow-y-auto border">
                    <h3 className="font-semibold mb-2 text-sm">Terms and Conditions</h3>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap">{bookingTerms || 'Terms and conditions could not be loaded.'}</p>
                  </div>
                  <div className="flex items-start"><input type="checkbox" id="terms" checked={formData.agreedToTerms} onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })} className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"/><label htmlFor="terms" className="ml-2 block text-sm text-gray-900">I have read and agree to the terms and conditions.</label></div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-lg text-gray-700 hover:bg-gray-300">Cancel</button>
                <button type="submit" disabled={submitting || !formData.agreedToTerms} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">{submitting ? 'Submitting...' : 'Submit Booking'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;