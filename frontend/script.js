/* =====================================================================
   PrepAI – Frontend Application Logic
   ===================================================================== */

"use strict";

// ── Configuration ──────────────────────────────────────────────────────
// Change this to your deployed Render backend URL for production.
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:5000"
  : "https://your-render-backend.onrender.com"; // ← Replace after deploying

// ── State ──────────────────────────────────────────────────────────────
let currentQuestions   = [];
let currentMeta        = {};
let currentInterviewId = null;
let numQuestions       = 10;
let mockQuestion       = null;
let resumeText         = "";
let isRecording        = false;
let recognition        = null;

// ── DOM Ready ──────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initNumSelector();
  initNavbar();
  initResumeDragDrop();
  loadHistory();
  initScrollAnimations();
  initSpeechRecognition();
});

/* ======================================================================
   THEME TOGGLE
   ====================================================================== */
function initTheme() {
  const saved = localStorage.getItem("theme") || "dark";
  applyTheme(saved);
}

function applyTheme(theme) {
  document.body.classList.toggle("light", theme === "light");
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = theme === "light" ? "🌙" : "☀️";
  localStorage.setItem("theme", theme);
}

document.getElementById("theme-toggle").addEventListener("click", () => {
  const current = localStorage.getItem("theme") || "dark";
  applyTheme(current === "dark" ? "light" : "dark");
});

/* ======================================================================
   NAVBAR
   ====================================================================== */
function initNavbar() {
  window.addEventListener("scroll", () => {
    const navbar = document.getElementById("navbar");
    if (navbar) {
      navbar.style.background = window.scrollY > 60
        ? "rgba(15,15,26,0.95)"
        : "rgba(15,15,26,0.7)";
    }
  });
}

document.getElementById("hamburger").addEventListener("click", () => {
  document.getElementById("mobile-menu").classList.toggle("open");
});

function closeMobileMenu() {
  document.getElementById("mobile-menu").classList.remove("open");
}

/* ======================================================================
   NUMBER SELECTOR
   ====================================================================== */
function initNumSelector() {
  document.getElementById("num-dec").addEventListener("click", () => {
    if (numQuestions > 1) {
      numQuestions--;
      updateNumDisplay();
    }
  });
  document.getElementById("num-inc").addEventListener("click", () => {
    if (numQuestions < 30) {
      numQuestions++;
      updateNumDisplay();
    }
  });
}

function updateNumDisplay() {
  document.getElementById("num-display").textContent   = numQuestions;
  document.getElementById("num-questions").value = numQuestions;
}

/* ======================================================================
   GENERATE QUESTIONS
   ====================================================================== */
async function generateQuestions() {
  const role       = document.getElementById("job-role").value.trim();
  const experience = document.getElementById("experience").value;
  const skills     = document.getElementById("skills").value.trim();
  const difficulty = document.getElementById("difficulty").value;
  const category   = document.getElementById("category").value;

  if (!role)   { showToast("Please enter a job role.", "error"); return; }
  if (!skills) { showToast("Please enter at least one skill.", "error"); return; }

  showLoader("Generating your personalized interview questions...");

  try {
    const resp = await apiFetch("/generate", "POST", {
      role, experience, skills, difficulty, category,
      num_questions: numQuestions,
    });

    currentQuestions   = resp.questions || [];
    currentMeta        = resp.meta || {};
    currentInterviewId = resp.id;

    renderQuestions(currentQuestions, currentMeta);
    showToast(`✅ ${currentQuestions.length} questions generated!`, "success");

    // Scroll to results
    setTimeout(() => {
      document.getElementById("output-results").scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);

  } catch (err) {
    showOutputError(err.message || "Generation failed. Please try again.");
    showToast("Generation failed: " + (err.message || "Unknown error"), "error");
  }
}

/* ======================================================================
   RESUME UPLOAD
   ====================================================================== */
function initResumeDragDrop() {
  const zone = document.getElementById("resume-drop-zone");
  if (!zone) return;

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.style.borderColor = "var(--primary)";
    zone.style.background  = "rgba(99,102,241,0.08)";
  });
  zone.addEventListener("dragleave", () => {
    zone.style.borderColor = "";
    zone.style.background  = "";
  });
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.style.borderColor = "";
    zone.style.background  = "";
    const file = e.dataTransfer.files[0];
    if (file) processResumeFile(file);
  });
}

