#!/usr/bin/env python3
"""
Personas Helper Module

Provides utilities for applying distinct writing personas to automation content.
Each persona (Sarah, Marcus, Chloe) has their own voice and signing style.

Usage:
    from personas_helper import PersonaManager

    pm = PersonaManager()
    content = pm.apply_persona(text, "sarah")  # Applies Sarah's voice + signature
"""

import json
from pathlib import Path
from typing import Optional

PROJECT_ROOT = Path(__file__).parent.parent
PERSONAS_FILE = PROJECT_ROOT / "data" / "personas.json"


class PersonaManager:
    """Manages persona assignment and content signing"""

    def __init__(self):
        """Initialize persona manager with available personas"""
        self.personas = self._load_personas()

    def _load_personas(self) -> dict:
        """Load personas from JSON file"""
        if not PERSONAS_FILE.exists():
            print("⚠️  personas.json not found. Create it first!")
            return {}

        with open(PERSONAS_FILE, "r") as f:
            data = json.load(f)
        return data.get("personas", {})

    def get_persona(self, persona_name: str) -> Optional[dict]:
        """Get persona by name (e.g., 'sarah', 'marcus', 'chloe')"""
        return self.personas.get(persona_name.lower())

    def get_persona_list(self) -> list:
        """Get list of available personas"""
        return list(self.personas.keys())

    def get_persona_signature(self, persona_name: str) -> str:
        """Get persona's signature (e.g., '-Sarah')"""
        persona = self.get_persona(persona_name)
        return persona.get("signature", "") if persona else ""

    def apply_persona(self, content: str, persona_name: str) -> str:
        """
        Apply persona's signature to content.

        Args:
            content: The generated content text
            persona_name: Name of persona ('sarah', 'marcus', 'chloe')

        Returns:
            Content with persona signature appended
        """
        persona = self.get_persona(persona_name)
        if not persona:
            return content

        signature = persona.get("signature", "")
        # Add signature if not already present
        if signature and signature not in content:
            return f"{content}\n\n{signature}"
        return content

    def get_persona_context(self, persona_name: str) -> str:
        """
        Get persona context for Claude API prompts.
        Returns a string that can be injected into prompts to guide tone.
        """
        persona = self.get_persona(persona_name)
        if not persona:
            return ""

        style = persona.get("writing_style", {})
        characteristics = ", ".join(style.get("characteristics", []))

        return f"""You are writing as {persona.get('name')}, "{persona.get('title')}".

Personality: {persona.get('personality')}

Writing Style: {style.get('tone')}
- {characteristics}

Tech Interests: {', '.join(persona.get('tech_interests', []))}

Content Focus: {', '.join(style.get('content_types', []))}

Remember to:
1. Write in {persona.get('name')}'s voice
2. Reference their tech interests naturally if relevant
3. Match their personality and tone
4. Sign with: {persona.get('signature')}"""

    def get_opening_pattern(self, persona_name: str) -> str:
        """Get a typical opening pattern for the persona"""
        persona = self.get_persona(persona_name)
        if not persona:
            return ""

        patterns = persona.get("writing_style", {}).get("opening_patterns", [])
        return patterns[0] if patterns else ""

    def format_with_persona(
        self, content: str, persona_name: str, add_signature: bool = True
    ) -> str:
        """
        Format content with persona signature and context.

        Args:
            content: The content to format
            persona_name: Persona name
            add_signature: Whether to add the persona signature

        Returns:
            Formatted content
        """
        if add_signature:
            content = self.apply_persona(content, persona_name)

        return content

    def print_personas(self) -> None:
        """Print available personas (useful for debugging)"""
        print("\n" + "=" * 70)
        print("AVAILABLE PERSONAS")
        print("=" * 70)

        for name, persona in self.personas.items():
            print(f"\n📝 {persona.get('name')} - {persona.get('title')}")
            print(f"   {persona.get('subtitle')}")
            print(f"   Signature: {persona.get('signature')}")
            print(f"   Tech: {', '.join(persona.get('tech_interests', [])[:2])}")
            print(
                f"   Style: {persona.get('writing_style', {}).get('tone', 'N/A')}"
            )

        print("\n" + "=" * 70 + "\n")


# Quick helper functions
def get_persona_prompt(persona_name: str) -> str:
    """Quick function to get persona context for Claude prompts"""
    pm = PersonaManager()
    return pm.get_persona_context(persona_name)


def sign_content(content: str, persona_name: str) -> str:
    """Quick function to sign content with persona"""
    pm = PersonaManager()
    return pm.apply_persona(content, persona_name)


if __name__ == "__main__":
    # Demo: Show available personas
    pm = PersonaManager()
    pm.print_personas()

    # Demo: Get persona context
    print("\nExample prompt for Sarah:")
    print(pm.get_persona_context("sarah"))
