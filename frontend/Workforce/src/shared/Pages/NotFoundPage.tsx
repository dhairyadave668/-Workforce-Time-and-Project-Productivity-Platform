export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
      color: "#111",
      textAlign: "center",
      padding: "2rem",
    }}>
      <h1 style={{ fontSize: "6rem", fontWeight: 700, margin: 0, lineHeight: 1 }}>404</h1>
      <p style={{ fontSize: "1.1rem", color: "#666", margin: "1rem 0 2rem" }}>
        This page doesn't exist.
      </p>
      <a
        href="/"
        style={{
          fontSize: "0.9rem",
          color: "#111",
          textDecoration: "underline",
          textUnderlineOffset: "3px",
        }}
      >
        Go home
      </a>
    </div>
  );
}