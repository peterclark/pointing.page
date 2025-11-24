import { createBrowserRouter } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { ActiveRoomPage } from "./pages/ActiveRoomPage";
import { JoinRoomHandler } from "./pages/JoinRoomHandler";
import { ProfilePage } from "./pages/ProfilePage";
import { RootLayout } from "./components/RootLayout";

/**
 * Application router configuration
 * Defines main routes with persistent header:
 * - / : Landing page with "Create Room" button
 * - /room/:roomCode : Active room view
 * - /join/:roomCode : Join flow handler (validates and redirects)
 * - /profile : Profile/account page
 */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: <LandingPage />,
      },
      {
        path: "/room/:roomCode",
        element: <ActiveRoomPage />,
      },
      {
        path: "/join/:roomCode",
        element: <JoinRoomHandler />,
      },
      {
        path: "/profile",
        element: <ProfilePage />,
      },
    ],
  },
]);
