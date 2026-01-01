#!/usr/bin/env python3
"""
Wrapper for generate_archive - calls unified generator

DEPRECATED: Use scripts/generate.py --type archive instead
This file exists for backward compatibility with existing workflows.

Usage:
    python3 scripts/generate_archive.py
"""

import sys
import subprocess

def main():
    """Wrapper to call unified generator"""
    # Call unified generator
    cmd = [sys.executable, "scripts/generate.py", "--type", "archive"]
    result = subprocess.run(cmd)
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
