import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: 'YOUR_AZURE_AD_CLIENT_ID', // TODO: Replace with your Azure AD App clientId
    authority: 'https://login.microsoftonline.com/7903f66e-7c6d-487c-9bd0-788aa8eb21df', // TODO: Replace with your Azure AD tenantId
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);
