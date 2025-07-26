import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# from prism.stats import run_statcheck_single
# import pandas as pd

# df = run_statcheck_single("pdfs")
# print(df)
# assert isinstance(df, pd.DataFrame)
# column_names = df.columns.tolist()
# print(column_names)

# # print(df.head())


from prism.pipeline import run_checks

report = run_checks("/Users/jasminexli/prism-proj/pdfs/false_test.pdf")
print(report)
# assert report["stat_tests"]
# assert report["grim_checks"]
