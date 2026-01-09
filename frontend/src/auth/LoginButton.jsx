import { useMsal } from '@azure/msal-react';

export function LoginButton() {
  const { instance } = useMsal();
  return (
    <button onClick={() => instance.loginPopup({ scopes: ["User.Read.All", "openid", "profile", "email"] })}>
      Sign in with Microsoft
    </button>
  );
}
