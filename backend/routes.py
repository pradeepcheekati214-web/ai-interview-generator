"""
Flask route definitions.
"""

import json
import io
from flask import Blueprint, request, jsonify, send_file
from fpdf import FPDF

from database import save_interview, get_all_interviews, get_interview_by_id, delete_interview
from gemini_service import generate_questions, evaluate_answer, generate_questions_from_resume
from models import GenerateRequest, EvaluateRequest

api = Blueprint("api", __name__)


# ─────────────────────────────────────────────
# POST /generate
# ─────────────────────────────────────────────
@api.route("/generate", methods=["POST"])
def generate():
    """Generate interview questions via Gemini."""
    try:
        payload = request.get_json(force=True) or {}
        req = GenerateRequest.from_dict(payload)
    except (ValueError, TypeError) as e:
        return jsonify({"error": str(e)}), 400

    try:
        result = generate_questions(
            role=req.role,
            experience=req.experience,
            skills=req.skills,
            difficulty=req.difficulty,
            category=req.category,
            num_questions=req.num_questions,
        )
    except Exception as e:
        return jsonify({"error": f"AI generation failed: {str(e)}"}), 500

    questions_json = json.dumps(result.get("questions", []))
    interview_id = save_interview(
        role=req.role,
        experience=req.experience,
        skills=req.skills,
        difficulty=req.difficulty,
        category=req.category,
        num_questions=req.num_questions,
        questions_json=questions_json,
    )

    return jsonify({
        "id":        interview_id,
        "questions": result.get("questions", []),
        "meta": {
            "role":          req.role,
            "experience":    req.experience,
            "skills":        req.skills,
            "difficulty":    req.difficulty,
            "category":      req.category,
            "num_questions": req.num_questions,
        },
    }), 200


# ─────────────────────────────────────────────
# POST /evaluate
# ─────────────────────────────────────────────
@api.route("/evaluate", methods=["POST"])
def evaluate():
    """Evaluate a candidate's answer with Gemini."""
    try:
        payload = request.get_json(force=True) or {}
        req = EvaluateRequest.from_dict(payload)
    except (ValueError, TypeError) as e:
        return jsonify({"error": str(e)}), 400

    try:
        result = evaluate_answer(
            question=req.question,
            user_answer=req.user_answer,
            expected_answer=req.expected_answer,
        )
    except Exception as e:
        return jsonify({"error": f"Evaluation failed: {str(e)}"}), 500

    return jsonify(result), 200


# ─────────────────────────────────────────────
# GET /history
# ─────────────────────────────────────────────
@api.route("/history", methods=["GET"])
def history():
    """Return list of all saved interviews (metadata only)."""
    interviews = get_all_interviews()
    return jsonify({"interviews": interviews}), 200


# ─────────────────────────────────────────────
# GET /history/<id>
# ─────────────────────────────────────────────
@api.route("/history/<int:interview_id>", methods=["GET"])
def history_detail(interview_id):
    """Return a single interview with full questions."""
    interview = get_interview_by_id(interview_id)
    if not interview:
        return jsonify({"error": "Interview not found."}), 404

    interview["questions"] = json.loads(interview.get("questions", "[]"))
    return jsonify(interview), 200


# ─────────────────────────────────────────────
# DELETE /history/<id>
# ─────────────────────────────────────────────
@api.route("/history/<int:interview_id>", methods=["DELETE"])
def delete_history(interview_id):
    """Delete an interview by id."""
    deleted = delete_interview(interview_id)
    if not deleted:
        return jsonify({"error": "Interview not found."}), 404
    return jsonify({"message": "Interview deleted successfully."}), 200


