import { HashRouter, BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from 'react';
import { USE_BROWSER_ROUTER } from "./common/constants.ts";
import GlobalHeader from "./components/global-header.tsx";
import HomePage from "./pages/home.tsx";
import "./styles/app.scss";
import NotFound from "./pages/not-found.tsx";
import ProfilePage from './pages/profile.tsx';
import Catalog from "./pages/catalog.tsx";
import AgentSearch from "./pages/agent-search.tsx";

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

const HOME_PATH = "/proxy/5173/absproxy/5173";

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
            <Route path={HOME_PATH} element={<HomePage />} />

            <Route
              path="/agent-search"
              element={signOut ? <AgentSearch /> : <Navigate to={HOME_PATH} replace />}
            />
            <Route
              path="/catalog"
              element={signOut ? <Catalog /> : <Navigate to={HOME_PATH} replace />}
            />
            <Route
              path="/catalog/course/:courseId"
              element={signOut ? <Catalog /> : <Navigate to={HOME_PATH} replace />}
            />
            <Route
              path="/catalog/course/:courseId/class/:classId"
              element={signOut ? <Catalog /> : <Navigate to={HOME_PATH} replace />}
            />
            <Route
              path="/profile"
              element={signOut ? <ProfilePage {...getProfileProps(user)} /> : <Navigate to={HOME_PATH} replace />}
            />

            <Route path="*" element={<Navigate to={HOME_PATH} replace />} />
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
