import { useState, useEffect } from 'react';
import './App.css';
import { supabase } from '../supabaseClient';

function App() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [session, setSession] = useState(null);
    const params = new URLSearchParams(window.location.search);
    const hasTokenHash = params.get('token_hash');
    const [verifying, setVerifying] = useState(!!hasTokenHash);
    const [authError, setAuthError] = useState(null);
    const [authSuccess, setAuthSuccess] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token_hash = params.get('token_hash');
        const type = params.get('type');

        if (token_hash) {
            supabase.auth
                .verifyOtp({ token_hash, type: type || 'email' })
                .then(({ error }) => {
                    if (error) {
                        setAuthError(error.message);
                    } else {
                        setAuthSuccess(true);
                        window.history.replaceState({}, document.title, '/');
                    }
                    setVerifying(false);
                });
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async (event) => {
        event.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: window.location.origin },
        });
        if (error) {
            alert(error.error_description || error.message);
        } else {
            alert('Check your email for the login link!');
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
    };

    if (verifying) {
        return (
            <div className='min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800'>
                <h1 className='text-2xl font-bold mb-4'>Authentication</h1>
                <p className='mb-2'>Confirming your magic link...</p>
                <p className='text-blue-500 animate-pulse'>Loading...</p>
            </div>
        );
    }

    if (authError) {
        return (
            <div className='min-h-screen flex flex-col items-center justify-center bg-red-50 text-red-700 p-4'>
                <h1 className='text-2xl font-bold mb-4'>Authentication</h1>
                <p className='mb-2'>✗ Authentication failed</p>
                <p className='mb-4'>{authError}</p>
                <button
                    className='px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700'
                    onClick={() => {
                        setAuthError(null);
                        window.history.replaceState({}, document.title, '/');
                    }}
                >
                    Return to login
                </button>
            </div>
        );
    }

    if (authSuccess && !session) {
        return (
            <div className='min-h-screen flex flex-col items-center justify-center bg-green-50 text-green-700'>
                <h1 className='text-2xl font-bold mb-4'>Authentication</h1>
                <p className='mb-2'>✓ Authentication successful!</p>
                <p>Loading your account...</p>
            </div>
        );
    }

    if (session) {
        return (
            <div className='min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4'>
                <h1 className='text-2xl font-bold mb-4'>Welcome!</h1>
                <p className='mb-4 text-gray-700'>
                    You are logged in as: {session.user.email}
                </p>
                <button
                    className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
                    onClick={handleLogout}
                >
                    Sign Out
                </button>
            </div>
        );
    }

    return (
        <div className='min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4'>
            <h1 className='text-3xl font-bold mb-2 text-gray-800'>
                Supabase + React
            </h1>
            <p className='mb-6 text-gray-600'>
                Sign in via magic link with your email below
            </p>
            <form
                onSubmit={handleLogin}
                className='flex flex-col items-center w-full max-w-sm bg-white p-6 rounded shadow-md'
            >
                <input
                    type='email'
                    placeholder='Your email'
                    value={email}
                    required
                    onChange={(e) => setEmail(e.target.value)}
                    className='w-full px-4 py-2 mb-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
                <button
                    type='submit'
                    disabled={loading}
                    className='w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50'
                >
                    {loading ? 'Loading...' : 'Send magic link'}
                </button>
            </form>
        </div>
    );
}

export default App;
