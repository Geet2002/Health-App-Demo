import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { BloodRequestSkeleton } from '../components/Skeletons';
import PageHeader from '../components/PageHeader';
import { Droplet, MapPin, Clock, PlusCircle, CheckCircle, User, Search, AlertCircle, Hash, Send, X, Locate, MapIcon } from 'lucide-react';
import GoogleMap, { loadGoogleMaps } from '../components/GoogleMap';
import { socket } from '../socket';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function BloodDonation() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patient_name: '',
    blood_group: 'A+',
    units_required: 1,
    location: '',
    location_lat: null,
    location_lng: null,
    urgency: 'high'
  });

  const [position, setPosition] = useState(null);
  const [deviceLocation, setDeviceLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  
  const mapsApiKey = import.meta.env.VITE_MAPJS_AIP_KEY || import.meta.env.VITE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Get device location on mount for map centering
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDeviceLocation(p);
      }, () => {});
    }
  }, []);

  const resetToCurrentLocation = () => {
    if (navigator.geolocation) {
      setGeocoding(true);
      setGeocodeError('');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPosition(p);
          setDeviceLocation(p);
          setShowMap(true);
          
          if (!formData.location) {
            loadGoogleMaps(mapsApiKey).then((google) => {
              const geocoder = new google.maps.Geocoder();
              geocoder.geocode({ location: p }, (results, status) => {
                if (status === 'OK' && results[0]) {
                  setFormData(prev => ({ ...prev, location: results[0].formatted_address, location_lat: p.lat, location_lng: p.lng }));
                }
                setGeocoding(false);
              });
            }).catch(() => setGeocoding(false));
          } else {
            setFormData(prev => ({ ...prev, location_lat: p.lat, location_lng: p.lng }));
            setGeocoding(false);
          }
        },
        (error) => {
          setGeocodeError('Could not get current location.');
          setGeocoding(false);
        }
      );
    } else {
      setGeocodeError('Geolocation is not supported by your browser.');
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/blood-requests`, formData);
      setIsModalOpen(false);
      setFormData({
        patient_name: '',
        blood_group: 'A+',
        units_required: 1,
        location: '',
        location_lat: null,
        location_lng: null,
        urgency: 'high'
      });
      setPosition(null);
      setShowMap(false);
      setGeocodeError('');
      toast.success('Blood request posted successfully!');
      fetchRequests();
    } catch (error) {
      console.error('Error creating blood request:', error);
      toast.error('Failed to post blood request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API_URL}/blood-requests?search=${encodeURIComponent(searchQuery)}`);
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching blood requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [searchQuery]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchRequests();
    };
    socket.on('blood_request_added', handleUpdate);
    socket.on('blood_request_updated', handleUpdate);
    return () => {
      socket.off('blood_request_added', handleUpdate);
      socket.off('blood_request_updated', handleUpdate);
    };
  }, [searchQuery]);



  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-32 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8">
        <div className="mb-4 sm:mb-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 mt-2 animate-pulse hidden sm:block"></div>
        </div>
        <BloodRequestSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-32 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8">
      <PageHeader 
        title="Blood Requests"
        description="Help save a life by donating blood."
        icon={Droplet}
        bgColor="bg-red-100/20"
        actionButton={
          !user?.is_admin ? (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center p-2.5 sm:px-4 sm:py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-xl transition-colors shrink-0 shadow-sm" 
              title="Request Blood"
            >
              <PlusCircle className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">Request</span>
            </button>
          ) : null
        }
      >
        <div className="relative z-10 mt-2">
          <Search className="w-5 h-5 absolute left-4 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search requests by patient, blood group, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none shadow-sm transition-all text-gray-700"
          />
        </div>
      </PageHeader>

      {requests.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Droplet className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No active blood requests</h3>
          <p className="text-gray-500">There are currently no blood requests in the system.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {requests.map(request => (
            <Link to={`${user ? `/blood-donation/${request.id}` : '/login'}`} key={request.id} className={`bg-white rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all border overflow-hidden flex flex-col ${request.status === 'fulfilled' ? 'opacity-60 border-gray-200' : 'border-red-100'} block`}>
              <div className={`px-4 py-3 border-b ${request.status === 'fulfilled' ? 'bg-gray-50 border-gray-200' : 'bg-red-50/50 border-red-50'} flex justify-between items-start`}>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-gray-900 leading-tight">{request.patient_name}</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex flex-col items-end space-y-1.5 shrink-0">
                  <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-sm font-black bg-red-100 text-red-700 border border-red-200">
                    {request.blood_group}
                  </span>
                  {request.status !== 'fulfilled' && (
                    <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full border ${getUrgencyColor(request.urgency)}`}>
                      {request.urgency}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="px-4 py-3 flex-grow">
                <div className="space-y-1.5 text-[13px] text-gray-600">
                  <div className="flex items-start">
                    <Droplet className="w-3.5 h-3.5 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                    <span><strong>{request.units_required}</strong> Units Required</span>
                  </div>
                  <div className="flex items-start">
                    <MapPin className="w-3.5 h-3.5 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                    <span className="line-clamp-2">{request.location}</span>
                  </div>
                  <div className="flex items-start">
                    <User className="w-3.5 h-3.5 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                    <span>Requested by {request.requester_name}</span>
                  </div>
                </div>
              </div>

              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center gap-3">
                {request.status === 'fulfilled' ? (
                  <span className="inline-flex items-center text-[13px] font-semibold text-green-600 shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Fulfilled
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[13px] font-semibold text-yellow-600 shrink-0">
                    <Clock className="w-3.5 h-3.5 mr-1" /> Pending
                  </span>
                )}
                <span className={`text-[13px] font-bold bg-red-100 text-red-700 px-3 py-1.5 rounded-lg shrink-0 text-center`}>
                  {user ? (user.id === request.user_id ? 'Manage' : 'View') : 'View'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Request Blood Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative mt-8 mb-8 sm:mt-12 sm:mb-12 animate-scale-up">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-6 sm:p-8">
              <div className="flex items-center mb-6 sm:mb-8">
                <div className="bg-red-50 border border-red-100 p-3.5 rounded-full mr-4 shadow-sm">
                  <Droplet className="w-7 h-7 text-red-500" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Request Blood</h2>
                  <p className="text-gray-500 text-sm mt-1">Submit an urgent request for blood donation.</p>
                </div>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2">
                    <label htmlFor="patient_name" className="block text-sm font-bold text-gray-700 mb-1 flex items-center">
                      <User className="w-4 h-4 mr-1 text-gray-400" /> Patient Name
                    </label>
                    <input
                      id="patient_name"
                      name="patient_name"
                      required
                      type="text"
                      placeholder="Full name of the patient"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent focus:ring-red-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 font-medium"
                      value={formData.patient_name}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="blood_group" className="block text-sm font-bold text-gray-700 mb-1 flex items-center">
                      <Droplet className="w-4 h-4 mr-1 text-red-500" /> Blood Group
                    </label>
                    <div className="relative">
                      <select
                        id="blood_group"
                        name="blood_group"
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent focus:ring-red-500 transition-colors bg-gray-50 focus:bg-white appearance-none text-gray-900 font-medium cursor-pointer"
                        value={formData.blood_group}
                        onChange={handleFormChange}
                      >
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="units_required" className="block text-sm font-bold text-gray-700 mb-1 flex items-center">
                      <Hash className="w-4 h-4 mr-1 text-gray-400" /> Units Required
                    </label>
                    <input
                      id="units_required"
                      name="units_required"
                      required
                      type="number"
                      min="1"
                      max="50"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent focus:ring-red-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 font-medium"
                      value={formData.units_required}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-2 sm:mb-1">
                      <label htmlFor="location" className="block text-sm font-bold text-gray-700 flex items-center shrink-0">
                        <MapPin className="w-4 h-4 mr-1 text-gray-400 shrink-0" /> Exact Location (Hospital Name & Area)
                      </label>
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                        <button
                          type="button"
                          onClick={resetToCurrentLocation}
                          disabled={geocoding}
                          className="flex items-center justify-center text-[11px] sm:text-xs font-semibold px-2.5 py-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50 flex-1 sm:flex-none border border-red-100"
                        >
                          <Locate className={`w-3.5 h-3.5 mr-1.5 ${geocoding ? 'animate-spin' : ''}`} />
                          {geocoding ? 'Locating...' : 'Current Location'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowMap(!showMap)}
                          className="flex items-center justify-center text-[11px] sm:text-xs font-semibold px-2.5 py-1.5 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex-1 sm:flex-none border border-gray-200"
                        >
                          <MapIcon className="w-3.5 h-3.5 mr-1.5" />
                          {showMap ? 'Hide Map' : 'Show Map'}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!formData.location) return setGeocodeError('Enter a location to find');
                            setGeocodeError('');
                            setGeocoding(true);
                            
                            if (!mapsApiKey) {
                              setGeocodeError('Google Maps API key is missing.');
                              setGeocoding(false);
                              return;
                            }

                            try {
                              const google = await loadGoogleMaps(mapsApiKey);
                              const geocoder = new google.maps.Geocoder();
                              geocoder.geocode({ address: formData.location }, async (results, status) => {
                                if (status === 'OK' && results[0]) {
                                  const lat = results[0].geometry.location.lat();
                                  const lng = results[0].geometry.location.lng();
                                  setPosition({ lat, lng });
                                  setFormData(prev => ({ ...prev, location_lat: lat, location_lng: lng }));
                                  setShowMap(true);
                                  setGeocoding(false);
                                } else {
                                  setGeocodeError('Location not found.');
                                  setGeocoding(false);
                                }
                              });
                            } catch (err) {
                              setGeocodeError('Failed to load Google Maps or find location.');
                              setGeocoding(false);
                            }
                          }}
                          className="flex items-center justify-center text-[11px] sm:text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition-colors border border-green-100 flex-1 sm:flex-none"
                        >
                          {geocoding ? 'Finding...' : 'Find'}
                        </button>
                      </div>
                    </div>
                    
                    <input
                      id="location"
                      name="location"
                      required
                      type="text"
                      placeholder="e.g. City Hospital, Downtown"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent focus:ring-red-500 transition-colors bg-gray-50 focus:bg-white text-gray-900 font-medium mb-2"
                      value={formData.location}
                      onChange={handleFormChange}
                    />
                    
                    {geocodeError && <p className="mt-1 mb-2 text-xs text-red-600">{geocodeError}</p>}
                    
                    {showMap && (
                      <div className="h-64 rounded-xl overflow-hidden border border-gray-300 relative z-0">
                        <GoogleMap 
                          center={position || deviceLocation || { lat: 20.5937, lng: 78.9629 }} 
                          zoom={position ? 15 : (deviceLocation ? 14 : 5)} 
                          markerPosition={position}
                          onMapClick={(coords) => {
                            setPosition(coords);
                            // Reverse geocode to fill location name
                            loadGoogleMaps(mapsApiKey).then((google) => {
                              const geocoder = new google.maps.Geocoder();
                              geocoder.geocode({ location: coords }, (results, status) => {
                                if (status === 'OK' && results[0]) {
                                  setFormData(prev => ({ ...prev, location: results[0].formatted_address, location_lat: coords.lat, location_lng: coords.lng }));
                                } else {
                                  setFormData(prev => ({ ...prev, location_lat: coords.lat, location_lng: coords.lng }));
                                }
                              });
                            }).catch(() => {
                              setFormData(prev => ({ ...prev, location_lat: coords.lat, location_lng: coords.lng }));
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="urgency" className="block text-sm font-bold text-gray-700 mb-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1 text-orange-500" /> Urgency Level
                    </label>
                    <div className="relative">
                      <select
                        id="urgency"
                        name="urgency"
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:border-transparent focus:ring-red-500 transition-colors bg-gray-50 focus:bg-white appearance-none text-gray-900 font-medium cursor-pointer"
                        value={formData.urgency}
                        onChange={handleFormChange}
                      >
                        <option value="low">Low (Next few days)</option>
                        <option value="medium">Medium (Within 24 hours)</option>
                        <option value="high">High (Immediate)</option>
                        <option value="critical">Critical (Life-threatening)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 sm:pt-8 border-t border-gray-100 flex justify-end items-center mt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 sm:px-6 sm:py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-transparent rounded-xl mr-2 sm:mr-3 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center px-6 py-2 sm:py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all bg-red-600 hover:bg-red-500 text-white focus:ring-red-500 focus:ring-offset-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {isSubmitting ? 'Submitting...' : 'Post Request'}
                    {!isSubmitting && <Send className="w-4 h-4 ml-1.5" />}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
