#!/usr/bin/env python3
"""
Wrapper for generate_newsletter - calls unified generator

DEPRECATED: Use scripts/generate.py --type newsletter instead
This file exists for backward compatibility with existing workflows.

Usage:
    python3 scripts/generate_newsletter.py
"""

import sys
import subprocess

def main():
    """Wrapper to call unified generator"""
    # Call unified generator
    cmd = [sys.executable, "scripts/generate.py", "--type", "newsletter"]
    result = subprocess.run(cmd)
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
