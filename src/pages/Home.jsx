import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

export default function Home() {
  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== "undefined" ? window.innerWidth < 900 : false
  );
  const mobileCarouselRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 900);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const challengeCards = [
    {
      icon: "💼",
      title: "Prepare with people targeting the same roles",
      desc: "Join rooms for placements, SDE interviews, product roles, and job-switch prep instead of grinding alone.",
    },
    {
      icon: "⏱️",
      title: "Stay accountable every day",
      desc: "Use focused study blocks for DSA, aptitude, system design, and interview prep so your plan actually happens.",
    },
    {
      icon: "🧠",
      title: "Clear doubts faster",
      desc: "Get unstuck on coding problems, resume decisions, interview questions, and revision topics with peers in real time.",
    },
    {
      icon: "📈",
      title: "Build interview-ready consistency",
      desc: "Track what you covered, show up regularly, and turn scattered preparation into steady progress toward offers.",
    },
  ];

  const loopedCards = [...challengeCards, ...challengeCards, ...challengeCards];

  useEffect(() => {
    if (!isSmallScreen || !mobileCarouselRef.current) return;

    const el = mobileCarouselRef.current;
    const loopWidth = el.scrollWidth / 3;
    el.scrollLeft = loopWidth;
  }, [isSmallScreen]);

  const handleMobileScroll = () => {
    const el = mobileCarouselRef.current;
    if (!el) return;

    const loopWidth = el.scrollWidth / 3;
    if (loopWidth <= 0) return;

    if (el.scrollLeft < loopWidth * 0.25) {
      el.scrollLeft += loopWidth;
    } else if (el.scrollLeft > loopWidth * 1.75) {
      el.scrollLeft -= loopWidth;
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #F8FAFF 0%, #EEF2FF 100%)",
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont",
        color: "#1F2937",
      }}
    >
      <style>{`
        .home-mobile-carousel {
          overflow-x: auto;
          overflow-y: hidden;
          -ms-overflow-style: none;
          scrollbar-width: none;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
        }

        .home-mobile-carousel::-webkit-scrollbar {
          display: none;
        }
      `}</style>

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
          💼 Built for placements and job switches
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
          Prep smarter for interviews, placements, and your next role.
        </h1>

        <p
          style={{
            fontSize: "17px",
            color: "#6B7280",
            marginBottom: "32px",
          }}
        >
          Study DSA, system design, aptitude, and interview rounds with people aiming for the same outcomes.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "14px",
            flexWrap: "wrap",
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
            Join a prep room
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
          maxWidth: "820px",
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
          PrepSy combines focused work sessions with live peer accountability, so your interview prep stops feeling random and starts feeling structured.
        </p>
      </section>

      <section
        style={{
          maxWidth: "820px",
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
          Whether you're a student chasing placements or a working professional switching jobs, the right prep company changes everything.
        </p>
      </section>

      <section
        id="how-it-works"
        style={{
          maxWidth: "1340px",
          margin: "0 auto",
          paddingBottom: "72px",
          paddingLeft: isSmallScreen ? "16px" : "24px",
          paddingRight: isSmallScreen ? "16px" : "24px",
        }}
      >
        <div
          style={{
            background: "linear-gradient(180deg, #F7F9FF 0%, #EEF2FF 100%)",
            borderRadius: "28px",
            padding: isSmallScreen ? "18px 0" : "28px",
            border: "1px solid #E4EAFE",
            boxShadow: "0 24px 48px rgba(74, 90, 133, 0.08)",
            overflow: "hidden",
          }}
        >
          {isSmallScreen ? (
            <div
              ref={mobileCarouselRef}
              className="home-mobile-carousel"
              onScroll={handleMobileScroll}
            >
              <div
                style={{
                  display: "flex",
                  gap: "14px",
                  width: "max-content",
                  padding: "0 16px",
                }}
              >
                {loopedCards.map((item, index) => (
                  <ChallengeCard
                    key={`${item.title}-${index}`}
                    item={item}
                    smallScreen
                  />
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: "18px",
                alignItems: "stretch",
              }}
            >
              {challengeCards.map((item) => (
                <ChallengeCard key={item.title} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section
        style={{
          maxWidth: "820px",
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
            Better interview prep is not just about more hours.
            <br />
            It's about better structure, better peers, and better momentum.
            <br />
            Prep with people who are serious about landing roles.
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
            Start preparing now
          </Link>
        </div>
      </section>
    </main>
  );
}

function ChallengeCard({ item, smallScreen = false }) {
  return (
    <div
      style={{
        flex: smallScreen ? "0 0 248px" : undefined,
        minHeight: smallScreen ? "214px" : "244px",
        background: "#FFFFFF",
        borderRadius: "24px",
        padding: smallScreen ? "22px 20px" : "28px 26px",
        border: "1px solid #E8EDFB",
        boxShadow: "0 12px 26px rgba(74, 90, 133, 0.08)",
        textAlign: "center",
        scrollSnapAlign: smallScreen ? "start" : undefined,
      }}
    >
      <div
        style={{
          fontSize: smallScreen ? "30px" : "34px",
          lineHeight: 1,
          marginBottom: "18px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {item.icon}
      </div>

      <h3
        style={{
          fontSize: smallScreen ? "15px" : "16px",
          fontWeight: 700,
          lineHeight: 1.35,
          color: "#2F3B63",
          marginBottom: "12px",
        }}
      >
        {item.title}
      </h3>

      <p
        style={{
          fontSize: smallScreen ? "13px" : "14px",
          color: "#5E6C92",
          lineHeight: "1.55",
          maxWidth: smallScreen ? "20ch" : "22ch",
          margin: "0 auto",
        }}
      >
        {item.desc}
      </p>
    </div>
  );
}
