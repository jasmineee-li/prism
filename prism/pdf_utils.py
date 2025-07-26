# prism/pdf_utils.py
import pdfplumber
from pathlib import Path

def pdf_to_text(pdf_path: str | Path) -> str:
    """
    Concatenate text from every page of a PDF.
    Empty pages return an empty string so join() is safe.
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(pdf_path)

    pages = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text() or "")
    return "\n".join(pages)
