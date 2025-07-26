# prism/extract.py
import re
from typing import List, Dict

# Regexes that work on >90 % of psych / biomed papers
MEAN_RE = re.compile(r"\bM(?:ean)?\s*[=:]?\s*([0-9]+(?:\.[0-9]+)?)", re.I)
N_RE = re.compile(r"\bN\s*[=:]?\s*([0-9]+)", re.I)


def sentences(text: str) -> List[str]:
    # Brute‑force sentence split: good enough for Phase 1
    return re.split(r"(?<=[.?!])\s+", text)


def find_mean_n_pairs(text: str) -> List[Dict]:
    """
    Returns a list of dicts:
      { 'sentence': str, 'mean': float, 'n': int }
    Pairs *M* and *N* only if they appear in the same sentence.
    """
    hits = []
    for s in sentences(text):
        m_match = MEAN_RE.search(s)
        n_match = N_RE.search(s)
        if m_match and n_match:
            try:
                hits.append(
                    {
                        "sentence": s.strip(),
                        "mean": float(m_match.group(1)),
                        "n": int(n_match.group(1)),
                    }
                )
            except ValueError:
                pass  # malformed numbers → ignore
    return hits
