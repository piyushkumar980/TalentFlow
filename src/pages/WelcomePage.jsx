// src/pages/WelcomePage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// 👇 IMPORTS A STATIC BRAND IMAGE FOR THE HEADER
import logo from "../assets/TALENTFLOW.png";

export default function WelcomePage() {
  const navigateToRoute = useNavigate();

  // READ INITIAL STATE FROM LOCALSTORAGE SO CHOICES PERSIST ACROSS REFRESHES
  const [selectedUserType, setSelectedUserType] = useState(
    () => localStorage.getItem("who") || ""
  );
  const [userEmailInput, setUserEmailInput] = useState(
    () => localStorage.getItem("email") || ""
  );
  const [validationErrorMessage, setValidationErrorMessage] = useState("");

  // ADVANCES THE FLOW AFTER BASIC VALIDATION AND SAVES PREFERENCES LOCALLY
  function handleProceedToNextStep() {
    if (!selectedUserType) {
      setValidationErrorMessage("Please select what best describes you.");
      return;
    }
    if (!userEmailInput || !/^\S+@\S+\.\S+$/.test(userEmailInput)) {
      setValidationErrorMessage("Please enter a valid email.");
      return;
    }

    localStorage.setItem("who", selectedUserType);
    localStorage.setItem("email", userEmailInput);

    // ROUTES THE USER TO A ROLE-SPECIFIC START PAGE
    if (selectedUserType === "seeker") {
      navigateToRoute("/jobseeker");
    } else {
      navigateToRoute("/dashboard");
    }
  }

  // SELECTABLE ROLE CARD WITH A SMALL HOVER TOOLTIP
  const UserTypeChoiceCard = ({ value, title, desc, icon }) => {
    const isCurrentlySelected = selectedUserType === value;

    // DETERMINES HELPER-TEXT AND COLOR PURELY FOR UI EXPLANATION
    const helperTooltipText =
      value === "recruiter"
        ? "Select this if you want to use this platform as a hiring manager."
        : "Use this if you are a jobseeker and looking for a job.";
    const helperTooltipBgClass = value === "recruiter" ? "bg-blue-600" : "bg-green-600";

    return (
      <button
        type="button"
        onClick={() => {
          setSelectedUserType(value);
          setValidationErrorMessage("");
        }}
        className={`group relative w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] focus:outline-none
          ${
            isCurrentlySelected
              ? "border-indigo-500 ring-4 ring-indigo-100 bg-indigo-50 shadow-lg"
              : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md"
          }`}
        style={{ animation: "fadeInUp 0.6s ease-out" }}
        aria-pressed={isCurrentlySelected}
      >
        {/* SHOWS A CONTEXTUAL TIP ON HOVER/FOCUS WITHOUT CAPTURING CLICKS */}
        <div
          role="tooltip"
          className={`pointer-events-none absolute -top-4 left-6 z-20 px-3 py-2 rounded-xl text-xs sm:text-sm text-white shadow-lg ${helperTooltipBgClass}
            opacity-0 translate-y-1
            transition-all duration-300 ease-out
            group-hover:opacity-100 group-hover:translate-y-0
            focus-within:opacity-100 focus-within:translate-y-0
            motion-safe:group-hover:delay-150`}
        >
          {helperTooltipText}
          {/* SMALL ARROW TRIANGLE FOR THE TIP */}
          <span className={`absolute top-[calc(100%-6px)] left-8 w-3 h-3 rotate-45 ${helperTooltipBgClass}`} />
        </div>

        {/* ICON + TEXT BLOCK WITH A HIGHLIGHT WHEN SELECTED */}
        <div className="flex items-start gap-4">
          <div
            className={`h-12 w-12 grid place-items-center rounded-xl text-xl transition-all duration-300 
            ${
              isCurrentlySelected
                ? "bg-indigo-100 text-indigo-700 scale-110"
                : "bg-slate-100 text-slate-600"
            }`}
            aria-hidden
          >
            {icon}
          </div>
          <div>
            <div className="font-semibold text-slate-800 text-lg">{title}</div>
            <div className="text-sm text-slate-500 mt-1">{desc}</div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col">
      {/* MAIN CONTENT AREA CENTERS THE WELCOME CARD */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl">
          <div className="bg-white/80 backdrop-blur-sm border border-white rounded-3xl shadow-2xl p-8 md:p-12 transform hover:scale-[1.01] transition-transform duration-300">
            {/* BRANDING HEADER WITH LOGO */}
            <div className="flex justify-center mb-8">
              <img
                src={logo}
                alt="TalentFlow Logo"
                className="h-30 w-auto object-contain"
                style={{ maxWidth: "250px" }}
              />
            </div>

            {/* HERO COPY INTRODUCES THE APP AND VALUE PROP */}
            <div className="text-center mb-10">
              <h1 className="text-4xl md-text-5xl font-bold text-slate-900 mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Welcome to TalentFlow
              </h1>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                This platform is a user-friendly job board designed to simplify the hiring
                process for both companies and job seekers. It acts as a central hub where
                employers can post open positions and manage applications, while candidates
                can easily browse and apply for jobs that match their skills.
              </p>
            </div>

            {/* FEATURE TEASERS WITH LIGHT ANIMATION */}
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              {[
                { icon: "🚀", title: "Fast Hiring", desc: "Reduce time-to-hire by 60%" },
                { icon: "🎯", title: "AI Matching", desc: "Smart candidate-job matching" },
                { icon: "📊", title: "Analytics", desc: "Data-driven hiring decisions" },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300"
                  style={{ animation: `fadeInUp 0.6s ease-out ${index * 0.2}s both` }}
                >
                  <div className="text-3xl mb-4">{feature.icon}</div>
                  <h3 className="font-semibold text-slate-800 mb-2">{feature.title}</h3>
                  <p className="text-slate-500 text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* ROLE SELECTION TO PERSONALIZE THE NEXT SCREEN */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-800 mb-6 text-center">
                How will you be using TalentFlow?
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <UserTypeChoiceCard
                  value="recruiter"
                  title="I'm from TalentFlow"
                  desc="Recruiting or hiring as part of the TalentFlow team."
                  icon="🏢"
                />
                <UserTypeChoiceCard
                  value="seeker"
                  title="I'm a Job Seeker"
                  desc="Exploring roles and taking assessments."
                  icon="👤"
                />
              </div>
            </div>

            {/* EMAIL INPUT FIELD USED FOR BASIC CONTACT CONTEXT */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Email Address
              </label>
              <input
                value={userEmailInput}
                onChange={(e) => {
                  setUserEmailInput(e.target.value);
                  setValidationErrorMessage("");
                }}
                placeholder="you@company.com"
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300"
                type="email"
                style={{ animation: "fadeInUp 0.6s ease-out 0.4s both" }}
              />
            </div>

            {/* VALIDATION MESSAGE RENDERS ONLY WHEN INPUT IS INCOMPLETE */}
            {validationErrorMessage && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {validationErrorMessage}
              </div>
            )}

            {/* PRIMARY CTA TO CONTINUE AFTER MAKING A SELECTION */}
            <div className="text-center">
              <button
                onClick={handleProceedToNextStep}
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                style={{ animation: "fadeInUp 0.6s ease-out 0.6s both" }}
              >
                Get Started →
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER AREA RESERVED FOR SECONDARY INFORMATION */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-slate-200 py-12 px-8">
        {/* FOOTER CONTENT CAN BE ADDED HERE WITHOUT AFFECTING THE FLOW */}
      </footer>

      {/* KEYFRAME DEFINITIONS FOR LIGHT ENTRANCE ANIMATIONS */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
