import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #F8FAFF 0%, #EEF2FF 100%)",
        fontFamily:
          "'Inter', system-ui, -apple-system, BlinkMacSystemFont",
        color: "#1F2937",
      }}
    >
      <section
        style={{
          maxWidth: "980px",
          margin: "0 auto",
          paddingTop: "96px",
          paddingBottom: "64px",
          paddingLeft: "24px",
          paddingRight: "24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            borderRadius: "999px",
            background: "rgba(99,102,241,0.12)",
            color: "#6366F1",
            fontSize: "13px",
            fontWeight: 500,
            marginBottom: "16px",
          }}
        >
          🧠 Built for deep focus
        </div>

        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "32px",
            color: "#4a5a85",
            lineHeight: "1.25",
            marginBottom: "14px",
            letterSpacing: "-0.02em",
          }}
        >
          Study together. Stay consistent. Achieve more.
        </h1>

        <p
          style={{
            fontSize: "17px",
            color: "#6B7280",
            marginBottom: "32px",
          }}
        >
          Focus better. Stay consistent. Prepare quietly.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "14px",
          }}
        >
          <Link
            to="/login"
            style={{
              backgroundColor: "#8a9bd6",
              color: "#FFFFFF",
              padding: "13px 28px",
              borderRadius: "999px",
              fontSize: "14px",
              fontWeight: 500,
              textDecoration: "none",
              boxShadow:
                "0 8px 22px rgba(99,102,241,0.28)",
            }}
          >
            Try for free
          </Link>

          <a
            href="#how-it-works"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              padding: "13px 28px",
              borderRadius: "999px",
              fontSize: "14px",
              fontWeight: 500,
              textDecoration: "none",
              color: "#4a5a85",
            }}
          >
            How it works
          </a>
        </div>
      </section>

      <section
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          paddingBottom: "48px",
          paddingLeft: "24px",
          paddingRight: "24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "18px",
            lineHeight: "1.6",
            color: "#4a5a85",

          }}
        >
          PrepSy recreates the productivity of group / solo study session — accountability, structured sessions, and peer motivation — all inside lightweight virtual rooms.
        </p>
      </section>

      <section
        id="how-it-works"
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          paddingBottom: "72px",
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
      >
        <div
          style={{
            color: "#4a5a85",
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "24px",
          }}
        >
          {[
            {
              icon: "🚪",
              title: "Enter a study room",
              desc: "Join others or have one for yourself.",
            },
            {
              icon: "⏱️",
              title: "Start a session",
              desc: "Pomodoro, A.I. companionship and many more features.",
            },
            {
              icon: "👥",
              title: "Study together",
              desc: "Find people with same topics and discuss.",
            },
            {
              icon: "✅",
              title: "Leave with progress",
              desc: "Valuate your progress with stats at last of every session.",
            },
          ].map((item, index) => (
            <div
              key={index}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "18px",
                padding: "26px 22px",
                textAlign: "center",
                border: "1px solid #EEF2FF",
                boxShadow:
                  "0 12px 28px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  fontSize: "26px",
                  marginBottom: "10px",
                }}
              >
                {item.icon}
              </div>

              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                {item.title}
              </h3>

              <p
                style={{
                  fontSize: "13.5px",
                  color: "#6B7280",
                  lineHeight: "1.45",
                }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          paddingBottom: "96px",
          paddingLeft: "24px",
          paddingRight: "24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "24px",
            padding: "40px 32px",
            border: "1px solid #EEF2FF",
            boxShadow:
              "0 22px 44px rgba(0,0,0,0.06)",
          }}
        >
          <p
            style={{
              fontSize: "17px",
              lineHeight: "1.6",
              marginBottom: "28px",
              color: "#4a5a85",
            }}
          >
            Motivation fades.
            <br />
            Consistency compounds.
            <br />
            PrepSy helps you show up.
          </p>

          <Link
            to="/login"
            style={{
              backgroundColor: "#8a9bd6",
              color: "#FFFFFF",
              padding: "13px 32px",
              borderRadius: "999px",
              fontSize: "14px",
              fontWeight: 500,
              textDecoration: "none",
              boxShadow:
                "0 10px 24px rgba(99,102,241,0.3)",
            }}
          >
            Get Started
          </Link>
        </div>
      </section>
    </main>
  );
}
