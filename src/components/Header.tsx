/**
 * Header Component
 *
 * IMPORTANT: This component contains ONLY the logo/branding.
 * Navigation buttons (profile, home) are handled in RootLayout component.
 * DO NOT add navigation buttons here unless explicitly requested.
 */
const Header = () => {
  return (
    <p className="text-5xl md:text-6xl lg:text-7xl font-bold inter-var text-center text-primary">
      Pointing
      <span className="text-lg md:text-2xl lg:text-3xl font-light">.page</span>
    </p>
  );
};

export default Header;
