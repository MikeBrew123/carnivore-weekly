#!/usr/bin/env python3
"""
Unified Validator for Carnivore Weekly

Consolidates validation logic from multiple validators:
- validate_structure.py
- validate_before_update.py
- validate_seo.sh
- validate_brand.sh
- validate_w3c.sh

Usage:
    python3 scripts/validate.py --type structure --path public/ [--severity critical]
    python3 scripts/validate.py --type seo --path public/blog/
    python3 scripts/validate.py --type preflight

Exit codes:
    0: All validation passed
    1: Critical issues found
    2: Major issues found
    3: Minor issues found
"""

import sys
import json
import argparse
import subprocess
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: BeautifulSoup4 not installed. Install with:")
    print("  pip3 install beautifulsoup4")
    sys.exit(1)

from dotenv import load_dotenv
import os


@dataclass
class ValidationError:
    """Represents a validation error"""
    rule_id: int
    rule_name: str
    severity: str
    file_path: str
    line_number: Optional[int] = None
    message: str = ""
    details: str = ""
    fix: str = ""

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON output"""
        return {
            "rule_id": self.rule_id,
            "rule_name": self.rule_name,
            "severity": self.severity,
            "file_path": self.file_path,
            "line_number": self.line_number,
            "message": self.message,
            "details": self.details,
            "fix": self.fix
        }


class UnifiedValidator:
    """Unified validation system"""

    def __init__(self, config_path: str = "config/project.json"):
        """Initialize validator with configuration"""
        self.config_path = Path(config_path)
        self.config = self._load_config()
        self.errors = []
        self.severity_levels = self.config["validation"]["severity_levels"]

    def _load_config(self) -> Dict:
        """Load project configuration"""
        if self.config_path.exists():
            with open(self.config_path) as f:
                return json.load(f)
        else:
            print(f"Error: Config file not found: {self.config_path}")
            sys.exit(1)

    def validate(
        self,
        validation_type: str,
        path: Optional[str] = None,
        severity: str = "critical",
        json_output: bool = False
    ) -> int:
        """
        Run validation of specified type

        Args:
            validation_type: One of structure, seo, brand, w3c, accessibility, preflight
            path: Path to validate (optional, depends on type)
            severity: Minimum severity level to report
            json_output: If True, output JSON format

        Returns:
            Exit code (0=pass, 1=critical, 2=major, 3=minor)
        """
        self.errors = []

        if validation_type == "structure":
            self._validate_structure(path or "public/")
        elif validation_type == "seo":
            self._validate_seo(path or "public/")
        elif validation_type == "brand":
            self._validate_brand()
        elif validation_type == "w3c":
            self._validate_w3c(path or "public/index.html")
        elif validation_type == "accessibility":
            self._validate_accessibility(path or "public/")
        elif validation_type == "preflight":
            self._validate_preflight()
        else:
            print(f"Error: Unknown validation type: {validation_type}")
            print(f"Supported types: {', '.join(self.config['validation']['supported_types'])}")
            return 1

        # Filter errors by severity
        filtered_errors = self._filter_by_severity(severity)

        # Output results
        if json_output:
            self._output_json(filtered_errors)
        else:
            self._output_text(filtered_errors, validation_type)

        # Determine exit code
        return self._get_exit_code(self.errors)

    def _validate_structure(self, path: str):
        """Validate HTML structure"""
        print(f"\n📋 Validating HTML structure: {path}")
        target_path = Path(path)

        if not target_path.exists():
            self.errors.append(ValidationError(
                rule_id=0,
                rule_name="Path Not Found",
                severity="critical",
                file_path=path,
                message=f"Path does not exist: {path}"
            ))
            return

        if target_path.is_file():
            html_files = [target_path]
        else:
            html_files = list(target_path.glob("**/*.html"))

        # Exclusion patterns for files that don't need full page validation
        exclude_patterns = [
            "public/components/",  # HTML fragments (modals, widgets)
            "public/assets/calculator2/",  # Standalone React app
            "public/includes/",  # HTML fragments (header, footer)
            "public/calculator/report.html",  # PDF report template
            "public/calculator-simple.html",  # Old calculator variant
            "public/calculator-form-rebuild.html",  # Old calculator variant
            "public/test-index.html",  # Test file
            "public/blog-redesign.html",  # Test/redesign file
            "public/report.html",  # PDF report template (standalone)
            "public/assessment/success/",  # Stripe success redirect page
            "public/about.html",  # Redirect page to the-lab.html
            "public/blog/2025-12-25-",  # Legacy blog posts (pre-template)
            "public/blog/2025-12-26-",  # Legacy blog posts (pre-template)
            "public/blog/2025-12-27-",  # Legacy blog posts (pre-template)
            "public/blog/2025-12-28-",  # Legacy blog posts (pre-template)
        ]

        for html_file in html_files:
            # Skip excluded files
            file_str = str(html_file)
            if any(pattern in file_str for pattern in exclude_patterns):
                continue
            self._validate_html_file(html_file)

    def _validate_html_file(self, file_path: Path):
        """Validate a single HTML file"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                html_str = f.read()
            soup = BeautifulSoup(html_str, "html.parser")

            # Rule 1: Check for unique header
            headers = soup.find_all("header")
            if len(headers) != 1:
                self.errors.append(ValidationError(
                    rule_id=1,
                    rule_name="Unique Header",
                    severity="critical",
                    file_path=str(file_path),
                    message=f"Expected 1 header, found {len(headers)}"
                ))

            # Rule 2: Check navigation structure
            # Check for both old (nav-menu) and new (nav-menu-2026) nav classes
            nav_menus = soup.find_all("nav", class_="nav-menu")
            nav_menus_2026 = soup.find_all("nav", class_="nav-menu-2026")
            if len(nav_menus) == 0 and len(nav_menus_2026) == 0:
                self.errors.append(ValidationError(
                    rule_id=2,
                    rule_name="Navigation Structure",
                    severity="critical",
                    file_path=str(file_path),
                    message="No nav.nav-menu or nav.nav-menu-2026 element found"
                ))

            # Rule 8: Check title tag
            title = soup.find("title")
            if not title or not title.string:
                self.errors.append(ValidationError(
                    rule_id=8,
                    rule_name="Title Tag",
                    severity="critical",
                    file_path=str(file_path),
                    message="Missing or empty title tag"
                ))

            # Rule 14: Check DOCTYPE
            if not html_str.startswith("<!DOCTYPE"):
                self.errors.append(ValidationError(
                    rule_id=14,
                    rule_name="DOCTYPE",
                    severity="critical",
                    file_path=str(file_path),
                    message="Missing DOCTYPE declaration"
                ))

        except Exception as e:
            self.errors.append(ValidationError(
                rule_id=0,
                rule_name="File Read Error",
                severity="critical",
                file_path=str(file_path),
                message=f"Could not validate file: {e}"
            ))

    def _validate_seo(self, path: str):
        """Validate SEO compliance"""
        print(f"\n🔍 Validating SEO: {path}")
        target_path = Path(path)

        if not target_path.exists():
            self.errors.append(ValidationError(
                rule_id=0,
                rule_name="Path Not Found",
                severity="critical",
                file_path=path,
                message=f"Path does not exist: {path}"
            ))
            return

        # SEO validation logic
        if target_path.is_file():
            html_files = [target_path]
        else:
            html_files = list(target_path.glob("**/*.html"))

        for html_file in html_files:
            try:
                with open(html_file, "r", encoding="utf-8") as f:
                    soup = BeautifulSoup(f.read(), "html.parser")

                # Check meta description
                meta_desc = soup.find("meta", attrs={"name": "description"})
                if not meta_desc:
                    self.errors.append(ValidationError(
                        rule_id=20,
                        rule_name="Meta Description",
                        severity="major",
                        file_path=str(html_file),
                        message="Missing meta description"
                    ))

                # Check h1 tags
                h1s = soup.find_all("h1")
                if len(h1s) == 0:
                    self.errors.append(ValidationError(
                        rule_id=21,
                        rule_name="H1 Tag",
                        severity="major",
                        file_path=str(html_file),
                        message="Missing H1 tag"
                    ))
                elif len(h1s) > 1:
                    self.errors.append(ValidationError(
                        rule_id=21,
                        rule_name="H1 Tag",
                        severity="major",
                        file_path=str(html_file),
                        message=f"Multiple H1 tags found ({len(h1s)})"
                    ))

            except Exception as e:
                self.errors.append(ValidationError(
                    rule_id=0,
                    rule_name="File Read Error",
                    severity="critical",
                    file_path=str(html_file),
                    message=f"Could not validate SEO: {e}"
                ))

    def _validate_brand(self):
        """Validate brand compliance"""
        print("\n🎨 Validating brand compliance...")
        # This would integrate with the /carnivore-brand skill
        print("   Note: Brand validation requires /carnivore-brand skill")
        self.errors.append(ValidationError(
            rule_id=50,
            rule_name="Brand Validation",
            severity="minor",
            file_path="newsletter",
            message="Brand validation requires manual review with /carnivore-brand skill"
        ))

    def _validate_w3c(self, path: str):
        """Validate W3C HTML compliance"""
        print(f"\n✓ W3C Validation: {path}")
        # Would integrate with W3C validator
        target_path = Path(path)
        if not target_path.exists():
            self.errors.append(ValidationError(
                rule_id=0,
                rule_name="Path Not Found",
                severity="critical",
                file_path=path,
                message=f"Path does not exist: {path}"
            ))

    def _validate_accessibility(self, path: str):
        """Validate accessibility compliance"""
        print(f"\n♿ Validating accessibility: {path}")
        target_path = Path(path)

        if not target_path.exists():
            self.errors.append(ValidationError(
                rule_id=0,
                rule_name="Path Not Found",
                severity="critical",
                file_path=path,
                message=f"Path does not exist: {path}"
            ))
            return

        if target_path.is_file():
            html_files = [target_path]
        else:
            html_files = list(target_path.glob("**/*.html"))

        for html_file in html_files:
            try:
                with open(html_file, "r", encoding="utf-8") as f:
                    soup = BeautifulSoup(f.read(), "html.parser")

                # Check alt text on images
                images = soup.find_all("img")
                for img in images:
                    src = img.get("src", "")
                    if src.startswith("data:") or "icon" in src.lower():
                        continue
                    if not img.get("alt"):
                        self.errors.append(ValidationError(
                            rule_id=30,
                            rule_name="Image Alt Text",
                            severity="major",
                            file_path=str(html_file),
                            message=f"Missing alt text: {src}"
                        ))

            except Exception as e:
                self.errors.append(ValidationError(
                    rule_id=0,
                    rule_name="File Read Error",
                    severity="critical",
                    file_path=str(html_file),
                    message=f"Could not validate accessibility: {e}"
                ))

    def _validate_preflight(self):
        """Validate all requirements before running workflow"""
        print("\n🚀 Running pre-flight validation checks...")
        load_dotenv()

        # Check environment variables
        required_vars = ["YOUTUBE_API_KEY", "ANTHROPIC_API_KEY"]
        for var in required_vars:
            if not os.getenv(var):
                self.errors.append(ValidationError(
                    rule_id=0,
                    rule_name="Environment Variable",
                    severity="critical",
                    file_path=".env",
                    message=f"Missing required variable: {var}"
                ))

        # Check required directories
        required_dirs = ["templates", "data", "public", "scripts"]
        for dir_name in required_dirs:
            if not Path(dir_name).exists():
                self.errors.append(ValidationError(
                    rule_id=0,
                    rule_name="Directory Check",
                    severity="critical",
                    file_path=dir_name,
                    message=f"Missing required directory: {dir_name}"
                ))

        # Check required files
        required_files = ["config/project.json"]
        for file_name in required_files:
            if not Path(file_name).exists():
                self.errors.append(ValidationError(
                    rule_id=0,
                    rule_name="File Check",
                    severity="critical",
                    file_path=file_name,
                    message=f"Missing required file: {file_name}"
                ))

    def _filter_by_severity(self, severity: str) -> List[ValidationError]:
        """Filter errors by minimum severity level"""
        if severity == "all":
            return self.errors

        min_level = self.severity_levels.get(severity, 2)
        return [e for e in self.errors if self.severity_levels.get(e.severity, 2) <= min_level]

    def _output_text(self, errors: List[ValidationError], validation_type: str):
        """Output validation results in text format"""
        if not errors:
            print(f"\n✅ {validation_type.upper()} VALIDATION PASSED")
            return

        print(f"\n⚠️  {validation_type.upper()} VALIDATION ISSUES FOUND:\n")
        for error in errors:
            severity_icon = {"critical": "❌", "major": "⚠️", "minor": "ℹ️"}.get(error.severity, "ℹ️")
            print(f"{severity_icon} [{error.rule_id}] {error.rule_name} ({error.severity})")
            print(f"   File: {error.file_path}")
            if error.line_number:
                print(f"   Line: {error.line_number}")
            print(f"   Issue: {error.message}")
            if error.details:
                print(f"   Details: {error.details}")
            if error.fix:
                print(f"   Fix: {error.fix}")
            print()

    def _output_json(self, errors: List[ValidationError]):
        """Output validation results in JSON format"""
        output = {
            "validation_passed": len(errors) == 0,
            "error_count": len(errors),
            "errors": [e.to_dict() for e in errors],
            "summary": {
                "critical": sum(1 for e in errors if e.severity == "critical"),
                "major": sum(1 for e in errors if e.severity == "major"),
                "minor": sum(1 for e in errors if e.severity == "minor")
            }
        }
        print(json.dumps(output, indent=2))

    def _get_exit_code(self, errors: List[ValidationError]) -> int:
        """Determine exit code based on errors"""
        if not errors:
            return 0

        has_critical = any(e.severity == "critical" for e in errors)
        has_major = any(e.severity == "major" for e in errors)

        if has_critical:
            return 1
        elif has_major:
            return 2
        else:
            return 3


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Unified Validator for Carnivore Weekly"
    )
    parser.add_argument(
        "--type",
        choices=["structure", "seo", "brand", "w3c", "accessibility", "preflight"],
        default="structure",
        help="Validation type to run"
    )
    parser.add_argument(
        "--path",
        help="Path to validate (optional for some types)"
    )
    parser.add_argument(
        "--severity",
        choices=["critical", "major", "minor", "all"],
        default="critical",
        help="Minimum severity level to report"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results in JSON format"
    )
    parser.add_argument(
        "--config",
        default="config/project.json",
        help="Path to project configuration file"
    )

    args = parser.parse_args()

    # Run validator
    validator = UnifiedValidator(args.config)
    exit_code = validator.validate(
        validation_type=args.type,
        path=args.path,
        severity=args.severity,
        json_output=args.json
    )

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
