import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            hosted_domain?: string;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: string | number;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  mode?: 'signin' | 'signup';
  onError?: (msg: string) => void;
  onCustomAuth?: (credential: string) => Promise<void>;
  buttonText?: string;
  allowAnyDomain?: boolean;
  customButtonId?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  mode = 'signin',
  onError,
  onCustomAuth,
  buttonText,
  allowAnyDomain = false,
  customButtonId = 'google-signin-rendered-button',
}) => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [isLoading, setIsLoading] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  const onCustomAuthRef = useRef(onCustomAuth);
  onCustomAuthRef.current = onCustomAuth;

  const loginWithGoogleRef = useRef(loginWithGoogle);
  loginWithGoogleRef.current = loginWithGoogle;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const handleCredentialResponse = async (credential: string) => {
    setIsLoading(true);
    try {
      if (onCustomAuthRef.current) {
        await onCustomAuthRef.current(credential);
      } else {
        await loginWithGoogleRef.current(credential);
      }
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        onErrorRef.current?.(err.message);
      } else {
        onErrorRef.current?.(
          allowAnyDomain
            ? 'Google authentication failed. Please verify your admin security password.'
            : 'Google authentication failed. Please make sure you use an official @kiet.edu account.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialResponseRef = useRef(handleCredentialResponse);
  handleCredentialResponseRef.current = handleCredentialResponse;

  useEffect(() => {
    if (!googleClientId) return;

    // Load Google Identity Services script if not present
    if (!document.getElementById('google-gsi-client')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => initGoogleGsi();
      document.body.appendChild(script);
    } else if (window.google) {
      initGoogleGsi();
    }

    function initGoogleGsi() {
      if (!window.google) return;
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (res) => handleCredentialResponseRef.current(res.credential),
          ...(allowAnyDomain ? {} : { hosted_domain: 'kiet.edu' }),
        });

        const buttonContainer = document.getElementById(customButtonId);
        if (buttonContainer) {
          buttonContainer.innerHTML = '';
          window.google.accounts.id.renderButton(buttonContainer, {
            theme: 'filled_black',
            size: 'large',
            text: mode === 'signup' ? 'signup_with' : 'continue_with',
            shape: 'pill',
            width: '100%',
          });
        }
      } catch (err) {
        console.error('Google Identity Services initialization error:', err);
      }
    }
  }, [googleClientId, mode, allowAnyDomain, customButtonId]);

  // Fallback direct button (if googleClientId is not configured or in dev testing)
  const handleDirectClick = async () => {
    if (googleClientId && window.google) {
      try {
        window.google.accounts.id.prompt();
        return;
      } catch {
        // fallback
      }
    }

    // In local dev without Google Client ID, prompt user
    const defaultEmail = allowAnyDomain ? 'friend.traveler@gmail.com' : 'lokesh.mishra22@kiet.edu';
    const promptMsg = allowAnyDomain
      ? 'Google Sign-In (Guest / Personal):\nEnter any Gmail / personal email address:'
      : 'Google Sign-In (@kiet.edu):\nEnter your KIET college email address (e.g. yourname.21b@kiet.edu):';

    const studentEmail = window.prompt(promptMsg, defaultEmail);

    if (!studentEmail) return;

    if (!allowAnyDomain && !studentEmail.toLowerCase().endsWith('@kiet.edu')) {
      onError?.('Access restricted: Only official @kiet.edu college accounts are permitted.');
      return;
    }

    await handleCredentialResponse(`mock-google-token:${studentEmail.trim()}`);
  };

  const defaultLabel = allowAnyDomain
    ? 'Continue with Google (Guest Account)'
    : mode === 'signup'
    ? 'Sign up with KIET Google Account'
    : 'Continue with KIET Google Account';

  return (
    <div className="w-full space-y-2">
      {googleClientId ? (
        <div id={customButtonId} className="w-full flex justify-center min-h-[44px]"></div>
      ) : null}

      {(!googleClientId || isLoading) && (
        <button
          type="button"
          onClick={handleDirectClick}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-white text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.99]"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isLoading ? 'Authenticating with Google...' : buttonText || defaultLabel}</span>
        </button>
      )}
    </div>
  );
};
