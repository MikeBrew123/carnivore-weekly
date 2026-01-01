#!/usr/bin/env python3
"""
Wrapper for validate_structure - calls unified validator

DEPRECATED: Use scripts/validate.py --type structure instead
This file exists for backward compatibility with existing workflows.

Usage:
    python3 scripts/validate_structure.py <path> --mode <template|generated> \
        --severity <critical|major|minor|all> [--summary]
"""

import sys
import argparse
import subprocess

def main():
    """Wrapper to call unified validator"""
    parser = argparse.ArgumentParser(description="Validate HTML structure (wrapper for unified validator)")
    parser.add_argument("path", help="File or directory to validate")
    parser.add_argument("--mode", choices=["template", "generated"], default="generated", help="Validation mode")
    parser.add_argument("--severity", choices=["critical", "major", "minor", "all"], default="critical", help="Severity level")
    parser.add_argument("--summary", action="store_true", help="Show summary only")

    args = parser.parse_args()

    # Call unified validator
    cmd = [
        sys.executable,
        "scripts/validate.py",
        "--type", "structure",
        "--path", args.path,
        "--severity", args.severity
    ]

    result = subprocess.run(cmd)
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
