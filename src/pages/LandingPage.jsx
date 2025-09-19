// src/pages/LandingPage.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import introVideo from "../assets/INTRODUCTION.mp4";

export default function LandingPage() {
  const navigateToRoute = useNavigate();

  // AUTO-NAVIGATE TO THE WELCOME SCREEN AFTER A SHORT INTRO WINDOW
  useEffect(() => {
    const redirectionTimerId = setTimeout(() => {
      // PROGRAMMATICALLY ROUTE TO THE WELCOME PAGE WHEN TIME ELAPSES
      navigateToRoute("/welcome");
    }, 5000);
    // PREVENT LINGERING TIMERS WHEN USER LEAVES THE PAGE EARLY
    return () => clearTimeout(redirectionTimerId);
  }, [navigateToRoute]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* FULL-BLEED BACKGROUND VIDEO FOR BRAND MOMENT (MUTED, LOOPED, AUTOPLAY) */}
      <video
        className="absolute top-0 left-0 w-full h-full object-cover"
        src={introVideo}
        autoPlay
        loop
        muted
        playsInline
      />

      {/* SEMI-OPAQUE OVERLAY TO IMPROVE TEXT LEGIBILITY */}
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center flex-col">
        {/* HERO TITLE WITH STAGGERED ENTRANCE ANIMATIONS (VISUAL ONLY) */}
        <h1 className="text-white text-5xl md:text-6xl font-bold mb-4 text-center">
          <span
            className="block opacity-0"
            style={{
              animation: "fadeSlideDown 900ms ease-out 500ms forwards",
              animationFillMode: "forwards",
            }}
          >
            Welcome to
          </span>
          <span
            className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 text-6xl md:text-7xl mt-2"
            style={{
              backgroundSize: "220% 220%",
              animation: "shiftingGradient 3s ease infinite, fadeInSimple 900ms ease-out 1000ms forwards",
            }}
          >
            TalentFlow
          </span>
        </h1>

        {/* SUBTITLE APPEARS AFTER TITLE FOR A GENTLE, READABLE SEQUENCE */}
        <p
          className="text-white text-lg md:text-xl opacity-0 mt-4"
          style={{
            animation: "fadeSlideUp 900ms ease-out 1500ms forwards",
            animationFillMode: "forwards",
          }}
        >
          Streamlining your hiring process
        </p>

        {/* SIMPLE PROGRESS BAR THAT VISUALLY MIRRORS THE AUTO-REDIRECT TIMER */}
        <div className="mt-8 w-48 h-1 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full"
            style={{ animation: "progressFill 5s linear forwards" }}
          />
        </div>

        {/* OPTIONAL SKIP CONTROL FOR USERS WHO WANT TO MOVE AHEAD IMMEDIATELY */}
        <button
          onClick={() => navigateToRoute("/welcome")}
          className="mt-6 px-6 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all duration-300 backdrop-blur-sm border border-white/30 opacity-0"
          style={{
            animation: "fadeInSimple 900ms ease-out 2000ms forwards",
            animationFillMode: "forwards",
          }}
        >
          Skip Intro
        </button>
      </div>

      {/* KEYFRAME DEFINITIONS ARE PURELY PRESENTATIONAL; NO LOGIC IS EMBEDDED HERE */}
      <style
        // DANGEROUSLYSETINNERHTML IS USED HERE ONLY FOR SCOPED KEYFRAMES
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes fadeSlideDown {
              from { opacity: 0; transform: translateY(-28px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeSlideUp {
              from { opacity: 0; transform: translateY(28px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeInSimple {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes shiftingGradient {
              0%   { background-position: 0% 50%; }
              50%  { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            @keyframes progressFill {
              0%   { width: 0%; }
              100% { width: 100%; }
            }
          `,
        }}
      />
    </div>
  );
}
