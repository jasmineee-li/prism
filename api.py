from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os
from pathlib import Path
import json
import pandas as pd
import uuid
from prism.supabase_client import get_supabase_client

from prism.pipeline import run_checks
import openai
import arxiv
import requests
from urllib.parse import urlparse

app = Flask(__name__)
CORS(
    app,
    origins=["http://localhost:8080", "http://127.0.0.1:8080"],
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


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


def generate_ai_review(analysis_json):
    """Generate AI technical review from analysis results."""
    try:
        openai.api_key = os.getenv("OPENAI_API_KEY")
        if not openai.api_key:
            return "OpenAI API key not configured"

        prompt = """Role & Scope
You are a research-oriented AI. Analyse the attached paper and deliver a concise yet comprehensive technical review suitable for a sidebar display (≈350 words max).

Output format (plain text only)

Key Findings (≤4 bullets) – one-line takeaways.

Stat & Math Check (≤5 bullets) – name each test, note any inconsistencies or typos.

Method & Data Quality (≤5 bullets) – comment on assumptions, outliers, missing data, bias controls.

Reproducibility Score (1–10) – single line.

How to Raise the Score (≤5 bullets) – specific, actionable fixes.

Evaluation criteria
• Verify calculations (p-values, dfs, effect sizes).
• Judge the appropriateness of analytical techniques, significance thresholds, and multiple-comparison controls.
• Assess transparency: data/code availability, preregistration, documentation.
• Consider handling of data integrity issues (outliers, missing values, bias).

Style guidelines
• Bullet points only; keep each bullet under 120 characters.
• No tables, markdown headings, or fancy formatting—plain text bullets.
• Use succinct technical language (e.g., "ANCOVA F(5,222)=4.9 OK").

Deliver just the sidebar text—no extra commentary."""

        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": analysis_json},
        ]

        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.5,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating AI review: {e}")
        return f"Error generating review: {str(e)}"


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

            # Transform pipeline results for frontend
            transformed_results = transform_pipeline_results(results)

            # Generate AI review
            review = generate_ai_review(json.dumps(transformed_results))

            # === Supabase integration ===
            supabase = get_supabase_client()

            bucket_name = "documents"  # Ensure this bucket exists and is public in Supabase dashboard

            # Upload file to bucket using a UUID key to avoid collisions
            doc_id = str(uuid.uuid4())
            storage_path = f"{doc_id}/{file.filename}"
            with open(tmp_path, "rb") as pdf_file:
                supabase.storage.from_(bucket_name).upload(
                    storage_path, pdf_file.read()
                )

            # Build public URL for public bucket
            supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
            public_url = (
                f"{supabase_url}/storage/v1/object/public/{bucket_name}/{storage_path}"
            )

            # Insert metadata row
            doc_record = {
                "id": doc_id,
                "filename": file.filename,
                "storage_path": storage_path,
                "public_url": public_url,
                "uploaded_at": "now()",  # Supabase interprets literal string in SQL insert
                "results": json.dumps(transformed_results),
                "review": review,
            }
            try:
                supabase.table("documents").insert(doc_record).execute()
            except Exception as insert_err:
                print(f"Error inserting document record: {insert_err}")

            return jsonify(
                {
                    "message": "File uploaded and analyzed successfully",
                    "document_id": doc_id,
                    "public_url": public_url,
                    "results": transformed_results,
                    "review": review,
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


@app.route("/api/documents", methods=["GET"])
def list_documents():
    """Return metadata for all documents stored in Supabase."""
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("documents")
            .select("id, filename, public_url, uploaded_at")
            .order("uploaded_at", desc=True)
            .execute()
        )
        docs = response.data if hasattr(response, "data") else response
        return jsonify({"documents": docs})
    except Exception as e:
        print(f"Error listing documents: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/documents/<doc_id>", methods=["GET"])
def document_detail(doc_id):
    """Return metadata and analysis results for a single document."""
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("documents").select("*").eq("id", doc_id).single().execute()
        )
        record = response.data if hasattr(response, "data") else response
        if not record:
            return jsonify({"error": "Document not found"}), 404

        # Handle results field - could be JSON string or already parsed dict
        results_field = record.get("results", "{}")
        if isinstance(results_field, str):
            record["results"] = json.loads(results_field)
        else:
            record["results"] = results_field  # Already a dict

        return jsonify(record)
    except Exception as e:
        print(f"Error fetching document {doc_id}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy"})


@app.route("/api/chat", methods=["POST"])
def chat():
    """Proxy chat completion request to OpenAI, keeping the API key on the server."""
    try:
        data = request.get_json(force=True)
        messages = data.get("messages", [])
        if not messages:
            return jsonify({"error": "No messages provided"}), 400

        # Allow optional additional context
        context = data.get("context")
        if context:
            messages = [{"role": "system", "content": context}] + messages

        openai.api_key = os.getenv("OPENAI_API_KEY")
        if not openai.api_key:
            return jsonify({"error": "OPENAI_API_KEY not set on server"}), 500

        response = openai.chat.completions.create(
            model="gpt-4o-mini",  # GPT-4o 2024- model, adjust if needed
            messages=messages,
            temperature=0.7,
        )
        assistant_msg = response.choices[0].message.content
        return jsonify({"assistant": assistant_msg})
    except Exception as e:
        print(f"Error in /api/chat: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/review", methods=["POST"])
