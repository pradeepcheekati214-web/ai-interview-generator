"""
AI service – uses Groq (free tier) with llama-3.3-70b-versatile.
Drop-in replacement for the original Gemini service.
Get a free API key at: https://console.groq.com/keys
"""

import os
import json
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

MODEL_NAME = "llama-3.3-70b-versatile"


def _get_client():
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set.")
    return Groq(api_key=api_key)


def _extract_json(text: str) -> str:
    """Strip markdown code fences and return raw JSON string."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        return match.group(1).strip()
    return text


def generate_questions(role: str, experience: str, skills: str,
                       difficulty: str, category: str, num_questions: int) -> dict:
    """Generate interview questions and return parsed JSON."""
    client = _get_client()

    category_instruction = {
        "technical":  "Only Technical questions.",
        "hr":         "Only HR and behavioral questions.",
        "behavioral": "Only Behavioral and situational questions.",
        "scenario":   "Only Scenario-based and case-study questions.",
        "mixed":      "A mix of Technical, HR, Behavioral, and Scenario-based questions.",
    }.get(category.lower(), "A mix of all question types.")

    prompt = f"""You are an expert technical interviewer. Generate exactly {num_questions} interview questions.

Candidate Profile:
- Job Role: {role}
- Experience Level: {experience}
- Skills: {skills}
- Difficulty: {difficulty}
- Category: {category_instruction}

Rules:
1. Each question must match the specified difficulty ({difficulty}).
2. Each question must have a detailed, accurate answer.
3. Return ONLY valid JSON – no markdown, no explanation outside the JSON.

Return this exact JSON structure:
{{
  "questions": [
    {{
      "id": 1,
      "type": "Technical | HR | Behavioral | Scenario",
      "question": "Question text here",
      "answer": "Detailed answer here",
      "difficulty": "{difficulty}",
      "tags": ["tag1", "tag2"]
    }}
  ]
}}"""

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=4096,
    )

    raw = _extract_json(response.choices[0].message.content)
    data = json.loads(raw)
    return data


def evaluate_answer(question: str, user_answer: str, expected_answer: str) -> dict:
    """Evaluate a candidate's answer and return scores + feedback."""
    client = _get_client()

    prompt = f"""You are a strict but fair technical interviewer evaluating a candidate's answer.

Question:
{question}

Expected Answer (reference):
{expected_answer}

Candidate's Answer:
{user_answer}

Evaluate on THREE dimensions, each scored out of 10:
1. Accuracy     – Is the answer factually correct?
2. Communication – Is it clearly expressed?
3. Completeness – Does it cover all important aspects?

Return ONLY valid JSON with this exact structure:
{{
  "accuracy": <score 0-10>,
  "communication": <score 0-10>,
  "completeness": <score 0-10>,
  "total": <average of the three, rounded to 1 decimal>,
  "feedback": "2-3 sentences of constructive feedback",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"]
}}"""

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1024,
    )

    raw = _extract_json(response.choices[0].message.content)
    data = json.loads(raw)
    return data


def generate_questions_from_resume(resume_text: str, num_questions: int = 10) -> dict:
    """Generate interview questions based on resume content."""
    client = _get_client()

    prompt = f"""You are an expert technical interviewer. Based on the following resume content, generate {num_questions} targeted interview questions.

Resume Content:
{resume_text[:4000]}

Rules:
1. Generate questions relevant to the skills, projects, and experience mentioned.
2. Include a mix of Technical, Behavioral, and HR questions.
3. Each question must have a detailed answer.
4. Return ONLY valid JSON.

Return this exact JSON structure:
{{
  "questions": [
    {{
      "id": 1,
      "type": "Technical | HR | Behavioral | Scenario",
      "question": "Question text here",
      "answer": "Detailed answer here",
      "difficulty": "Medium",
      "tags": ["tag1", "tag2"]
    }}
  ]
}}"""

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=4096,
    )

    raw = _extract_json(response.choices[0].message.content)
    data = json.loads(raw)
    return data
