import { HashRouter, BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from 'react';
import { USE_BROWSER_ROUTER } from "./common/constants.ts";
import GlobalHeader from "./components/global-header.tsx";
import HomePage from "./pages/home.tsx";
import "./styles/app.scss";
import NotFound from "./pages/not-found.tsx";
import ProfilePage from './pages/profile.tsx';
import Catalog from "./pages/catalog.tsx";

import { Authenticator } from "@aws-amplify/ui-react";
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';
import '@aws-amplify/ui-react/styles.css'
import {
  createOrUpdateProfile,
  defaultUser,
  type UserType,
  getProfileProps,
  convertAuthToUserType
} from './components/utils/profile-manager';

Amplify.configure(outputs);

interface WorkshopAppProps {
  signOut?: () => void;
  user?: UserType;
}

const WorkshopApp = ({ signOut, user = defaultUser }: WorkshopAppProps) => {
  const Router = USE_BROWSER_ROUTER ? BrowserRouter : HashRouter;

  useEffect(() => {
    if (user) {
      createOrUpdateProfile(user);
    }
  }, [user]);

  return (
    <div style={{ height: "100%" }}>
      <Router>
        <GlobalHeader
          user={user?.signInDetails?.loginId}
          signOut={signOut}
          isAuthenticated={!!signOut}
        />
        <div style={{ height: "56px", backgroundColor: "#000716" }}>&nbsp;</div>
        <div>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/absproxy/5173" element={<HomePage />} />
            <Route path="/proxy/5173/absproxy/5173" element={<HomePage />} />

            <Route
              path="/catalog"
              element={signOut ? <Catalog /> : <NotFound />}
            />
            <Route
              path="/profile"
              element={signOut ? <ProfilePage {...getProfileProps(user)} /> : <NotFound />}
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </div>
  );
};

export default function App() {
  // This parameter will be used in the workshop
  const signOut = undefined;
  const user = defaultUser;

  return (
    // <Authenticator>
    //   {({ signOut, user }) => (
        <WorkshopApp
          signOut={signOut}
          user={user ? convertAuthToUserType(user) : defaultUser}
        />
    //   )}
    // </Authenticator>
  );
}