# ─────────────────────────────────────────────
# POST /download/txt
# ─────────────────────────────────────────────
@api.route("/download/txt", methods=["POST"])
def download_txt():
    """Generate and return a plain-text file of questions."""
    payload   = request.get_json(force=True) or {}
    questions = payload.get("questions", [])
    meta      = payload.get("meta", {})

    lines = [
        "=" * 60,
        "  AI INTERVIEW QUESTION GENERATOR",
        "=" * 60,
        f"Role       : {meta.get('role', 'N/A')}",
        f"Experience : {meta.get('experience', 'N/A')}",
        f"Skills     : {meta.get('skills', 'N/A')}",
        f"Difficulty : {meta.get('difficulty', 'N/A')}",
        f"Category   : {meta.get('category', 'N/A')}",
        "=" * 60,
        "",
    ]

    for i, q in enumerate(questions, 1):
        lines += [
            f"Question {i} [{q.get('type', '')}] [{q.get('difficulty', '')}]",
            "-" * 50,
            q.get("question", ""),
            "",
            "Answer:",
            q.get("answer", ""),
            "",
        ]

    content = "\n".join(lines)
    buf = io.BytesIO(content.encode("utf-8"))
    buf.seek(0)
    return send_file(buf, mimetype="text/plain",
                     as_attachment=True, download_name="interview_questions.txt")


# ─────────────────────────────────────────────
# POST /download/pdf
# ─────────────────────────────────────────────
@api.route("/download/pdf", methods=["POST"])
def download_pdf():
    """Generate and return a PDF of questions."""
    payload   = request.get_json(force=True) or {}
    questions = payload.get("questions", [])
    meta      = payload.get("meta", {})

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Title
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(99, 102, 241)
    pdf.cell(0, 12, "AI Interview Question Generator", ln=True, align="C")
    pdf.set_draw_color(99, 102, 241)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)

    # Meta info
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(80, 80, 80)
    for label, key in [("Role", "role"), ("Experience", "experience"),
                       ("Skills", "skills"), ("Difficulty", "difficulty"),
                       ("Category", "category")]:
        pdf.cell(35, 7, f"{label}:", ln=False)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 7, str(meta.get(key, "N/A")), ln=True)
        pdf.set_font("Helvetica", "", 10)
    pdf.ln(4)

    # Questions
    for i, q in enumerate(questions, 1):
        # Question header
        pdf.set_fill_color(240, 240, 255)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(0, 9,
                 f"Q{i}. [{q.get('type', '')}]  [{q.get('difficulty', '')}]",
                 ln=True, fill=True)

        # Question text
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(20, 20, 20)
        pdf.multi_cell(0, 6, q.get("question", ""))
        pdf.ln(2)

        # Answer
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(99, 102, 241)
        pdf.cell(0, 7, "Answer:", ln=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(50, 50, 50)
        pdf.multi_cell(0, 6, q.get("answer", ""))
        pdf.ln(4)

    buf = io.BytesIO(pdf.output())
    buf.seek(0)
    return send_file(buf, mimetype="application/pdf",
                     as_attachment=True, download_name="interview_questions.pdf")


# ─────────────────────────────────────────────
# POST /resume
# ─────────────────────────────────────────────
@api.route("/resume", methods=["POST"])
def resume_upload():
    """Accept resume text and generate tailored questions."""
    if "file" in request.files:
        f = request.files["file"]
        resume_text = f.read().decode("utf-8", errors="ignore")
    else:
        body = request.get_json(force=True) or {}
        resume_text = body.get("text", "")

    num_questions = int(request.form.get("num_questions", 10) if request.form else
                        (request.get_json(force=True) or {}).get("num_questions", 10))

    if not resume_text.strip():
        return jsonify({"error": "Resume content is required."}), 400

    try:
        result = generate_questions_from_resume(resume_text, num_questions)
    except Exception as e:
        return jsonify({"error": f"AI generation failed: {str(e)}"}), 500

    return jsonify({"questions": result.get("questions", [])}), 200


# ─────────────────────────────────────────────
# GET /health
# ─────────────────────────────────────────────
@api.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "AI Interview Generator API"}), 200
