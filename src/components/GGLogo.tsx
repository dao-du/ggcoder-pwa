interface Props {
  variant: "header" | "splash";
}

const BLOCK_LOGO_LINES = [
  " ▄▀▀▀ ▄▀▀▀",
  " █ ▀█ █ ▀█",
  " ▀▄▄▀ ▀▄▄▀",
];

function GGLogo({ variant }: Props) {
  return (
    <>
      <style>{`
        @keyframes gg-gradient-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .gg-gradient {
          background: linear-gradient(
            90deg,
            #60a5fa,
            #6da1f9,
            #7a9df7,
            #8799f5,
            #9495f3,
            #a18ff1,
            #a78bfa,
            #a18ff1,
            #9495f3,
            #8799f5,
            #7a9df7,
            #6da1f9,
            #60a5fa
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: gg-gradient-flow 3s ease-in-out infinite;
        }
        .gg-gradient-dim {
          background: linear-gradient(
            90deg,
            #60a5fab0,
            #6da1f9b0,
            #7a9df7b0,
            #8799f5b0,
            #9495f3b0,
            #a18ff1b0,
            #a78bfab0,
            #a18ff1b0,
            #9495f3b0,
            #8799f5b0,
            #7a9df7b0,
            #6da1f9b0,
            #60a5fab0
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: gg-gradient-flow 3s ease-in-out infinite;
        }
      `}</style>

      {variant === "header" ? (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontFamily: "monospace",
            userSelect: "none",
          }}
        >
          <span
            className="gg-gradient"
            style={{
              fontSize: "18px",
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "-0.5px",
            }}
          >
            GG
          </span>
          <span
            className="gg-gradient-dim"
            style={{
              fontSize: "18px",
              fontWeight: 400,
              lineHeight: 1,
              letterSpacing: "-0.5px",
            }}
          >
            coder
          </span>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 500,
              lineHeight: 1,
              color: "var(--text-secondary, #6b7280)",
              border: "1px solid var(--text-secondary, #6b7280)",
              borderRadius: "4px",
              padding: "2px 4px",
              marginLeft: "2px",
              opacity: 0.7,
            }}
          >
            RC
          </span>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            userSelect: "none",
          }}
        >
          <div
            className="gg-gradient"
            style={{
              fontFamily: "monospace",
              fontSize: "26px",
              fontWeight: 700,
              lineHeight: 1,
              whiteSpace: "pre",
              letterSpacing: "0px",
            }}
          >
            {BLOCK_LOGO_LINES.map((line, i) => (
              <div key={i}>
                {[...line].map((char, j) => (
                  <span key={j}>{char}</span>
                ))}
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: "10px",
              fontSize: "13px",
              fontFamily: "monospace",
              color: "var(--text-secondary, #6b7280)",
              letterSpacing: "1px",
            }}
          >
            Remote Control
          </div>
        </div>
      )}
    </>
  );
}

export default GGLogo;
