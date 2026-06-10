"""
Data models / validation helpers.
"""

from dataclasses import dataclass, field
from typing import Optional


VALID_EXPERIENCE = {"fresher", "junior", "mid", "senior", "lead"}
VALID_DIFFICULTY = {"easy", "medium", "hard"}
VALID_CATEGORY   = {"technical", "hr", "behavioral", "scenario", "mixed"}


@dataclass
class GenerateRequest:
    role: str
    experience: str
    skills: str
    difficulty: str
    category: str
    num_questions: int

    @classmethod
    def from_dict(cls, data: dict) -> "GenerateRequest":
        role          = (data.get("role") or "").strip()
        experience    = (data.get("experience") or "").strip().lower()
        skills        = (data.get("skills") or "").strip()
        difficulty    = (data.get("difficulty") or "medium").strip().lower()
        category      = (data.get("category") or "mixed").strip().lower()
        num_questions = int(data.get("num_questions") or 10)

        errors = []
        if not role:
            errors.append("role is required.")
        if len(role) > 100:
            errors.append("role must be under 100 characters.")
        if experience not in VALID_EXPERIENCE:
            errors.append(f"experience must be one of: {', '.join(VALID_EXPERIENCE)}.")
        if not skills:
            errors.append("skills is required.")
        if len(skills) > 300:
            errors.append("skills must be under 300 characters.")
        if difficulty not in VALID_DIFFICULTY:
            errors.append(f"difficulty must be one of: {', '.join(VALID_DIFFICULTY)}.")
        if category not in VALID_CATEGORY:
            errors.append(f"category must be one of: {', '.join(VALID_CATEGORY)}.")
        if not (1 <= num_questions <= 30):
            errors.append("num_questions must be between 1 and 30.")

        if errors:
            raise ValueError(" | ".join(errors))

        return cls(role=role, experience=experience, skills=skills,
                   difficulty=difficulty, category=category, num_questions=num_questions)


@dataclass
class EvaluateRequest:
    question: str
    user_answer: str
    expected_answer: str

    @classmethod
    def from_dict(cls, data: dict) -> "EvaluateRequest":
        question        = (data.get("question") or "").strip()
        user_answer     = (data.get("user_answer") or "").strip()
        expected_answer = (data.get("expected_answer") or "").strip()

        errors = []
        if not question:
            errors.append("question is required.")
        if not user_answer:
            errors.append("user_answer is required.")
        if not expected_answer:
            errors.append("expected_answer is required.")
        if len(user_answer) > 5000:
            errors.append("user_answer must be under 5000 characters.")

        if errors:
            raise ValueError(" | ".join(errors))

        return cls(question=question, user_answer=user_answer, expected_answer=expected_answer)
