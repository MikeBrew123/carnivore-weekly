#!/usr/bin/env python3
"""
Q&A Generator with Scientific Citations

Generates evidence-based answers to common carnivore diet questions
with links to scientific literature.

Uses Claude Haiku for cost-effectiveness (~$0.02 per run)

Author: Created with Claude Code
Date: 2025-12-26
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()

# ============================================================================
# CONFIGURATION
# ============================================================================

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
ANALYZED_FILE = DATA_DIR / "analyzed_content.json"

# Use Haiku for cost savings
CLAUDE_MODEL = "claude-3-5-haiku-20241022"


# ============================================================================
# Q&A GENERATOR
# ============================================================================


class QAGenerator:
    """Generates evidence-based answers with scientific citations"""

    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not found")

        self.client = Anthropic(api_key=api_key)
        print("✓ Claude Haiku initialized for Q&A generation")

    def generate_answer(self, question: str) -> dict:
        """
        Generate an evidence-based answer with scientific citations
        """
        prompt = f"""You are a nutrition science expert. Answer this carnivore diet question with:
1. A clear, evidence-based answer (2-3 paragraphs)
2. Scientific citations (PubMed links when available)
3. Balanced perspective (acknowledge limitations/debates)

Question: {question}

Provide response in JSON format:
{{
  "answer": "Detailed evidence-based answer...",
  "citations": [
    {{
      "title": "Study title",
      "authors": "Author et al.",
      "year": 2023,
      "url": "https://pubmed.ncbi.nlm.nih.gov/PMID or DOI link",
      "summary": "Brief summary of findings"
    }}
  ],
  "caveats": "Any important caveats or limitations"
}}

Focus on peer-reviewed research. If no direct studies exist, cite related research on low-carb/ketogenic diets."""

        try:
            message = self.client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}],
            )

            response_text = message.content[0].text

            # Extract JSON
            start = response_text.find("{")
            end = response_text.rfind("}") + 1

            if start != -1 and end > start:
                answer_data = json.loads(response_text[start:end])
                return answer_data
            else:
                raise ValueError("No JSON in response")

        except Exception as e:
            print(f"   ⚠ Error generating answer: {e}")
            return {
                "answer": "Answer pending - check scientific literature for evidence-based information.",
                "citations": [],
                "caveats": "Consult healthcare professionals for personalized advice.",
            }

    def add_qa_to_analysis(self):
        """
        Load common questions and generate answers
        """
        print("\n" + "=" * 70)
        print("📚 Q&A GENERATOR WITH SCIENTIFIC CITATIONS")
        print("=" * 70)

        # Load existing analysis
        print(f"\n📂 Loading analysis...")
        with open(ANALYZED_FILE, "r") as f:
            data = json.load(f)

        questions = data["analysis"]["community_sentiment"].get("common_questions", [])

        if not questions:
            print("✗ No common questions found in analysis")
            return

        print(f"\n🤖 Generating answers for {len(questions)} questions...")

        qa_list = []
        for i, question in enumerate(questions, 1):
            print(f"\n   [{i}/{len(questions)}] {question}")

            answer_data = self.generate_answer(question)

            qa_list.append(
                {
                    "question": question,
                    "answer": answer_data["answer"],
                    "citations": answer_data.get("citations", []),
                    "caveats": answer_data.get("caveats", ""),
                }
            )

            print(
                f"      ✓ Answer generated ({len(answer_data.get('citations', []))} citations)"
            )

        # Add Q&A to analysis
        data["analysis"]["qa_section"] = qa_list

        # Save updated analysis
        print(f"\n💾 Saving updated analysis...")
        with open(ANALYZED_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print("\n" + "=" * 70)
        print("✓ Q&A GENERATION COMPLETE!")
        print("=" * 70)
        print(f"\n📚 Generated {len(qa_list)} Q&A pairs with citations")
        print(f"💰 Cost: ~$0.02 (using Haiku)")
        print(f"📁 Updated: {ANALYZED_FILE}")
        print("\nNext: Run generate_pages.py to update the website!\n")


def main():
    try:
        generator = QAGenerator(ANTHROPIC_API_KEY)
        generator.add_qa_to_analysis()

    except ValueError as e:
        print(f"\n✗ Configuration Error: {e}")

    except FileNotFoundError as e:
        print(f"\n✗ File Error: {e}")

    except KeyboardInterrupt:
        print("\n\n⚠ Interrupted by user")

    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        raise


if __name__ == "__main__":
    main()
