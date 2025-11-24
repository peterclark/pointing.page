import { describe, it, expect } from "vitest";
import { router } from "./router";

describe("Router Configuration", () => {
  it("should define all required routes", () => {
    const routes = router.routes;

    // Router now uses nested layout structure: 1 parent with 4 children
    expect(routes).toHaveLength(1);
    expect(routes[0].children).toHaveLength(4);

    // Check that all required paths exist in children
    const paths = routes[0].children?.map((route) => route.path) || [];
    expect(paths).toContain("/");
    expect(paths).toContain("/room/:roomCode");
    expect(paths).toContain("/join/:roomCode");
    expect(paths).toContain("/profile");
  });

  it("should have landing page at root path", () => {
    const children = router.routes[0].children || [];
    const rootRoute = children.find((route) => route.path === "/");
    expect(rootRoute).toBeDefined();
    expect(rootRoute?.path).toBe("/");
  });

  it("should have parameterized room routes", () => {
    const children = router.routes[0].children || [];
    const roomRoute = children.find((route) => route.path === "/room/:roomCode");
    const joinRoute = children.find((route) => route.path === "/join/:roomCode");

    expect(roomRoute).toBeDefined();
    expect(joinRoute).toBeDefined();
    expect(roomRoute?.path).toBe("/room/:roomCode");
    expect(joinRoute?.path).toBe("/join/:roomCode");
  });
});
