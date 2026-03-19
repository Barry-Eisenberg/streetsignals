"""Legacy compatibility wrapper.

Use scripts/update_signals.py as the main updater.
This script remains for convenience when running from older docs.
"""

from scripts.update_signals import main


if __name__ == "__main__":
    main()
