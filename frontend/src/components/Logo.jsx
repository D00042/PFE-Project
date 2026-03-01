function Logo({ size = "medium" }) {
  const sizes = {
    small: "60px",
    medium: "100px",
    large: "150px"
  };

  return (
    <img
      src="/Tui_logo.png"
      alt="TUI Logo"
      style={{ width: sizes[size] }}
    />
  );
}

export default Logo;