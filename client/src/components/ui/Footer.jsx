import Logo from "/Logoimg.png";

function Footer() {
  return (
    <footer
      className="
        bg-bg-main
        border-t border-border
      "
    >
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          {/* Logo */}
          <div className="flex items-center justify-center sm:justify-start">
            <img src={Logo} alt="Sunny Logo" className="h-15 w-auto" />
          </div>

          {/* Copyright */}
          <p
            className="
              text-center sm:text-right
              text-sm
              text-text-secondary
            "
          >
            © {new Date().getFullYear()} SafeMother. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