function handleResumeUpload(event) {
  const file = event.target.files[0];
  if (file) processResumeFile(file);
}

function processResumeFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    resumeText = e.target.result;
    document.getElementById("resume-filename").textContent = "✅ " + file.name;
    document.getElementById("resume-btn").disabled = false;
    showToast("Resume loaded: " + file.name, "success");
  };
  reader.readAsText(file);
}

async function generateFromResume() {
  if (!resumeText.trim()) {
    showToast("Please upload a resume first.", "error");
    return;
  }

  showLoader("Analyzing resume and generating questions...");

  try {
    const resp = await apiFetch("/resume", "POST", {
      text: resumeText,
      num_questions: numQuestions,
    });

    currentQuestions = resp.questions || [];
    currentMeta = {
      role: "Resume-Based",
      experience: "N/A",
      skills: "From Resume",
      difficulty: "Mixed",
      category: "mixed",
    };

    renderQuestions(currentQuestions, currentMeta);
    showToast(`✅ ${currentQuestions.length} questions from resume!`, "success");

  } catch (err) {
    showOutputError(err.message || "Resume generation failed.");
    showToast("Failed: " + (err.message || "Unknown error"), "error");
  }
}

/* ======================================================================
   RENDER QUESTIONS
   ====================================================================== */
function renderQuestions(questions, meta) {
  hideLoader();

  const empty   = document.getElementById("output-empty");
  const results = document.getElementById("output-results");
  const list    = document.getElementById("questions-list");

  empty.classList.add("hidden");
  results.classList.remove("hidden");

  // Header info
  document.getElementById("output-title").textContent =
    `${meta.role || "Interview"} · ${capitalize(meta.experience || "")} · ${capitalize(meta.difficulty || "")}`;
  document.getElementById("output-meta").innerHTML =
    `<strong>${questions.length}</strong> questions · Skills: <strong>${meta.skills || "N/A"}</strong> · Category: <strong>${capitalize(meta.category || "mixed")}</strong>`;

  // Render each question card
  list.innerHTML = "";
  questions.forEach((q, i) => {
    list.appendChild(createQuestionCard(q, i));
  });
}

