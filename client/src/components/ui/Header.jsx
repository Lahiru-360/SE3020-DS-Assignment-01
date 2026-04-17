import Logo from "/Logoimg.png";
import AuthButton from "./AuthButton";

export default function Header() {
  return (
    <header className="bg-bg-card border-b border-border transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <a href="/">
              <img src={Logo} alt="CareLink Logo" className="h-15 w-auto" />
            </a>
          </div>

          {/* Navigation - Hidden on mobile, visible on desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="/#features" className="text-sm font-semibold text-text-secondary hover:text-primary transition-colors">Features</a>
            <a href="/#how-it-works" className="text-sm font-semibold text-text-secondary hover:text-primary transition-colors">How it works</a>
            <a href="/#contact" className="text-sm font-semibold text-text-secondary hover:text-primary transition-colors">Contact us</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  );
}
