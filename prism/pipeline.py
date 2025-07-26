# prism/pipeline.py
from __future__ import annotations
from pathlib import Path
import json
from typing import List, Dict, Any

from .pdf_utils import pdf_to_text
from .stats import run_statcheck_single, grim_passes
from .extract import find_mean_n_pairs


def run_checks(pdf_path: str | Path) -> Dict[str, Any]:
    """
    Master Phase 1 routine.
    1. Extract text
    2. Run statcheck (p‑value consistency)
    3. For rows with a mean & N, run GRIM
    4. Return dict -> JSON‑serialisable
    """
    text = pdf_to_text(pdf_path)
    df = run_statcheck_single(pdf_path)
    mean_hits = find_mean_n_pairs(text)

    grim_results = []  # Initialize outside the loop
    for hit in mean_hits:
        grim_ok = grim_passes(hit["mean"], hit["n"])
        grim_results.append(
            {
                "sentence": hit["sentence"],
                "mean": hit["mean"],
                "n": hit["n"],
                "grim_ok": grim_ok,
            }
        )
    return {
        "stat_tests": df,
        "grim_checks": grim_results,
    }


def save_report(results: Dict[str, Any], out_path: str | Path):
    out_path = Path(out_path)
    out_path.write_text(json.dumps(results, indent=2))
