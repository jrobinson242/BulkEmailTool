import { useMsal } from '@azure/msal-react';
import { InteractionType } from '@azure/msal-browser';

// Utility hook to acquire a token for Microsoft Graph
export function useGraphToken(scopes = ["User.Read", "User.Read.All"]) {
  const { instance, accounts } = useMsal();

  async function getToken() {
    if (!accounts || accounts.length === 0) return null;
    const request = {
      scopes,
      account: accounts[0],
    };
    try {
      const response = await instance.acquireTokenSilent(request);
      return response.accessToken;
    } catch (e) {
      // fallback to popup if silent fails
      const response = await instance.acquireTokenPopup(request);
      return response.accessToken;
    }
  }

  return getToken;
}
