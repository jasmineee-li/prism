# Integration Guide: Connecting Pipeline Results to React UI

This guide explains how to run the integrated system that connects the Python analysis pipeline to the React frontend.

## System Architecture

- **Backend (Python)**: Flask API that runs the PRISM pipeline analysis
- **Frontend (React)**: Interactive UI for uploading PDFs and displaying results

## Setup Instructions

### 1. Backend Setup (Python API)

1. Navigate to the PRISM project directory:

   ```bash
   cd /path/to/prism-proj
   ```

2. Activate your Python virtual environment:

   ```bash
   source prism-venv/bin/activate  # or your venv path
   ```

3. Install additional API requirements:

   ```bash
   pip install -r requirements-api.txt
   ```

4. Start the Flask API server:

   ```bash
   python api.py
   ```

   The API will be available at `http://localhost:5000`

### 2. Frontend Setup (React)

1. Navigate to the React application directory:

   ```bash
   cd folio-focus-guide
   ```

2. Install dependencies (if not already done):

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:8080`

## Using the System

1. **Start both servers**: Make sure both the Flask API (port 5000) and React app (port 8080) are running
2. **Open the React app**: Go to `http://localhost:8080` in your browser
3. **Upload a PDF**: Use the file upload interface to select a PDF document
4. **View results**: The system will automatically:
   - Send the PDF to the Python backend
   - Run StatCheck and GRIM analysis
   - Display the results in the React interface

## API Endpoints

### POST `/api/upload`

Uploads a PDF file and runs the analysis pipeline.

**Request**: Multipart form data with a `file` field containing the PDF
**Response**:

```json
{
  "success": true,
  "filename": "example.pdf",
  "results": {
    "stat_tests": [...],
    "grim_checks": [...]
  }
}
```

### GET `/api/health`

Health check endpoint to verify the API is running.

## Data Flow

1. **File Upload**: React component uploads PDF via FormData
2. **Backend Processing**: Flask API:
   - Saves file temporarily
   - Calls `run_checks()` from the pipeline
   - Transforms results to match frontend format
   - Returns JSON response
3. **Frontend Display**: React component:
   - Receives and parses the results
   - Displays StatCheck and GRIM test results
   - Shows summary statistics

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure Flask-CORS is installed and enabled
2. **Port Conflicts**: Change ports if 5000 or 8080 are in use
3. **Pipeline Errors**: Check that all PRISM dependencies are installed
4. **File Upload Fails**: Ensure the PDF is valid and not corrupted

### Debug Steps

1. Check both server logs for errors
2. Verify API is responding: `curl http://localhost:5000/api/health`
3. Test pipeline directly: `python tests/test_pipeline.py`
4. Check browser network tab for API request/response details

## Data Structure Mapping

### Python Pipeline Output

```python
{
    "stat_tests": pd.DataFrame,  # StatCheck results
    "grim_checks": [             # GRIM test results
        {
            "sentence": str,
            "mean": float,
            "n": int,
            "grim_ok": bool|None
        }
    ]
}
```

### Frontend Expected Format

```typescript
{
    stat_tests: StatTestResult[],
    grim_checks: GrimResult[]
}
```

The API automatically transforms the pandas DataFrame to the expected format for the frontend.
