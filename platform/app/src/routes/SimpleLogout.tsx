import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuthentication } from '@ohif/ui-next';

type AuthApi = {
  reset?: () => void;
  setUser?: (user: unknown) => void;
};

export default function SimpleLogout() {
  const navigate = useNavigate();
  const authContext: unknown = useUserAuthentication();
  const authApi = (Array.isArray(authContext) ? authContext[1] : null) as AuthApi | null;

  useEffect(() => {
    try {
      window.localStorage.removeItem('ohif.simpleLogin.user');
      window.localStorage.removeItem('ohif.dentalBackend.token');
    } catch {
      // no-op
    }

    authApi?.reset?.();
    authApi?.setUser?.(null);

    window.location.replace('/login');
  }, [authApi, navigate]);

  return null;
}
