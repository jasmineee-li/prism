from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os
from pathlib import Path
import json
import pandas as pd

from prism.pipeline import run_checks

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


def transform_pipeline_results(results):
    """Transform pipeline results to match frontend expected format"""

    # Transform stat_tests DataFrame to list of dicts
    stat_tests_data = []
    if isinstance(results["stat_tests"], pd.DataFrame):
        df = results["stat_tests"]
        for _, row in df.iterrows():
            stat_tests_data.append(
                {
                    "test": f"{row.get('Statistic', 'Unknown')} test",
                    "p_value": row.get("Computed_P", None),
                    "reported_p": row.get("Reported_P", None),
                    "significant": not row.get(
                        "Error", True
                    ),  # Error=False means test passed
                    "note": f"Decision Error: {row.get('Decision_Error', 'Unknown')}",
                    "source": row.get("Source", "Unknown"),
                    "df1": row.get("df1", None),
                    "df2": row.get("df2", None),
                    "test_statistic": row.get("Value", None),
                }
            )

    # Transform GRIM checks
    grim_results = []
    for grim_check in results.get("grim_checks", []):
        grim_results.append(
            {
                "sentence": grim_check.get("sentence", ""),
                "mean": grim_check.get("mean", None),
                "n": grim_check.get("n", None),
                "passed": grim_check.get("grim_ok", None),
                "reason": (
                    "Mean value inconsistent with reported sample size"
                    if grim_check.get("grim_ok") == False
                    else "GRIM test passed"
                ),
                "confidence": 0.85 if grim_check.get("grim_ok") is not None else 0.0,
            }
        )

    return {"stat_tests": stat_tests_data, "grim_checks": grim_results}


@app.route("/api/upload", methods=["POST"])
def upload_file():
    """Handle PDF file upload and run pipeline analysis"""
    print(f"Received {request.method} request to /api/upload")
    print(f"Content-Type: {request.content_type}")
    print(f"Files in request: {list(request.files.keys())}")

    try:
        if "file" not in request.files:
            print("Error: No file in request.files")
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        print(f"File received: {file.filename}, size: {file.content_length}")

        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        if not file.filename.lower().endswith(".pdf"):
            return jsonify({"error": "Only PDF files are supported"}), 400

        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            file.save(tmp_file.name)
            tmp_path = tmp_file.name
            print(f"File saved to: {tmp_path}")

        try:
            # Run the pipeline analysis
            print("Running pipeline analysis...")
            results = run_checks(tmp_path)
            print(f"Pipeline results: {type(results)}")

            # Transform results for frontend
            transformed_results = transform_pipeline_results(results)
            print("Results transformed successfully")

            return jsonify(
                {
                    "success": True,
                    "filename": file.filename,
                    "results": transformed_results,
                }
            )

        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                print(f"Cleaned up temp file: {tmp_path}")

    except Exception as e:
        print(f"Error in upload_file: {e}")
        return jsonify({"error": str(e)}), 500


# Add a handler for GET requests to provide helpful error message
@app.route("/api/upload", methods=["GET"])
def upload_get():
    """Handle GET requests to upload endpoint with helpful message"""
    return (
        jsonify(
            {
                "error": "This endpoint only accepts POST requests with file uploads. Use POST method with multipart/form-data."
            }
        ),
        405,
    )


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
