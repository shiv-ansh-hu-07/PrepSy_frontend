import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  const challengeCards = [
    {
      icon: "01",
      accent: "#E8EBFF",
      title: "Nobody around you is preparing",
      desc: "You're the only one in your hostel doing LeetCode at midnight.",
    },
    {
      icon: "02",
      accent: "#E4F7F4",
      title: "No accountability",
      desc: "You plan to study 4 hours but end up doing 45 minutes before giving up.",
    },
    {
      icon: "03",
      accent: "#FFF2DD",
      title: "Don't know if you're on track",
      desc: "Is your DSA level enough for a product company? No one to benchmark against.",
    },
    {
      icon: "04",
      accent: "#FFE8E4",
      title: "Doubts go unanswered",
      desc: "Stuck on a graph problem for 2 hours. No one to ask without feeling judged.",
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #F8FAFF 0%, #EEF2FF 100%)",
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont",
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
          Built for Placement-prep students
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
          Study together. Learn better. Stay consistent.
        </h1>

        <p
          style={{
            fontSize: "17px",
            color: "#6B7280",
            marginBottom: "32px",
          }}
        >
          Stop Griding alone.
          Find your study squad.
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
              boxShadow: "0 8px 22px rgba(99,102,241,0.28)",
            }}
          >
            Find a study room now.
          </Link>

          <Link
            to="/HowItWorks"
            style={{
              backgroundColor: "#8a9bd6",
              color: "#FFFFFF",
              padding: "13px 28px",
              borderRadius: "999px",
              fontSize: "14px",
              fontWeight: 500,
              textDecoration: "none",
              boxShadow: "0 8px 22px rgba(99,102,241,0.28)",
            }}
          >
            How it works
          </Link>
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
          PrepSy combines focused study sessions with meaningful peer discussions so you
          don't just study longer, you study smarter.
        </p>
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
          Focus alone is hard. Learning together makes it easier.
        </p>
      </section>

      <section
        id="how-it-works"
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          paddingBottom: "72px",
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
      >
        <div
          style={{
            background: "linear-gradient(180deg, #F7F9FF 0%, #EEF2FF 100%)",
            borderRadius: "28px",
            padding: "36px",
            border: "1px solid #E4EAFE",
            boxShadow: "0 24px 48px rgba(74, 90, 133, 0.08)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "14px",
            }}
          >
            {challengeCards.map((item) => (
              <div
                key={item.title}
                style={{
                  minHeight: "206px",
                  background: "#FFFFFF",
                  borderRadius: "14px",
                  padding: "24px",
                  border: "1px solid #E8EDFB",
                  boxShadow: "0 12px 26px rgba(74, 90, 133, 0.08)",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#42527F",
                    background: item.accent,
                    marginBottom: "18px",
                  }}
                >
                  {item.icon}
                </div>

                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    lineHeight: 1.25,
                    color: "#2F3B63",
                    marginBottom: "10px",
                  }}
                >
                  {item.title}
                </h3>

                <p
                  style={{
                    fontSize: "15px",
                    color: "#5E6C92",
                    lineHeight: "1.45",
                    maxWidth: "24ch",
                  }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
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
            boxShadow: "0 22px 44px rgba(0,0,0,0.06)",
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
            Your best study sessions happen with the right people
            <br />
            PrepSy helps you find them
            <br />
            study better together
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
              boxShadow: "0 10px 24px rgba(99,102,241,0.3)",
            }}
          >
            Get Started
          </Link>
        </div>
      </section>
    </main>
  );
}
