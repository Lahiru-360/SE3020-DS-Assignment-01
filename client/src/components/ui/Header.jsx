import Logo from "/Logoimg.png";
import AuthButton from "./AuthButton";

export default function Header() {
  return (
    <header className="bg-bg-card border-b border-border transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={Logo} alt="Sunny Logo" className="h-15 w-auto" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  );
}
