#!/usr/bin/env python3
"""
Pre-flight validation script for Carnivore Weekly weekly automation.
Checks all requirements before running run_weekly_update.sh, ensuring success.

Exit Codes:
  0: All checks passed (GO)
  1: Critical check failed (NO-GO)
  2: Warnings present (GO with caution)
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path
from dotenv import load_dotenv

# ANSI colors
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BOLD = "\033[1m"

# Track results
checks = []
has_warnings = False
has_errors = False


def print_header():
    """Print validation header"""
    print(f"\n{BOLD}{'='*50}{RESET}")
    print(f"{BOLD}CARNIVORE WEEKLY PRE-FLIGHT VALIDATION{RESET}")
    print(f"{BOLD}{'='*50}{RESET}\n")


def print_check(number, name, passed, message):
    """Print a single check result"""
    global has_warnings, has_errors

    status = "✓ PASS" if passed else "✗ FAIL"
    color = GREEN if passed else RED

    # Handle warnings
    if message.startswith("WARNING:"):
        color = YELLOW
        status = "⚠ WARN"
        has_warnings = True
    elif not passed:
        has_errors = True

    print(f"[{number}/8] {name:.<35} {color}{status}{RESET}")
    if message and message not in ("OK", ""):
        indent = " " * 8
        print(f"{indent}{color}{message}{RESET}")


def check_environment_variables():
    """Check .env file and required API keys"""
    env_path = Path(".env")

    if not env_path.exists():
        print_check(1, "Environment Variables", False, "CRITICAL: .env file missing")
        return False

    load_dotenv()

    youtube_key = os.getenv("YOUTUBE_API_KEY")
    if not youtube_key:
        print_check(
            1, "Environment Variables", False, "CRITICAL: YOUTUBE_API_KEY not set"
        )
        return False

    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if not anthropic_key:
        print_check(
            1, "Environment Variables", False, "CRITICAL: ANTHROPIC_API_KEY not set"
        )
        return False

    print_check(1, "Environment Variables", True, "")
    return True


def check_python_packages():
    """Check required Python packages are installed"""
    required_packages = [
        "anthropic",
        "google.auth",  # google-api-python-client
        "jinja2",
        "dotenv",
        "requests",
        "pandas",
        "bs4",  # beautifulsoup4
        "lxml",
        "dateutil",
    ]

    missing = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)

    if missing:
        print_check(
            2, "Python Packages", False, f"CRITICAL: Missing {', '.join(missing)}"
        )
        return False

    print_check(2, "Python Packages", True, "")
    return True


def check_directory_structure():
    """Check required directories exist"""
    required_dirs = ["data", "data/archive", "templates", "public", "scripts"]

    missing = []
    for dir_path in required_dirs:
        if not Path(dir_path).is_dir():
            missing.append(dir_path)

    if missing:
        print_check(
            3, "Directory Structure", False, f"CRITICAL: Missing {', '.join(missing)}/"
        )
        return False

    # Create newsletters if missing
    Path("newsletters").mkdir(exist_ok=True)

    print_check(3, "Directory Structure", True, "")
    return True


def check_templates():
    """Check critical templates exist"""
    required_templates = [
        "templates/index_template.html",
        "templates/archive_template.html",
        "templates/channels_template.html",
    ]

    missing = []
    for template in required_templates:
        if not Path(template).exists():
            missing.append(template)

    if missing:
        print_check(4, "Templates", False, f"CRITICAL: Missing {', '.join(missing)}")
        return False

    print_check(4, "Templates", True, "")
    return True


def check_template_integrity():
    """Check templates have required elements"""
    templates = [
        "templates/index_template.html",
        "templates/archive_template.html",
        "templates/channels_template.html",
    ]

    warnings = []

    for template_path in templates:
        try:
            content = Path(template_path).read_text()

            # Check for feedback button
            if "feedback-side" not in content:
                warnings.append(f"{template_path} missing feedback button")

            # Check for style.css reference
            if "style.css" not in content:
                warnings.append(f"{template_path} missing style.css reference")

            # Check for valid Jinja2 syntax (basic check)
            if content.count("{{") != content.count("}}"):
                warnings.append(f"{template_path} has unbalanced Jinja2 brackets")

        except Exception as e:
            warnings.append(f"Error reading {template_path}: {str(e)[:50]}")

    if warnings:
        message = "WARNING: " + "; ".join(warnings[:2])  # Show first 2 warnings
        print_check(5, "Template Integrity", True, message)
        return True

    print_check(5, "Template Integrity", True, "")
    return True


def check_api_connectivity():
    """Test API connectivity"""
    try:
        from googleapiclient.discovery import build
        from anthropic import Anthropic
    except ImportError:
        print_check(6, "API Connectivity", False, "CRITICAL: API libraries missing")
        return False

    load_dotenv()

    # Test YouTube API
    try:
        youtube = build(
            "youtube",
            "v3",
            developerKey=os.getenv("YOUTUBE_API_KEY"),
            cache_discovery=False,
        )
        # Simple test query
        result = (
            youtube.search().list(part="snippet", q="carnivore", maxResults=1).execute()
        )

        if "items" not in result:
            print_check(
                6,
                "API Connectivity",
                False,
                "CRITICAL: YouTube API test returned unexpected response",
            )
            return False

    except Exception as e:
        error_msg = str(e)[:50]
        if "quota" in error_msg.lower():
            print_check(
                6,
                "API Connectivity",
                False,
                f"CRITICAL: YouTube quota exceeded - {error_msg}",
            )
        else:
            print_check(
                6,
                "API Connectivity",
                False,
                f"CRITICAL: YouTube API failed - {error_msg}",
            )
        return False

    # Test Anthropic API
    try:
        Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        # Just verify the client initializes (don't make actual call)
    except Exception as e:
        error_msg = str(e)[:50]
        print_check(
            6,
            "API Connectivity",
            False,
            f"CRITICAL: Anthropic API setup failed - {error_msg}",
        )
        return False

    print_check(6, "API Connectivity", True, "")
    return True


def check_git_status():
    """Check git repository status"""
    try:
        # Check if git repo
        result = subprocess.run(
            ["git", "status"], capture_output=True, text=True, timeout=5
        )

        if result.returncode != 0:
            print_check(7, "Git Status", True, "WARNING: Git status check failed")
            return True

        # Check .gitignore
        gitignore_path = Path(".gitignore")
        if gitignore_path.exists():
            content = gitignore_path.read_text()
            if ".env" not in content:
                print_check(7, "Git Status", True, "WARNING: .env not in .gitignore")
                return True

        print_check(7, "Git Status", True, "")
        return True

    except Exception as e:
        # Git not installed or error - non-critical
        print_check(
            7, "Git Status", True, f"WARNING: Git check skipped ({str(e)[:30]})"
        )
        return True


def check_disk_space():
    """Check available disk space"""
    try:
        stat = shutil.disk_usage(".")
        available_gb = stat.free / (1024**3)

        if available_gb < 0.5:  # Less than 500MB
            print_check(
                8,
                "Disk Space",
                False,
                f"CRITICAL: Low disk space ({available_gb:.1f}GB available)",
            )
            return False

        message = f"({available_gb:.1f}GB available)"
        print_check(8, "Disk Space", True, message)
        return True

    except Exception as e:
        print_check(
            8, "Disk Space", False, f"CRITICAL: Disk check failed - {str(e)[:50]}"
        )
        return False


def print_footer(all_passed, has_warnings):
    """Print validation footer with GO/NO-GO decision"""
    print(f"\n{BOLD}{'='*50}{RESET}")

    if all_passed:
        if has_warnings:
            status = f"{YELLOW}⚠ GO WITH CAUTION{RESET}"
        else:
            status = f"{GREEN}✓ GO{RESET}"
    else:
        status = f"{RED}✗ NO-GO{RESET}"

    print(f"{BOLD}VALIDATION RESULT: {status}{RESET}")
    print(f"{BOLD}{'='*50}{RESET}\n")

    if all_passed:
        print(f"Ready to run: {BOLD}./run_weekly_update.sh{RESET}")
        print(f"\nEstimated run time: 5-10 minutes")
        print(f"Estimated API cost: $0.07-0.15")
    else:
        print(f"{RED}Fix validation errors before running automation.{RESET}")

    print()


def main():
    """Run all validation checks"""
    print_header()

    # Run all checks
    results = []
    results.append(check_environment_variables())
    results.append(check_python_packages())
    results.append(check_directory_structure())
    results.append(check_templates())
    results.append(check_template_integrity())
    results.append(check_api_connectivity())
    results.append(check_git_status())
    results.append(check_disk_space())

    # Determine overall status
    all_passed = all(results)

    # Print footer
    print_footer(all_passed, has_warnings)

    # Exit with appropriate code
    if not all_passed:
        sys.exit(1)  # NO-GO
    elif has_warnings:
        sys.exit(2)  # GO with caution
    else:
        sys.exit(0)  # GO


if __name__ == "__main__":
    main()
