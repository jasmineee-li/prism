# prism/stats.py  –– pure‑Python now
from typing import List, Dict, Any
import pandas as pd
from grim import mean_tester
from statcheck.checkdir import checkPDFdir  # core helper


def run_statcheck_single(pdf_path: str) -> pd.DataFrame:
    """
    Thin wrapper around statcheck's checkPDFdir().
    Returns the same DataFrame format the R version produced.
    """
    # checkPDFdir expects a directory; give it a tmp dir with one file
    df_results, df_pvals = checkPDFdir(
        dir="pdfs",
        subdir=False,
        # short=True
    )
    return df_results


def grim_passes(mean, n):
    try:
        return mean_tester.consistency_check(str(mean), str(n))
    except Exception as e:
        print(f"[GRIM] Could not test mean={mean}, n={n}: {e}")
        return None