function createQuestionCard(q, index) {
  const card = document.createElement("div");
  card.className = "question-card fade-in";
  card.dataset.index = index;

  const typeClass = (q.type || "technical").toLowerCase().replace(/[^a-z]/g, "");
  const tags = (q.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join(" ");

  card.innerHTML = `
    <div class="q-header" onclick="toggleQuestion(this.parentElement)">
      <div class="q-number">${index + 1}</div>
      <div class="q-meta">
        <div class="q-type-row">
          <span class="q-badge ${typeClass}">${escHtml(q.type || "Technical")}</span>
          <span class="q-badge" style="background:rgba(255,255,255,0.07); color:var(--text-muted);">${escHtml(q.difficulty || "Medium")}</span>
          ${tags}
        </div>
        <div class="q-text">${escHtml(q.question || "")}</div>
      </div>
      <div class="q-toggle">▼</div>
    </div>
    <div class="q-body">
      <div class="answer-block">
        <div class="answer-label">📖 Model Answer</div>
        ${escHtml(q.answer || "").replace(/\n/g, "<br>")}
      </div>
      <div class="q-actions">
        <button class="btn btn-secondary btn-sm" onclick="copyQuestion(${index})">📋 Copy</button>
        <button class="btn btn-primary btn-sm" onclick="practiceQuestion(${index})">🎯 Practice</button>
        <button class="btn btn-secondary btn-sm" onclick="shareQuestion(${index})">🔗 Share</button>
      </div>
    </div>
  `;
  return card;
}

function toggleQuestion(card) {
  card.classList.toggle("expanded");
}

/* ======================================================================
   MOCK INTERVIEW
   ====================================================================== */
function practiceQuestion(index) {
  const q = currentQuestions[index];
  if (!q) return;

  mockQuestion = q;

  document.getElementById("mock-q-display").textContent = q.question;
  document.getElementById("mock-q-expected").textContent = q.answer;
  document.getElementById("mock-answer").value = "";

  hideEvalResult();

  document.getElementById("mock-interview").scrollIntoView({ behavior: "smooth" });
  showToast("Question loaded for mock interview.", "info");
}

function pickRandomQuestion() {
  if (!currentQuestions.length) {
    showToast("Generate questions first.", "error");
    return;
  }
  const idx = Math.floor(Math.random() * currentQuestions.length);
  practiceQuestion(idx);
}

async function evaluateAnswer() {
  if (!mockQuestion) {
    showToast("Select a question to practice first.", "error");
    return;
  }

  const userAnswer = document.getElementById("mock-answer").value.trim();
  if (!userAnswer) {
    showToast("Please write your answer first.", "error");
    return;
  }

  const evalLoader = document.getElementById("eval-loader");
  const evalBtn    = document.getElementById("eval-btn");
  evalLoader.classList.remove("hidden");
  evalBtn.disabled = true;
  hideEvalResult();

  try {
    const result = await apiFetch("/evaluate", "POST", {
      question:        mockQuestion.question,
      user_answer:     userAnswer,
      expected_answer: mockQuestion.answer,
    });

    renderEvalResult(result);
    showToast("Evaluation complete!", "success");

  } catch (err) {
    showToast("Evaluation failed: " + (err.message || "Unknown error"), "error");
  } finally {
    evalLoader.classList.add("hidden");
    evalBtn.disabled = false;
  }
}

function renderEvalResult(r) {
  document.getElementById("score-total").textContent    = r.total || "–";
  document.getElementById("score-accuracy").textContent = r.accuracy || "–";
  document.getElementById("score-comm").textContent     = r.communication || "–";
  document.getElementById("score-complete").textContent = r.completeness || "–";
  document.getElementById("eval-feedback").textContent  = r.feedback || "";

  const strengthsList = document.getElementById("eval-strengths");
  const improveList   = document.getElementById("eval-improvements");

  strengthsList.innerHTML = (r.strengths || []).map(s => `<li>${escHtml(s)}</li>`).join("");
  improveList.innerHTML   = (r.improvements || []).map(i => `<li>${escHtml(i)}</li>`).join("");

  document.getElementById("eval-result").classList.remove("hidden");
  document.getElementById("eval-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideEvalResult() {
  document.getElementById("eval-result").classList.add("hidden");
}

function clearMockAnswer() {
  document.getElementById("mock-answer").value = "";
  hideEvalResult();
}

/* ======================================================================
   VOICE RECOGNITION
   ====================================================================== */
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    const voiceBtn = document.getElementById("voice-btn");
    if (voiceBtn) voiceBtn.title = "Voice recognition not supported in this browser";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous    = true;
  recognition.interimResults = true;
  recognition.lang          = "en-US";

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    document.getElementById("mock-answer").value = transcript;
  };

  recognition.onend = () => {
    isRecording = false;
    updateVoiceBtn();
  };
}

function toggleVoice() {
  if (!recognition) {
    showToast("Voice recognition not supported in this browser.", "error");
    return;
  }
  if (isRecording) {
    recognition.stop();
    isRecording = false;
  } else {
    recognition.start();
    isRecording = true;
    showToast("🎤 Recording... speak your answer.", "info");
  }
  updateVoiceBtn();
}

function updateVoiceBtn() {
  const btn = document.getElementById("voice-btn");
  if (!btn) return;
  btn.classList.toggle("recording", isRecording);
  btn.textContent = isRecording ? "⏹️" : "🎤";
}

