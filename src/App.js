import React, { useState, useEffect, createContext, useContext } from 'react';
// Corrected Firebase imports for local development/deployment
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, updateDoc, deleteDoc, getDocs, getDoc, setDoc } from 'firebase/firestore';

// Create a context for Firebase services and user ID
const FirebaseContext = createContext(null);

// Firebase Provider component to initialize Firebase and provide it to children
const FirebaseProvider = ({ children }) => {
    const [app, setApp] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false); // Moved isAdmin state here
    const [isAdminLoading, setIsAdminLoading] = useState(true); // Moved isAdminLoading state here

    useEffect(() => {
        try {
            // Your actual Firebase project configuration has been applied here.
            // This was provided by you.
            // If you still get authentication errors (e.g., auth/api-key-not-valid),
            // double-check these values against your Firebase Console Project Settings.
            const firebaseConfig = {
                apiKey: "AIzaSyCem4rbDeOE5HVQDubwfxEGNoboD8PVjRQ",
                authDomain: "my-restaurant-app-f97bd.firebaseapp.com",
                projectId: "my-restaurant-app-f97bd",
                storageBucket: "my-restaurant-app-f97bd.firebasestorage.app",
                messagingSenderId: "385090185476",
                appId: "1:385090185476:web:9c9f4a761456ab73808851",
                measurementId: "G-7JRGHD4TZ2"
            };

            // Log the config to console for debugging purposes
            console.log("Firebase Config being used:", firebaseConfig);

            const initializedApp = initializeApp(firebaseConfig);
            setApp(initializedApp);

            const authInstance = getAuth(initializedApp);
            const dbInstance = getFirestore(initializedApp);
            setAuth(authInstance);
            setDb(dbInstance);

            const signIn = async () => {
                try {
                    // The app will now always sign in anonymously for this demo.
                    // In a real app, you might only sign in anonymously if no other auth method is chosen.
                    await signInAnonymously(authInstance);
                } catch (error) {
                    console.error("Firebase authentication error:", error.code, error.message, error);
                }
            };
            signIn();

            const checkAdminStatus = async (user) => {
                setIsAdminLoading(true); // Start loading when checking status
                if (user && dbInstance) { // Use dbInstance directly
                    const appId = dbInstance.app.options.projectId;
                    const userRoleDocRef = doc(dbInstance, `artifacts/${appId}/public/data/userRoles`, user.uid);
                    try {
                        const userRoleDocSnap = await getDoc(userRoleDocRef);
                        setIsAdmin(userRoleDocSnap.exists() && userRoleDocSnap.data().role === 'admin');
                    } catch (error) {
                        console.error("Error fetching admin role:", error);
                        setIsAdmin(false); // Assume not admin on error
                    }
                } else {
                    setIsAdmin(false);
                }
                setIsAdminLoading(false); // End loading after check
            };

            const unsubscribe = onAuthStateChanged(authInstance, (user) => {
                setUserId(user ? user.uid : null);
                setIsAuthReady(true);
                checkAdminStatus(user); // Call checkAdminStatus here whenever auth state changes
            });

            // Initial check if a user is already authenticated (e.g., on page refresh)
            if (authInstance.currentUser) {
                checkAdminStatus(authInstance.currentUser);
            } else {
                setIsAdminLoading(false); // If no user initially, no loading needed for role check
            }


            return () => unsubscribe();
        } catch (error) {
            console.error("Failed to initialize Firebase:", error);
        }
    }, []); // Dependencies remain minimal to run once

    // Combined loading check for initial Firebase setup and admin status
    if (!isAuthReady || isAdminLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-lg font-semibold text-gray-700">Loading application...</div>
            </div>
        );
    }

    return (
        <FirebaseContext.Provider value={{ app, db, auth, userId, isAuthReady, isAdmin, isAdminLoading }}>
            {children}
        </FirebaseContext.Provider>
    );
};

// Custom hook to use Firebase services
const useFirebase = () => useContext(FirebaseContext);

// =============================================================================
// Page Components
// =============================================================================

// Home Page: Contains the Reservation Form
const HomePage = ({ onReservationSuccess }) => {
    return (
        <div className="flex flex-col items-center justify-center py-8">
            <ReservationForm onReservationSuccess={onReservationSuccess} />
        </div>
    );
};

