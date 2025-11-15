import { createBrowserRouter } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { ActiveRoomPage } from "./pages/ActiveRoomPage";
import { JoinRoomHandler } from "./pages/JoinRoomHandler";

/**
 * Application router configuration
 * Defines three main routes:
 * - / : Landing page with "Create Room" button
 * - /room/:roomCode : Active room view
 * - /join/:roomCode : Join flow handler (validates and redirects)
 */
export const router = createBrowserRouter([
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
]);