/* ======================================================================
   HISTORY
   ====================================================================== */
async function loadHistory() {
  const loader = document.getElementById("history-loader");
  const grid   = document.getElementById("history-grid");
  const empty  = document.getElementById("history-empty");

  loader.classList.remove("hidden");
  grid.innerHTML = "";
  empty.classList.add("hidden");

  try {
    const data = await apiFetch("/history", "GET");
    const interviews = data.interviews || [];

    loader.classList.add("hidden");

    if (!interviews.length) {
      empty.classList.remove("hidden");
      return;
    }

    interviews.forEach(iv => grid.appendChild(createHistoryCard(iv)));

  } catch (err) {
    loader.classList.add("hidden");
    grid.innerHTML = `<p style="color:var(--text-muted); text-align:center;">Failed to load history.</p>`;
  }
}

function createHistoryCard(iv) {
  const card = document.createElement("div");
  card.className = "history-card fade-in";

  const date = new Date(iv.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });

  card.innerHTML = `
    <div class="history-card-header">
      <div>
        <div class="history-role">${escHtml(iv.role)}</div>
        <div class="history-date">📅 ${date}</div>
      </div>
    </div>
    <div class="history-tags">
      <span class="tag">${capitalize(iv.experience)}</span>
      <span class="tag">${capitalize(iv.difficulty)}</span>
      <span class="tag">${iv.num_questions} Qs</span>
      <span class="tag">${capitalize(iv.category)}</span>
    </div>
    <div style="font-size:0.82rem; color:var(--text-muted); margin-bottom:16px;">
      Skills: ${escHtml(iv.skills)}
    </div>
    <div class="history-actions">
      <button class="btn btn-primary btn-sm" onclick="reopenInterview(${iv.id})">📂 Reopen</button>
      <button class="btn btn-danger btn-sm" onclick="deleteInterview(${iv.id}, this)">🗑️ Delete</button>
    </div>
  `;
  return card;
}

async function reopenInterview(id) {
  showToast("Loading interview...", "info");
  try {
    const data = await apiFetch(`/history/${id}`, "GET");
    currentQuestions   = data.questions || [];
    currentMeta        = {
      role:       data.role,
      experience: data.experience,
      skills:     data.skills,
      difficulty: data.difficulty,
      category:   data.category,
    };
    currentInterviewId = data.id;

    renderQuestions(currentQuestions, currentMeta);
    document.getElementById("generator").scrollIntoView({ behavior: "smooth" });
    showToast("Interview loaded successfully!", "success");

  } catch (err) {
    showToast("Failed to load interview.", "error");
  }
}

async function deleteInterview(id, btn) {
  if (!confirm("Delete this interview? This cannot be undone.")) return;

  try {
    await apiFetch(`/history/${id}`, "DELETE");
    btn.closest(".history-card").remove();
    showToast("Interview deleted.", "success");

    if (!document.querySelectorAll(".history-card").length) {
      document.getElementById("history-empty").classList.remove("hidden");
    }
  } catch (err) {
    showToast("Failed to delete interview.", "error");
  }
}

/* ======================================================================
   DOWNLOAD
   ====================================================================== */
async function downloadTxt() {
  if (!currentQuestions.length) { showToast("No questions to download.", "error"); return; }
  try {
    const blob = await apiDownload("/download/txt", { questions: currentQuestions, meta: currentMeta });
    triggerDownload(blob, "interview_questions.txt");
    showToast("TXT downloaded!", "success");
  } catch (err) {
    showToast("Download failed.", "error");
  }
}

