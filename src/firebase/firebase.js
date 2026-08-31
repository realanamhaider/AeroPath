import { initializeApp } from "firebase/app";

import { getAuth } from "firebase/auth";

import { getFirestore } from "firebase/firestore";

import {
  getToken,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY,

  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,

  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID,

  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,

  messagingSenderId:
    import.meta.env
      .VITE_FIREBASE_MESSAGING_SENDER_ID,

  appId:
    import.meta.env.VITE_FIREBASE_APP_ID,
};

const app =
  initializeApp(firebaseConfig);

/*
  LOCAL DEVELOPMENT ONLY

  This tells Firebase App Check to use a
  debug token on localhost instead of
  reCAPTCHA Enterprise.

  Vite automatically makes DEV false in
  the production build, so this will not
  run on aeropath.app.
*/

if (import.meta.env.DEV) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN =
    true;
}

/*
  Initialize App Check BEFORE using
  Firebase services.
*/

export const appCheck =
  initializeAppCheck(app, {
    provider:
      new ReCaptchaEnterpriseProvider(
        import.meta.env
          .VITE_RECAPTCHA_ENTERPRISE_SITE_KEY
      ),

    isTokenAutoRefreshEnabled: true,
  });
  if (import.meta.env.DEV) {
  getToken(appCheck, true)
    .then(() => {
      console.log(
        "✅ AeroPath App Check verified locally."
      );
    })
    .catch((error) => {
      console.error(
        "❌ AeroPath App Check failed:",
        error
      );
    });
}

export const auth =
  getAuth(app);

export const db =
  getFirestore(app);

export default app;