// Admin Dashboard Page: Contains All Reservations for Admin
const AdminDashboardPage = () => {
    const [adminSubPage, setAdminSubPage] = useState('all'); // 'all', 'approved', or 'statistics'
    // isAdmin and isAdminLoading are now directly available from useFirebase in the parent App component
    // and passed down implicitly or explicitly as needed.

    return (
        <div className="flex flex-col items-center justify-center py-8">
            <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-4xl mx-auto mb-8">
                <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">Admin Panel</h2>
                <nav className="flex flex-wrap justify-center gap-4 mb-6">
                    <button
                        onClick={() => setAdminSubPage('all')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition duration-200 ${
                            adminSubPage === 'all' ? 'bg-indigo-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                        }`}
                    >
                        All Reservations
                    </button>
                    <button
                        onClick={() => setAdminSubPage('approved')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition duration-200 ${
                            adminSubPage === 'approved' ? 'bg-indigo-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                        }`}
                    >
                        Approved Reservations
                    </button>
                    <button
                        onClick={() => setAdminSubPage('statistics')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition duration-200 ${
                            adminSubPage === 'statistics' ? 'bg-indigo-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                        }`}
                    >
                        Reservation Statistics
                    </button>
                </nav>
            </div>
            {adminSubPage === 'all' && <AdminReservations />}
            {adminSubPage === 'approved' && <ApprovedReservationsList />}
            {adminSubPage === 'statistics' && <ReservationStatistics />}
        </div>
    );
};

// =============================================================================
// Functional Components
// =============================================================================

// Confirmation Modal Component
const ConfirmationModal = ({ isOpen, onClose, details }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md mx-auto relative text-center">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                    &times;
                </button>
                <h2 className="text-2xl font-bold mb-4 text-green-700">Reservation Confirmed!</h2>
                <p className="text-gray-700 mb-4">Your reservation details have been successfully submitted.</p>
                <div className="text-left bg-gray-50 p-4 rounded-md mb-6">
                    <p><strong>Name:</strong> {details.name}</p>
                    <p><strong>Date:</strong> {details.date}</p>
                    <p><strong>Time:</strong> {details.time}</p>
                    <p><strong>Guests:</strong> {details.guests}</p>
                    <p><strong>Table:</strong> {details.selectedTable}</p>
                    {details.email && <p><strong>Email:</strong> {details.email}</p>}
                    {details.phoneNumber && <p><strong>Phone:</strong> {details.phoneNumber}</p>}
                    {details.specialRequests && <p><strong>Requests:</strong> {details.specialRequests}</p>}
                </div>
                <p className="text-gray-600 text-sm mb-6">
                    An email confirmation with these details **would be sent** to {details.email || 'your provided email'} if a backend email service were integrated.
                    (Note: Sending emails directly from client-side JavaScript is not secure or reliable for production applications. This feature typically requires a backend service like Firebase Cloud Functions.)
                </p>
                <button
                    onClick={onClose}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Close
                </button>
            </div>
        </div>
    );
};


// Reservation Form Component
const ReservationForm = ({ onReservationSuccess }) => {
    const { db, userId } = useFirebase();
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [guests, setGuests] = useState(1);
    const [selectedTable, setSelectedTable] = useState('1');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [specialRequests, setSpecialRequests] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [availableTables, setAvailableTables] = useState([]); // State to hold available tables

    // Constants for restaurant capacity (could be fetched from Firestore for admin config)
    const MAX_CAPACITY = 30; // Max total guests at any given time slot
    const NUMBER_OF_TABLES = 15; // Total number of tables available

    // Effect to update available tables based on date and time
    useEffect(() => {
        const fetchAvailableTables = async () => {
            if (!db || !date || !time) {
                setAvailableTables(Array.from({ length: NUMBER_OF_TABLES }, (_, i) => i + 1)); // All tables available if no date/time
                return;
            }

            const appId = db.app.options.projectId;
            const reservationsRef = collection(db, `artifacts/${appId}/public/data/reservations`);
            const q = query(
                reservationsRef,
                where('date', '==', date),
                where('time', '==', time),
                where('status', 'in', ['approved', 'pending']) // Consider both approved and pending as "booked"
            );

            try {
                const snapshot = await getDocs(q);
                const bookedTables = new Set();
                snapshot.forEach(doc => {
                    bookedTables.add(doc.data().selectedTable);
                });

                const allTables = Array.from({ length: NUMBER_OF_TABLES }, (_, i) => i + 1);
                const currentlyAvailable = allTables.filter(table => !bookedTables.has(String(table)));
                setAvailableTables(currentlyAvailable);

                // If the currently selected table becomes unavailable, reset it
                if (!currentlyAvailable.includes(parseInt(selectedTable))) {
                    setSelectedTable(currentlyAvailable.length > 0 ? String(currentlyAvailable[0]) : '');
                }

            } catch (error) {
                console.error("Error fetching booked tables:", error);
                setMessage('Could not load table availability. Please try again.');
                setMessageType('error');
                setAvailableTables(Array.from({ length: NUMBER_OF_TABLES }, (_, i) => i + 1)); // Fallback to all tables
            }
        };

        fetchAvailableTables();
    }, [date, time, db, selectedTable]); // Re-run when date, time, or db changes

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!db || !userId) {
            setMessage('Firebase not initialized or user not authenticated.');
            setMessageType('error');
            return;
        }
        if (!selectedTable) {
            setMessage('Please select an available table.');
            setMessageType('error');
            return;
        }

        const appId = db.app.options.projectId;
        const reservationsRef = collection(db, `artifacts/${appId}/public/data/reservations`);

        try {
            // Re-check table availability and total guest capacity right before submission
            // This prevents issues if data changed between component render and submission
            const timeSlotQuery = query(
                reservationsRef,
                where('date', '==', date),
                where('time', '==', time),
                where('status', 'in', ['approved', 'pending'])
            );
            const timeSlotSnapshot = await getDocs(timeSlotQuery);
            
            let currentTotalGuests = 0;
            let isTableBooked = false;

            timeSlotSnapshot.docs.forEach(doc => {
                const data = doc.data();
                currentTotalGuests += data.guests;
                if (data.selectedTable === selectedTable) {
                    isTableBooked = true;
                }
            });

            if (isTableBooked) {
                setMessage(`Table ${selectedTable} is now booked for ${date} at ${time}. Please choose another table or time.`);
                setMessageType('error');
                return;
            }

            if (currentTotalGuests + parseInt(guests) > MAX_CAPACITY) {
                setMessage(`Capacity limit (${MAX_CAPACITY} guests) reached for ${date} at ${time}. Current guests: ${currentTotalGuests}. Your party: ${guests}. Please choose another time.`);
                setMessageType('error');
                return;
            }

            // If all checks pass, add the reservation
            const newReservation = {
                name,
                date,
                time,
                guests: parseInt(guests),
                selectedTable,
                phoneNumber,
                email,
                specialRequests,
                status: 'pending',
                userId,
                createdAt: new Date(),
            };
            await addDoc(reservationsRef, newReservation);
            
            if (onReservationSuccess) {
                onReservationSuccess(newReservation);
            }

            setMessage('Reservation submitted successfully! Awaiting approval.');
            setMessageType('success');
            setName('');
            setDate('');
            setTime('');
            setGuests(1);
            setSelectedTable(availableTables.length > 0 ? String(availableTables[0]) : ''); // Reset to first available or empty
            setPhoneNumber('');
            setEmail('');
            setSpecialRequests('');
        } catch (error) {
                console.error('Error adding reservation:', error);
                setMessage('Failed to submit reservation. Please try again.');
                setMessageType('error');
            }
        };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">Make a Reservation</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                    <input
                        type="date"
                        id="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-700">Time</label>
                    <input
                        type="time"
                        id="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="guests" className="block text-sm font-medium text-gray-700">Number of Guests</label>
                    <input
                        type="number"
                        id="guests"
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                        min="1"
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="table" className="block text-sm font-medium text-gray-700">Choose Table</label>
                    <select
                        id="table"
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                        {availableTables.length > 0 ? (
                            availableTables.map((tableNum) => (
                                <option key={tableNum} value={tableNum}>Table {tableNum}</option>
                            ))
                        ) : (
                            <option value="">No tables available for this time</option>
                        )}
                    </select>
                </div>
                <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input
                        type="tel"
                        id="phoneNumber"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="requests" className="block text-sm font-medium text-gray-700">Special Requests</label>
                    <textarea
                        id="requests"
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        rows="3"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    ></textarea>
                </div>
                <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={availableTables.length === 0 && date && time} // Disable if no tables are available for selected date/time
                >
                    Submit Reservation
                </button>
                {message && (
                    <p className={`mt-4 text-center text-sm ${messageType === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {message}
                    </p>
                )}
            </form>
        </div>
    );
};

// Helper function to format timestamp
const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Check if it's a Firestore Timestamp object, if not, assume it's a Date object or string
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString(); // Formats to local date and time
};


// Admin Reservations List Component (shows ALL reservations)
const AdminReservations = () => {
    const { db, isAdmin, isAuthReady, isAdminLoading } = useFirebase(); // Get isAdmin and isAdminLoading from useFirebase
    const [allReservations, setAllReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');

    useEffect(() => {
        // Crucial: Only proceed if admin status check is complete AND admin
        if (isAdminLoading || !isAdmin || !isAuthReady || !db) {
            setLoading(false); // No data loading if not authorized or still checking
            return;
        }

        const appId = db.app.options.projectId;
        let reservationsRef = collection(db, `artifacts/${appId}/public/data/reservations`);
        let q = query(reservationsRef);

        // Apply filters
        if (filterDate) {
            q = query(q, where('date', '==', filterDate));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let reservationsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Client-side filtering for search term (name or email)
            if (searchTerm) {
                const lowerCaseSearchTerm = searchTerm.toLowerCase();
                reservationsData = reservationsData.filter(res =>
                    (res.name && res.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
                    (res.email && res.email.toLowerCase().includes(lowerCaseSearchTerm))
                );
            }

            reservationsData.sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time}`);
                const dateB = new Date(`${b.date}T${b.time}`);
                return dateA - dateB;
            });
            setAllReservations(reservationsData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching all reservations:", err);
            setError("Failed to load all reservations.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, isAdmin, isAuthReady, searchTerm, filterDate, isAdminLoading]); // Add isAdminLoading to dependency array

    const updateReservationStatus = async (id, status) => {
        if (!db) return;
        try {
            const appId = db.app.options.projectId;
            const reservationRef = doc(db, `artifacts/${appId}/public/data/reservations`, id);
            await updateDoc(reservationRef, { status });
        } catch (error) {
            console.error(`Error updating reservation ${id} status to ${status}:`, error);
        }
    };

    const deleteReservation = async (id) => {
        if (!db) return;
        try {
            const appId = db.app.options.projectId;
            const reservationRef = doc(db, `artifacts/${appId}/public/data/reservations`, id);
            await deleteDoc(reservationRef);
        } catch (error) {
            console.error(`Error deleting reservation ${id}:`, error);
        }
    };

    if (isAdminLoading) { // Show loading state first for admin permissions
        return <p className="text-center text-gray-600 mt-8">Checking admin permissions...</p>;
    }
    if (!isAdmin) { // Then check if admin, if not loading
        return <p className="text-center text-red-600 mt-8">Access Denied: You are not authorized to view this page.</p>;
    }
    // Only proceed to data loading if confirmed admin and not in permission checking phase
    if (loading) return <p className="text-center text-gray-600">Loading all reservations...</p>;
    if (error) return <p className="text-center text-red-600">{error}</p>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-4xl mx-auto mt-8">
            <h3 className="text-xl font-bold mb-4 text-gray-800">All Reservations</h3>
            <div className="mb-4 flex flex-col sm:flex-row gap-4">
                <input
                    type="text"
                    placeholder="Search by name or email"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <button
                    onClick={() => { setSearchTerm(''); setFilterDate(''); }}
                    className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                    Clear Filters
                </button>
            </div>
            {allReservations.length === 0 ? (
                <p className="text-center text-gray-600">No reservations found matching your criteria.</p>
            ) : (
                <div className="space-y-4">
                    {allReservations.map((reservation) => (
                        <div key={reservation.id} className="p-4 border border-gray-200 rounded-md flex flex-col md:flex-row justify-between items-center md:items-start">
                            <div className="mb-4 md:mb-0 md:mr-4 flex-grow">
                                <p className="font-semibold text-lg text-gray-900">{reservation.name} ({reservation.userId.substring(0, 8)}...) - {reservation.guests} Guests</p>
                                <p className="text-gray-600">{reservation.date} at {reservation.time} - Table {reservation.selectedTable}</p>
                                {reservation.phoneNumber && <p className="text-gray-500 text-sm">Phone: {reservation.phoneNumber}</p>}
                                {reservation.email && <p className="text-gray-500 text-sm">Email: {reservation.email}</p>}
                                {reservation.specialRequests && <p className="text-gray-500 text-sm">Requests: {reservation.specialRequests}</p>}
                                <p className="text-gray-500 text-xs mt-1">Submitted: {formatTimestamp(reservation.createdAt)}</p>
                            </div>
                            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
                                {reservation.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => updateReservationStatus(reservation.id, 'approved')}
                                            className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => updateReservationStatus(reservation.id, 'rejected')}
                                            className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                        >
                                            Reject
                                        </button>
                                    </>
                                )}
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    reservation.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    'bg-red-100 text-red-800'
                                }`}>
                                    {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                                </span>
                                <button
                                    onClick={() => deleteReservation(reservation.id)}
                                    className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// New Component: Approved Reservations List
const ApprovedReservationsList = () => {
    const { db, isAdmin, isAuthReady, isAdminLoading } = useFirebase(); // Get isAdmin and isAdminLoading from useFirebase
    const [approvedReservations, setApprovedReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Crucial: Only proceed if admin status check is complete AND admin
        if (isAdminLoading || !isAdmin || !isAuthReady || !db) {
            setLoading(false); // No data loading if not authorized or still checking
            return;
        }

        const appId = db.app.options.projectId;
        // Query only for approved reservations
        const q = query(collection(db, `artifacts/${appId}/public/data/reservations`), where('status', '==', 'approved'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reservationsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            reservationsData.sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time}`);
                const dateB = new Date(`${b.date}T${b.time}`);
                return dateA - dateB;
            });
            setApprovedReservations(reservationsData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching approved reservations:", err);
            setError("Failed to load approved reservations.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, isAdmin, isAuthReady, isAdminLoading]); // Add isAdminLoading to dependency array

    if (isAdminLoading) { // Show loading state first for admin permissions
        return <p className="text-center text-gray-600 mt-8">Checking admin permissions...</p>;
    }
    if (!isAdmin) { // Then check if admin, if not loading
        return <p className="text-center text-red-600 mt-8">Access Denied: You are not authorized to view this page.</p>;
    }
    // Only proceed to data loading if confirmed admin and not in permission checking phase
    if (loading) return <p className="text-center text-gray-600">Loading approved reservations...</p>;
    if (error) return <p className="text-center text-red-600">{error}</p>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-4xl mx-auto mt-8">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Approved Reservations</h3>
            {approvedReservations.length === 0 ? (
                <p className="text-center text-gray-600">No approved reservations found.</p>
            ) : (
                <div className="space-y-4">
                    {approvedReservations.map((reservation) => (
                        <div key={reservation.id} className="p-4 border border-gray-200 rounded-md">
                            <p className="font-semibold text-lg text-gray-900">{reservation.name} - {reservation.guests} Guests</p>
                            <p className="text-gray-600">{reservation.date} at {reservation.time} - Table {reservation.selectedTable}</p>
                            {reservation.phoneNumber && <p className="text-gray-500 text-sm">Phone: {reservation.phoneNumber}</p>}
                            {reservation.email && <p className="text-gray-500 text-sm">Email: {reservation.email}</p>}
                            {reservation.specialRequests && <p className="text-gray-500 text-sm">Requests: {reservation.specialRequests}</p>}
                            <p className="text-gray-500 text-xs mt-1">Submitted: {formatTimestamp(reservation.createdAt)}</p>
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mt-2 inline-block">
                                Approved
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// New Component: Reservation Statistics
const ReservationStatistics = () => {
    const { db, isAdmin, isAuthReady, isAdminLoading } = useFirebase(); // Get isAdmin and isAdminLoading from useFirebase
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Crucial: Only proceed if admin status check is complete AND admin
        if (isAdminLoading || !isAdmin || !isAuthReady || !db) {
            setLoading(false); // No data loading if not authorized or still checking
            return;
        }

        const appId = db.app.options.projectId;
        const q = collection(db, `artifacts/${appId}/public/data/reservations`);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let total = 0;
            let pending = 0;
            let approved = 0;
            let rejected = 0;

            snapshot.forEach(doc => {
                total++;
                const status = doc.data().status;
                if (status === 'pending') {
                    pending++;
                } else if (status === 'approved') {
                    approved++;
                } else if (status === 'rejected') {
                    rejected++;
                }
            });

            setStats({ total, pending, approved, rejected });
            setLoading(false);
        }, (err) => {
            console.error("Error fetching reservation statistics:", err);
            setError("Failed to load reservation statistics.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, isAdmin, isAuthReady, isAdminLoading]); // Add isAdminLoading to dependency array

    if (isAdminLoading) { // Show loading state first for admin permissions
        return <p className="text-center text-gray-600 mt-8">Checking admin permissions...</p>;
    }
    if (!isAdmin) { // Then check if admin, if not loading
        return <p className="text-center text-red-600 mt-8">Access Denied: You are not authorized to view this page.</p>;
    }
    // Only proceed to data loading if confirmed admin and not in permission checking phase
    if (loading) return <p className="text-center text-gray-600">Loading statistics...</p>;
    if (error) return <p className="text-center text-red-600">{error}</p>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md mx-auto mt-8">
            <h3 className="text-xl font-bold mb-4 text-center text-gray-800">Reservation Statistics</h3>
            <div className="space-y-4 text-lg">
                <p className="flex justify-between">
                    <span className="font-medium text-gray-700">Total Reservations:</span>
                    <span className="font-bold text-indigo-700">{stats.total}</span>
                </p>
                <p className="flex justify-between">
                    <span className="font-medium text-gray-700">Pending:</span>
                    <span className="font-bold text-yellow-700">{stats.pending}</span>
                </p>
                <p className="flex justify-between">
                    <span className="font-medium text-gray-700">Approved:</span>
                    <span className="font-bold text-green-700">{stats.approved}</span>
                </p>
                <p className="flex justify-between">
                    <span className="font-medium text-gray-700">Rejected:</span>
                    <span className="font-bold text-red-700">{stats.rejected}</span>
                </p>
            </div>
        </div>
    );
};


// Admin Login Modal Component
const AdminLoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
    const { auth, db } = useFirebase(); // Access auth and db from FirebaseContext
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(''); // Clear previous errors
        setLoading(true);

        try {
            // Authenticate with Firebase Email/Password
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // The onAuthStateChanged listener in FirebaseProvider will now handle setting isAdmin
            onLoginSuccess(); // Just trigger the parent's success callback to close modal and navigate
        } catch (firebaseError) {
            // Handle Firebase authentication errors
            let errorMessage = 'Login failed. Please try again.';
            switch (firebaseError.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    errorMessage = 'Invalid email or password.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email format.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many login attempts. Please try again later.';
                    break;
                default:
                    errorMessage = `Login error: ${firebaseError.message}`;
            }
            setError(errorMessage);
            console.error("Firebase Login Error:", firebaseError);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm mx-auto relative">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                    &times;
                </button>
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Admin Login</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            id="adminEmail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            id="adminPassword"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                    {error && <p className="text-red-600 text-sm text-center">{error}</p>}
                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};


// Main App Component
const App = () => {
    // isAdmin and isAdminLoading are now directly available from useFirebase
    const { userId, auth, db, isAdmin, isAdminLoading } = useFirebase();
    const [currentPage, setCurrentPage] = useState('home');
    const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [reservationDetails, setReservationDetails] = useState(null);

    const handleAdminLoginSuccess = () => {
        // We no longer set isAdmin here. FirebaseProvider's onAuthStateChanged handles it.
        setShowAdminLoginModal(false);
        setCurrentPage('admin-dashboard'); // Redirect to admin dashboard on successful admin login
    };

    const handleAdminLogout = async () => {
        try {
            await signOut(auth);
            // isAdmin will be set to false by onAuthStateChanged listener in FirebaseProvider
            setCurrentPage('home');
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    const handleReservationSuccess = (details) => {
        setReservationDetails(details);
        setShowConfirmationModal(true);
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'home':
                return <HomePage onReservationSuccess={handleReservationSuccess} />;
            case 'admin-dashboard':
                if (isAdminLoading) { // Show loading message while admin status is being determined
                    return <div className="text-center text-gray-600 mt-8 text-xl font-semibold">Checking admin status...</div>;
                }
                if (!isAdmin) { // Render Access Denied if not admin
                    return <p className="text-center text-red-600 mt-8 text-xl font-semibold">Access Denied: You must be an administrator to view this page.</p>;
                }
                return <AdminDashboardPage />; // Render AdminDashboardPage only if isAdmin is true and not loading
            default:
                return <HomePage onReservationSuccess={handleReservationSuccess} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center">
            {/* IMPORTANT: For Tailwind CSS to work correctly in your React project,
                you need to set it up properly in your local development environment.
                
                Here's a general guide:
                1. Install Tailwind CSS, PostCSS, and Autoprefixer:
                   npm install -D tailwindcss postcss autoprefixer
                
                2. Initialize Tailwind CSS:
                   npx tailwindcss init -p
                   This creates `tailwind.config.js` and `postcss.config.js`.

                3. Configure your `tailwind.config.js` file:
                   Update the `content` array to include paths to all of your React components
                   (e.g., './src/App.js', './src/components/MyComponent.jsx').

                4. Add Tailwind directives to your main CSS file (e.g., `src/index.css`):
                   @tailwind base;
                   @tailwind components;
                   @tailwind utilities;

                   You should also move the font import here:
                   @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

                5. Ensure your `src/index.js` (or `main.jsx` for Vite) imports this CSS file:
                   import './index.css'; // or whatever your main CSS file is named

                After these steps, Tailwind CSS should compile and apply correctly.
            */}
            <div className="w-full max-w-6xl">
                <header className="bg-indigo-700 text-white p-4 rounded-xl shadow-md mb-8 flex flex-col sm:flex-row justify-between items-center">
                    <h1 className="text-3xl font-bold mb-4 sm:mb-0">Restaurant Reservation</h1>
                    <nav className="flex flex-wrap justify-center sm:justify-end gap-2">
                        <button
                            onClick={() => setCurrentPage('home')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition duration-200 ${
                                currentPage === 'home' ? 'bg-indigo-800 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                        >
                            Make Reservation
                        </button>
                        
                        {/* Admin Panel button now only appears after successful login */}
                        {isAdmin && (
                            <button
                                onClick={() => setCurrentPage('admin-dashboard')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition duration-200 ${
                                    currentPage === 'admin-dashboard' ? 'bg-indigo-800 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                            >
                                Admin Panel
                            </button>
                        )}
                        {/* Admin Login/Logout buttons */}
                        {!isAdmin && ( // Only show admin login if not admin
                            <button
                                onClick={() => setShowAdminLoginModal(true)}
                                className="px-4 py-2 rounded-md text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition duration-200"
                            >
                                Admin Login
                            </button>
                        )}
                        {isAdmin && ( // Show logout button if admin
                            <button
                                onClick={handleAdminLogout} // Use the new logout handler
                                className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition duration-200"
                            >
                                Admin Logout
                            </button>
                        )}
                    </nav>
                    {userId && (
                        <div className="text-sm mt-4 sm:mt-0 sm:ml-4">
                            <p>Your User ID: <span className="font-mono bg-indigo-800 px-2 py-1 rounded-md">{userId.substring(0, 8)}...</span></p>
                        </div>
                    )}
                </header>

                {renderPage()} {/* Render the currently selected page */}

                {/* Admin Login Modal */}
                <AdminLoginModal
                    isOpen={showAdminLoginModal}
                    onClose={() => setShowAdminLoginModal(false)}
                    onLoginSuccess={handleAdminLoginSuccess}
                />

                {/* Reservation Confirmation Modal */}
                <ConfirmationModal
                    isOpen={showConfirmationModal}
                    onClose={() => setShowConfirmationModal(false)}
                    details={reservationDetails}
                />

                <footer className="mt-12 text-center text-gray-500 text-sm">
                    <p>&copy; {new Date().getFullYear()} Restaurant Reservation App. All rights reserved.</p>
                </footer>
            </div>
        </div>
    );
};

// Wrap the App with FirebaseProvider
export default function WrappedApp() {
    return (
        <FirebaseProvider>
            <App />
        </FirebaseProvider>
    );
}