async function downloadPdf() {
  if (!currentQuestions.length) { showToast("No questions to download.", "error"); return; }
  try {
    const blob = await apiDownload("/download/pdf", { questions: currentQuestions, meta: currentMeta });
    triggerDownload(blob, "interview_questions.pdf");
    showToast("PDF downloaded!", "success");
  } catch (err) {
    showToast("Download failed.", "error");
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ======================================================================
   COPY & SHARE
   ====================================================================== */
function copyQuestion(index) {
  const q = currentQuestions[index];
  if (!q) return;
  const text = `Q: ${q.question}\n\nA: ${q.answer}`;
  navigator.clipboard.writeText(text).then(() => showToast("Question copied!", "success"));
}

function copyAllQuestions() {
  if (!currentQuestions.length) { showToast("No questions to copy.", "error"); return; }
  const text = currentQuestions.map((q, i) =>
    `Question ${i+1} [${q.type}]:\n${q.question}\n\nAnswer:\n${q.answer}\n\n${"─".repeat(50)}`
  ).join("\n\n");
  navigator.clipboard.writeText(text).then(() => showToast("All questions copied!", "success"));
}

function shareQuestion(index) {
  const q = currentQuestions[index];
  if (!q) return;
  const text = `Interview Question:\n\n${q.question}\n\nAnswer: ${q.answer}\n\nPractice more at PrepAI!`;
  if (navigator.share) {
    navigator.share({ title: "Interview Question", text });
  } else {
    navigator.clipboard.writeText(text).then(() => showToast("Share text copied to clipboard!", "info"));
  }
}

/* ======================================================================
   LOADER HELPERS
   ====================================================================== */
function showLoader(msg = "Loading...") {
  document.getElementById("output-empty").classList.add("hidden");
  document.getElementById("output-results").classList.add("hidden");
  document.getElementById("output-loader").classList.remove("hidden");
  document.getElementById("loader-text").textContent = msg;

  // Simulate progress bar
  let progress = 0;
  const bar = document.getElementById("loader-progress");
  bar.style.width = "0%";
  const interval = setInterval(() => {
    progress += Math.random() * 12;
    if (progress > 90) { clearInterval(interval); return; }
    bar.style.width = progress + "%";
  }, 300);
  showLoader._interval = interval;
}

function hideLoader() {
  clearInterval(showLoader._interval);
  const bar = document.getElementById("loader-progress");
  if (bar) bar.style.width = "100%";
  setTimeout(() => {
    document.getElementById("output-loader").classList.add("hidden");
  }, 300);
}

function showOutputError(msg) {
  hideLoader();
  document.getElementById("output-empty").classList.remove("hidden");
  document.getElementById("output-empty").querySelector("h3").textContent = "Generation Failed";
  document.getElementById("output-empty").querySelector("p").textContent  = msg;
}

/* ======================================================================
   MODAL
   ====================================================================== */
function openModal(html) {
  document.getElementById("modal-body").innerHTML = html;
  document.getElementById("modal-overlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modal-overlay").classList.add("hidden");
  document.body.style.overflow = "";
}

function closeModalOnOverlay(e) {
  if (e.target === document.getElementById("modal-overlay")) closeModal();
}

/* ======================================================================
   TOAST
   ====================================================================== */
function showToast(msg, type = "info") {
  const container = document.getElementById("toast-container");
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || "ℹ️"}</span><span>${escHtml(msg)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("hiding");
    setTimeout(() => toast.remove(), 350);
  }, 4000);
}

/* ======================================================================
   SCROLL ANIMATIONS (Intersection Observer)
   ====================================================================== */
function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll(".fade-in").forEach(el => {
    el.style.opacity = "0";
    el.style.transform = "translateY(24px)";
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(el);
  });
}

/* ======================================================================
   API HELPERS
   ====================================================================== */
async function apiFetch(endpoint, method = "GET", body = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);

  const resp = await fetch(API_BASE + endpoint, opts);
  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    throw new Error(data.error || `HTTP ${resp.status}`);
  }
  return data;
}

async function apiDownload(endpoint, body) {
  const resp = await fetch(API_BASE + endpoint, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  if (!resp.ok) throw new Error("Download failed");
  return await resp.blob();
}

/* ======================================================================
   UTILITIES
   ====================================================================== */
function escHtml(str) {
  if (typeof str !== "string") return String(str || "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
