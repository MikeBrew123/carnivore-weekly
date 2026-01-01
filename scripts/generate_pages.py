#!/usr/bin/env python3
"""
Wrapper for generate_pages - calls unified generator

DEPRECATED: Use scripts/generate.py --type pages instead
This file exists for backward compatibility with existing workflows.

Usage:
    python3 scripts/generate_pages.py
"""

import sys
import subprocess

def main():
    """Wrapper to call unified generator"""
    # Call unified generator
    cmd = [sys.executable, "scripts/generate.py", "--type", "pages"]
    result = subprocess.run(cmd)
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
