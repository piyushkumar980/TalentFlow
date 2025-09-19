// src/pages/RunAssessmentPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getAssessment, submitAssessment } from "../api/services/assessments.js";

export default function RunAssessmentPage() {
  // READ JOB ID FROM ROUTE PARAMS AND COERCE TO NUMBER
  const { id: routeJobIdParam } = useParams();
  const numericJobId = Number(routeJobIdParam);

 
  // LOAD ASSESSMENT CONTENT FOR THE GIVEN JOB
  // BEHAVIOR: CALL SERVICE, HANDLE LOADING/ERROR STATES VIA REACT-QUERY
 
  const {
    data: assessmentData,
    isLoading: isAssessmentLoading,
    isError: didAssessmentLoadFail,
    error: assessmentLoadError,
  } = useQuery({
    queryKey: ["assessment", numericJobId],
    queryFn: () => getAssessment(numericJobId), // EXPECTS: { jobId, sections: [...] }
  });

  
  // FLATTEN QUESTIONS INTO A LINEAR SEQUENCE FOR SIMPLE NEXT/PREV FLOW
  // BEHAVIOR: DECORATE EACH QUESTION WITH SECTION TITLE AND SEQUENCE INDEX
  
  const FLATTENED_QUESTIONS = useMemo(() => {
    const sections = assessmentData?.sections || [];
    return sections.flatMap((section, sectionIdx) =>
      (section.questions || []).map((question, questionIdx) => ({
        ...question,
        sectionTitle: section.title || `Section ${sectionIdx + 1}`,
        _sequenceIndexLabel: `${sectionIdx + 1}.${questionIdx + 1}`,
      }))
    );
  }, [assessmentData]);

  // LOCAL STATE FOR ANSWERS, TIMER, CURRENT INDEX, AND SUMMARY
  // BEHAVIOR: TRACK USER PROGRESS UNTIL SUBMISSION
  
  const [answersByQuestionId, setAnswersByQuestionId] = useState({}); // MAP: QUESTION.ID -> VALUE
  const [hasUserSubmitted, setHasUserSubmitted] = useState(false);
  const [scoringSummary, setScoringSummary] = useState(null); // { correct, wrong, skipped, total, percent, perTopic[] }
  const [secondsRemaining, setSecondsRemaining] = useState(600); // DEFAULT 10 MIN IN CASE LENGTH IS UNKNOWN
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isFullscreenEngaged, setIsFullscreenEngaged] = useState(false);
  const hasTimerBeenInitializedRef = useRef(false);

  
  // ESTIMATE TIMER AFTER QUESTIONS LOAD (~15S PER QUESTION, MIN 10M)
  // BEHAVIOR: UPDATE TIMER ONCE, BEFORE ANY SUBMISSION OCCURS
  
  useEffect(() => {
    if (!hasTimerBeenInitializedRef.current && FLATTENED_QUESTIONS.length > 0 && !hasUserSubmitted) {
      hasTimerBeenInitializedRef.current = true;
      const suggestedDuration = Math.max(600, FLATTENED_QUESTIONS.length * 15);
      setSecondsRemaining(suggestedDuration);
    }
  }, [FLATTENED_QUESTIONS.length, hasUserSubmitted]);

  // SUBMISSION MUTATION
  // BEHAVIOR: SEND ANSWERS TO SERVICE; ALWAYS SHOW LOCAL SUMMARY ON COMPLETE
  const submitAssessmentMutation = useMutation({
    mutationFn: () =>
      submitAssessment(numericJobId, {
        candidateId: undefined, // OPTIONAL: PROVIDE IF AVAILABLE
        data: {
          answers: answersByQuestionId,
          totalQuestions: FLATTENED_QUESTIONS.length,
          timeAllocatedSec: secondsRemaining, // LAST KNOWN VALUE AT SUBMIT TIME
          submittedAt: Date.now(),
        },
      }),
    onSuccess: () => {
      setHasUserSubmitted(true);
    },
    onError: () => {
      // EVEN WHEN OFFLINE OR FAILED, WE STILL SURFACE THE LOCAL SUMMARY
      setHasUserSubmitted(true);
    },
  });

  // FULLSCREEN MANAGEMENT
  // BEHAVIOR: ENTER FULLSCREEN AT START; EXIT ON TEARDOWN OR SUBMIT
  useEffect(() => {
    const requestFullscreenIfNeeded = () => {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(() => {});
      }
      setIsFullscreenEngaged(true);
    };
    if (!hasUserSubmitted) requestFullscreenIfNeeded();

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [hasUserSubmitted]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreenEngaged(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // COUNTDOWN TIMER
  // BEHAVIOR: DECREMENT EVERY SECOND UNTIL SUBMISSION OR ZERO
  useEffect(() => {
    if (hasUserSubmitted) return;
    if (secondsRemaining <= 0) {
      finalizeAndSubmitAssessment();
      return;
    }
    const timerId = setTimeout(() => setSecondsRemaining((s) => s - 1), 1000);
    return () => clearTimeout(timerId);
  }, [secondsRemaining, hasUserSubmitted]);

  // ANSWER WRITERS
  // BEHAVIOR: SET SINGLE-VALUE ANSWERS OR TOGGLE MULTI-SELECT OPTIONS
  const recordAnswerForQuestion = (questionId, value) => {
    setAnswersByQuestionId((prev) => ({ ...prev, [questionId]: value }));
  };

  const toggleMultiSelectAnswer = (questionId, optionValue) => {
    setAnswersByQuestionId((prev) => {
      const prevArr = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      if (prevArr.includes(optionValue)) {
        return { ...prev, [questionId]: prevArr.filter((x) => x !== optionValue) };
      }
      return { ...prev, [questionId]: [...prevArr, optionValue] };
    });
  };

  // SCORING ENGINE
  // BEHAVIOR: EVALUATE ALL ANSWERS; PRODUCE PER-TOPIC AND OVERALL STATS
  function computeScoringSummaryByTopic() {
    const statsByTopic = new Map(); // TOPIC -> { correct, wrong, skipped, total }
    const normalize = (x) => String(x ?? "").trim().toLowerCase();

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    FLATTENED_QUESTIONS.forEach((question) => {
      const topicKey = question.sectionTitle || "Section";
      const bucket = statsByTopic.get(topicKey) || { correct: 0, wrong: 0, skipped: 0, total: 0 };
      bucket.total += 1;

      const userAnswer = answersByQuestionId[question.id];

      // TREAT UNANSWERED OR EMPTY ARRAYS AS SKIPPED
      if (
        userAnswer === undefined ||
        userAnswer === "" ||
        (Array.isArray(userAnswer) && userAnswer.length === 0)
      ) {
        skippedCount += 1;
        bucket.skipped += 1;
        statsByTopic.set(topicKey, bucket);
        return;
      }

      // SINGLE-CHOICE EXACT MATCH (STRING-NORMALIZED)
      if (question.type === "single" && question.answer !== undefined) {
        if (normalize(userAnswer) === normalize(question.answer)) {
          correctCount += 1;
          bucket.correct += 1;
        } else {
          wrongCount += 1;
          bucket.wrong += 1;
        }
        statsByTopic.set(topicKey, bucket);
        return;
      }

      // MULTI-SELECT EXACT SET MATCH
      if (question.type === "multi" && Array.isArray(question.answer)) {
        const userArr = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
        const keyArr = [...question.answer].sort();
        const isSameSet =
          userArr.length === keyArr.length &&
          userArr.every((v, i) => normalize(v) === normalize(keyArr[i]));
        if (isSameSet) {
          correctCount += 1;
          bucket.correct += 1;
        } else {
          wrongCount += 1;
          bucket.wrong += 1;
        }
        statsByTopic.set(topicKey, bucket);
        return;
      }

      // NUMERIC STRICT EQUALITY
      if (question.type === "numeric" && question.answer !== undefined) {
        const isNumericMatch = Number(userAnswer) === Number(question.answer);
        if (isNumericMatch) {
          correctCount += 1;
          bucket.correct += 1;
        } else {
          wrongCount += 1;
          bucket.wrong += 1;
        }
        statsByTopic.set(topicKey, bucket);
        return;
      }

      // SHORT/LONG TEXT EXACT MATCH (CASE-INSENSITIVE) WHEN EXPECTED ANSWER PROVIDED
      if ((question.type === "short" || question.type === "long") && typeof question.answer === "string") {
        if (normalize(userAnswer) === normalize(question.answer)) {
          correctCount += 1;
          bucket.correct += 1;
        } else {
          wrongCount += 1;
          bucket.wrong += 1;
        }
        statsByTopic.set(topicKey, bucket);
        return;
      }

      // DEFAULT TO WRONG WHEN QUESTION TYPE IS UNKNOWN OR ANSWER KEY IS AMBIGUOUS
      wrongCount += 1;
      bucket.wrong += 1;
      statsByTopic.set(topicKey, bucket);
    });

    const totalQuestions = FLATTENED_QUESTIONS.length;
    const overallPercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const perTopic = Array.from(statsByTopic.entries()).map(([topic, v]) => ({
      topic,
      ...v,
      percent: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
    }));

    return { correct: correctCount, wrong: wrongCount, skipped: skippedCount, total: totalQuestions, percent: overallPercent, perTopic };
  }

  // FINAL SUBMISSION
  // BEHAVIOR: COMPUTE SUMMARY, EXIT FULLSCREEN, FIRE MUTATION
  function finalizeAndSubmitAssessment() {
    const summary = computeScoringSummaryByTopic();
    setScoringSummary(summary);

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    submitAssessmentMutation.mutate();
  }

// CONFIRMATION GATE BEFORE SUBMISSION
  // BEHAVIOR: WARN ABOUT UNANSWERED QUESTIONS; OPTIONALLY CONTINUE
  function confirmAndSubmitAssessment() {
    const unansweredCount = FLATTENED_QUESTIONS.length - Object.keys(answersByQuestionId).length;
    if (unansweredCount > 0) {
      const proceed = window.confirm(
        `You still have ${unansweredCount} unanswered question${unansweredCount > 1 ? "s" : ""}. Submit anyway?`
      );
      if (!proceed) return;
    }
    finalizeAndSubmitAssessment();
  }

  // DERIVED SHORTCUTS
  const totalQuestionCount = FLATTENED_QUESTIONS.length;

  // LOADING / ERROR / EMPTY STATES
  if (isAssessmentLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">Loading assessment…</div>
      </div>
    );
  }

  if (didAssessmentLoadFail) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100">
        <div className="bg-white border rounded-2xl p-6 shadow-sm text-red-600">
          Failed to load assessment: {assessmentLoadError?.message || "Unknown error"}
        </div>
      </div>
    );
  }

  if (totalQuestionCount === 0) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100">
        <div className="bg-white border rounded-2xl p-6 shadow-sm text-center">
          <div className="text-lg font-semibold text-slate-800 mb-2">No Questions Available</div>
          <p className="text-slate-600 mb-4">This assessment has no questions yet.</p>
          <Link
            to="/assessments"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white shadow hover:bg-indigo-700"
          >
            Back to Assessments
          </Link>
        </div>
      </div>
    );
  }

  // REQUIRE FULLSCREEN BEFORE START (IF USER EXITS, PROMPT TO RE-ENTER)
  if (!isFullscreenEngaged && !hasUserSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Assessment Requires Full Screen</h2>
          <p className="text-slate-600 mb-4">Please allow full screen mode to continue with the assessment.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Continue to Assessment
          </button>
        </div>
      </div>
    );
  }

  // POST-SUBMISSION SUMMARY
  // BEHAVIOR: DISPLAY OVERALL SCORE AND PER-TOPIC BREAKDOWN
  if (hasUserSubmitted) {
    const finalSummary =
      scoringSummary || { correct: 0, wrong: 0, skipped: 0, total: totalQuestionCount, percent: 0, perTopic: [] };

    return (
      <div className="min-h-screen bg-slate-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* TOP SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Score", value: `${finalSummary.percent}%`, sub: `${finalSummary.correct}/${finalSummary.total} correct` },
              { label: "Correct", value: finalSummary.correct, sub: "Right answers" },
              { label: "Wrong", value: finalSummary.wrong, sub: "Incorrect answers" },
              { label: "Skipped", value: finalSummary.skipped, sub: "Not answered" },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">{card.label}</div>
                <div className="text-2xl font-semibold text-slate-800 mt-1">{card.value}</div>
                <div className="text-[12px] text-slate-500">{card.sub}</div>
              </div>
            ))}
          </div>

          {/* PER-TOPIC BREAKDOWN */}
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b font-semibold text-slate-800">Topic Breakdown</div>
            <div className="divide-y">
              {finalSummary.perTopic.length === 0 ? (
                <div className="px-5 py-6 text-sm text-slate-500">No detailed breakdown available.</div>
              ) : (
                finalSummary.perTopic.map((topicRow) => (
                  <div key={topicRow.topic} className="px-5 py-3 flex items-center gap-4 text-sm">
                    <div className="w-40 font-medium text-slate-800">{topicRow.topic}</div>
                    <div className="flex-1">
                      <div className="w-full bg-slate-200 h-2 rounded">
                        <div
                          className="h-2 bg-emerald-500 rounded"
                          style={{ width: `${topicRow.percent}%` }}
                          title={`${topicRow.correct}/${topicRow.total}`}
                        />
                      </div>
                    </div>
                    <div className="w-28 text-right text-slate-600">
                      {topicRow.correct}/{topicRow.total} ({topicRow.percent}%)
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <Link
              to="/jobseeker/assessments"
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white shadow hover:bg-indigo-700"
            >
              Back to Assessments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE QUESTION RENDERING
  // BEHAVIOR: PRESENT SINGLE QUESTION WITH CONTROLS AND PROGRESS
  const activeQuestion = FLATTENED_QUESTIONS[activeQuestionIndex];

  const isActiveQuestionAnswered =
    activeQuestion.type === "multi"
      ? Array.isArray(answersByQuestionId[activeQuestion.id]) &&
        answersByQuestionId[activeQuestion.id].length > 0
      : answersByQuestionId[activeQuestion.id] !== undefined &&
        answersByQuestionId[activeQuestion.id] !== "";

  const goToNextQuestion = () =>
    setActiveQuestionIndex((prev) => Math.min(totalQuestionCount - 1, prev + 1));
  const goToPreviousQuestion = () =>
    setActiveQuestionIndex((prev) => Math.max(0, prev - 1));

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 max-w-4xl mx-auto">
        {/* HEADER: QUESTION INDEX + TIMER + SUBMIT BUTTON */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-slate-500">
            Question {activeQuestionIndex + 1} of {totalQuestionCount} •{" "}
            <span className="font-medium">{activeQuestion.sectionTitle}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-red-600">
              Time Left: {Math.floor(secondsRemaining / 60)}:
              {String(secondsRemaining % 60).padStart(2, "0")}
            </div>
            <button
              onClick={confirmAndSubmitAssessment}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Submit Now
            </button>
          </div>
        </div>

        {/* VISUAL PROGRESS BAR */}
        <div className="w-full bg-slate-200 rounded-full h-2 mb-6">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((activeQuestionIndex + 1) / totalQuestionCount) * 100}%` }}
          />
        </div>

        {/* QUESTION BODY */}
        <div className="bg-white border rounded-xl p-6 shadow-sm mb-6">
          <div className="font-medium text-slate-800 mb-4 text-lg">
            {activeQuestion.label || activeQuestion.title || activeQuestion.q || `Question ${activeQuestionIndex + 1}`}
          </div>

          {/* SINGLE-CHOICE ANSWERS */}
          {activeQuestion.type === "single" && Array.isArray(activeQuestion.options) && (
            <div className="space-y-3">
              {activeQuestion.options.map((opt, idx) => {
                const picked = answersByQuestionId[activeQuestion.id];
                const isActive = String(picked) === String(opt);
                return (
                  <button
                    key={idx}
                    onClick={() => recordAnswerForQuestion(activeQuestion.id, opt)}
                    className={`w-full text-left p-3 rounded-lg border transition ${
                      isActive ? "bg-indigo-50 border-indigo-300" : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* MULTI-SELECT ANSWERS */}
          {activeQuestion.type === "multi" && Array.isArray(activeQuestion.options) && (
            <div className="space-y-2">
              {activeQuestion.options.map((opt, idx) => {
                const picked = Array.isArray(answersByQuestionId[activeQuestion.id])
                  ? answersByQuestionId[activeQuestion.id]
                  : [];
                const isChecked = picked.includes(opt);
                return (
                  <label
                    key={idx}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                      isChecked ? "bg-indigo-50 border-indigo-300" : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleMultiSelectAnswer(activeQuestion.id, opt)}
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          )}

          {/* NUMERIC ANSWER */}
          {activeQuestion.type === "numeric" && (
            <div className="max-w-xs">
              <input
                type="number"
                value={answersByQuestionId[activeQuestion.id] ?? ""}
                onChange={(e) => recordAnswerForQuestion(activeQuestion.id, e.target.value)}
                min={activeQuestion.min ?? undefined}
                max={activeQuestion.max ?? undefined}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
                placeholder="Enter a number"
              />
              {(activeQuestion.min !== undefined || activeQuestion.max !== undefined) && (
                <div className="text-xs text-slate-500 mt-1">
                  {activeQuestion.min !== undefined ? `min ${activeQuestion.min}` : ""}{" "}
                  {activeQuestion.max !== undefined ? `max ${activeQuestion.max}` : ""}
                </div>
              )}
            </div>
          )}

          {/* SHORT TEXT ANSWER */}
          {activeQuestion.type === "short" && (
            <div className="max-w-xl">
              <input
                type="text"
                value={answersByQuestionId[activeQuestion.id] ?? ""}
                onChange={(e) => recordAnswerForQuestion(activeQuestion.id, e.target.value)}
                maxLength={activeQuestion.maxLength ?? undefined}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
                placeholder="Your answer"
              />
              {activeQuestion.maxLength ? (
                <div className="text-xs text-slate-500 mt-1">
                  {String(answersByQuestionId[activeQuestion.id] || "").length}/{activeQuestion.maxLength}
                </div>
              ) : null}
            </div>
          )}

          {/* LONG TEXT ANSWER */}
          {activeQuestion.type === "long" && (
            <div>
              <textarea
                value={answersByQuestionId[activeQuestion.id] ?? ""}
                onChange={(e) => recordAnswerForQuestion(activeQuestion.id, e.target.value)}
                rows={6}
                maxLength={activeQuestion.maxLength ?? undefined}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-200"
                placeholder="Type your response…"
              />
              {activeQuestion.maxLength ? (
                <div className="text-xs text-slate-500 mt-1">
                  {String(answersByQuestionId[activeQuestion.id] || "").length}/{activeQuestion.maxLength}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* NAVIGATION CONTROLS */}
        <div className="flex justify-between items-center">
          <button
            onClick={goToPreviousQuestion}
            disabled={activeQuestionIndex === 0}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="text-sm text-slate-500">{isActiveQuestionAnswered ? "Answered" : "Not Answered"}</div>

          {activeQuestionIndex === totalQuestionCount - 1 ? (
            <button onClick={confirmAndSubmitAssessment} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">
              Submit Test
            </button>
          ) : (
            <button
              onClick={goToNextQuestion}
              disabled={!isActiveQuestionAnswered}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Question
            </button>
          )}
        </div>

        {/* COMPLETION OVERVIEW BAR */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="text-sm text-slate-700 mb-2">
            Questions answered: {Object.keys(answersByQuestionId).length} / {totalQuestionCount}
          </div>
          <div className="grid grid-cols-10 gap-1">
            {FLATTENED_QUESTIONS.map((q, index) => {
              const value = answersByQuestionId[q.id];
              const isDone =
                value !== undefined &&
                value !== "" &&
                (!Array.isArray(value) || value.length > 0);
              return (
                <div
                  key={q.id ?? index}
                  className={`h-2 rounded ${isDone ? "bg-emerald-500" : "bg-slate-300"}`}
                  title={`Question ${index + 1}`}
                />
              );
            })}
          </div>
        </div>

        {/* FRIENDLY WARNING ABOUT AUTO-SUBMIT AND REQUIRED ANSWERS */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <p className="text-sm text-yellow-700">
            ⚠️ YOU CAN SUBMIT ANYTIME. IF TIME EXPIRES, YOUR ANSWERS ARE AUTO-SUBMITTED.
            YOU CAN ONLY MOVE FORWARD AFTER ANSWERING THE CURRENT QUESTION.
          </p>
        </div>
      </div>
    </div>
  );
}

