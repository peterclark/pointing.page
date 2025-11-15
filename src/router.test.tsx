import { describe, it, expect } from "vitest";
import { router } from "./router";

describe("Router Configuration", () => {
  it("should define all required routes", () => {
    const routes = router.routes;

    expect(routes).toHaveLength(3);

    // Check that all required paths exist
    const paths = routes.map((route) => route.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/room/:roomCode");
    expect(paths).toContain("/join/:roomCode");
  });

  it("should have landing page at root path", () => {
    const rootRoute = router.routes.find((route) => route.path === "/");
    expect(rootRoute).toBeDefined();
    expect(rootRoute?.path).toBe("/");
  });

  it("should have parameterized room routes", () => {
    const roomRoute = router.routes.find((route) => route.path === "/room/:roomCode");
    const joinRoute = router.routes.find((route) => route.path === "/join/:roomCode");

    expect(roomRoute).toBeDefined();
    expect(joinRoute).toBeDefined();
    expect(roomRoute?.path).toBe("/room/:roomCode");
    expect(joinRoute?.path).toBe("/join/:roomCode");
  });
});