def review():
    """Generate technical sidebar review using OpenAI based on analysis JSON or plain text provided by client."""
    try:
        data = request.get_json(force=True)
        analysis_text = data.get("analysis")
        if not analysis_text:
            return jsonify({"error": "Missing analysis"}), 400

        prompt = (
            data.get("prompt")
            or """Role & Scope\nYou are a research-oriented AI. Analyse the attached paper and deliver a concise yet comprehensive technical review suitable for a sidebar display (≈350 words max).\n\nOutput format (plain text only)\n\nKey Findings (≤4 bullets) – one-line takeaways.\n\nStat & Math Check (≤5 bullets) – name each test, note any inconsistencies or typos.\n\nMethod & Data Quality (≤5 bullets) – comment on assumptions, outliers, missing data, bias controls.\n\nReproducibility Score (1–10) – single line.\n\nHow to Raise the Score (≤5 bullets) – specific, actionable fixes.\n\nEvaluation criteria\n• Verify calculations (p-values, dfs, effect sizes).\n• Judge the appropriateness of analytical techniques, significance thresholds, and multiple-comparison controls.\n• Assess transparency: data/code availability, preregistration, documentation.\n• Consider handling of data integrity issues (outliers, missing data, bias).\n\nStyle guidelines\n• Bullet points only; keep each bullet under 120 characters.\n• No tables, markdown headings, or fancy formatting—plain text bullets.\n• Use succinct technical language (e.g., “ANCOVA F(5,222)=4.9 OK”).\n\nDeliver just the sidebar text—no extra commentary."""
        )

        openai.api_key = os.getenv("OPENAI_API_KEY")
        if not openai.api_key:
            return jsonify({"error": "OPENAI_API_KEY not set"}), 500

        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": analysis_text},
        ]

        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.5,
        )
        review_text = response.choices[0].message.content.strip()
        return jsonify({"review": review_text})
    except Exception as e:
        print(f"Error in /api/review: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/arxiv", methods=["GET"])
def fetch_arxiv():
    """Fetch 10 recent statistics papers from arXiv and analyze them."""
    try:
        client = arxiv.Client()
        search = arxiv.Search(
            query="cat:stat.AP",
            max_results=10,
            sort_by=arxiv.SortCriterion.SubmittedDate,
            sort_order=arxiv.SortOrder.Descending,
        )

        papers = []
        for paper in client.results(search):
            # Download PDF temporarily for analysis
            try:
                # Download PDF content
                pdf_response = requests.get(paper.pdf_url, timeout=30)
                if pdf_response.status_code != 200:
                    continue

                # Save to temp file for analysis
                with tempfile.NamedTemporaryFile(
                    suffix=".pdf", delete=False
                ) as temp_file:
                    temp_file.write(pdf_response.content)
                    temp_path = temp_file.name

                # Run analysis
                try:
                    raw_results = run_checks(temp_path)
                    results = transform_pipeline_results(
                        raw_results
                    )  # Transform DataFrames to JSON-serializable format

                    # Generate AI review
                    review = generate_ai_review(json.dumps(results))

                    # Store in database
                    supabase = get_supabase_client()
                    filename = f"{paper.title[:50]}.pdf"

                    # Upload PDF to Supabase storage
                    with open(temp_path, "rb") as f:
                        file_data = f.read()

                    doc_id = str(uuid.uuid4())
                    storage_path = f"{doc_id}/{filename}"

                    # Upload to Supabase storage (same pattern as existing upload)
                    supabase.storage.from_("documents").upload(storage_path, file_data)

                    # Build public URL manually (same as existing upload)
                    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
                    public_url = f"{supabase_url}/storage/v1/object/public/documents/{storage_path}"

                    # Insert document record
                    insert_result = (
                        supabase.table("documents")
                        .insert(
                            {
                                "id": doc_id,
                                "filename": filename,
                                "storage_path": storage_path,
                                "public_url": public_url,
                                "results": json.dumps(
                                    results
                                ),  # Store as JSON string like existing upload
                                "review": review,
                            }
                        )
                        .execute()
                    )

                    papers.append(
                        {
                            "id": doc_id,
                            "title": paper.title,
                            "authors": [author.name for author in paper.authors],
                            "abstract": paper.summary,
                            "pdf_url": paper.pdf_url,
                            "arxiv_id": paper.entry_id.split("/")[-1],
                            "updated": paper.updated.isoformat(),
                            "filename": filename,
                            "public_url": public_url,
                            "analysis_complete": True,
                        }
                    )

                except Exception as analysis_error:
                    print(f"Analysis failed for {paper.title}: {analysis_error}")
                    # Still add paper info even if analysis failed
                    papers.append(
                        {
                            "title": paper.title,
                            "authors": [author.name for author in paper.authors],
                            "abstract": paper.summary,
                            "pdf_url": paper.pdf_url,
                            "arxiv_id": paper.entry_id.split("/")[-1],
                            "updated": paper.updated.isoformat(),
                            "analysis_complete": False,
                            "error": str(analysis_error),
                        }
                    )
                finally:
                    # Clean up temp file
                    try:
                        os.unlink(temp_path)
                    except:
                        pass

            except Exception as download_error:
                print(f"Download failed for {paper.title}: {download_error}")
                papers.append(
                    {
                        "title": paper.title,
                        "authors": [author.name for author in paper.authors],
                        "abstract": paper.summary,
                        "pdf_url": paper.pdf_url,
                        "arxiv_id": paper.entry_id.split("/")[-1],
                        "updated": paper.updated.isoformat(),
                        "analysis_complete": False,
                        "error": str(download_error),
                    }
                )

        return jsonify({"papers": papers})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
