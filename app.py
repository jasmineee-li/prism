# from openai import AsyncOpenAI
# import chainlit as cl
# import tempfile
# import os

# client = AsyncOpenAI()

# # Instrument the OpenAI client
# cl.instrument_openai()

# settings = {"model": "o3"}

# # Store the current PDF globally so we can reference it in messages
# current_pdf = None


# @cl.on_chat_start
# async def on_chat_start():
#     await cl.Message(
#         content="Welcome! Please upload a PDF paper to get started. Once uploaded, you can ask questions about the paper and I'll help you find errors or analyze the content."
#     ).send()


# @cl.on_message
# async def on_message(message: cl.Message):
#     global current_pdf

#     # Handle file uploads
#     if message.elements:
#         for element in message.elements:
#             if element.mime == "application/pdf":
#                 # Save the uploaded PDF temporarily - use element.content directly
#                 with tempfile.NamedTemporaryFile(
#                     delete=False, suffix=".pdf"
#                 ) as tmp_file:
#                     # Write the file content (which should be bytes)
#                     if hasattr(element, "content") and element.content:
#                         tmp_file.write(element.content)
#                     elif hasattr(element, "path") and element.path:
#                         # If content is not available, try reading from path
#                         with open(element.path, "rb") as src_file:
#                             tmp_file.write(src_file.read())
#                     else:
#                         await cl.Message(
#                             content="Error: Could not access file content."
#                         ).send()
#                         return

#                     tmp_path = tmp_file.name

#                 # Create PDF display element
#                 current_pdf = cl.Pdf(
#                     name="uploaded_paper", display="side", path=tmp_path, page=1
#                 )

#                 # Send confirmation with PDF attached
#                 await cl.Message(
#                     content="PDF uploaded successfully! I can now see your paper (uploaded_paper). You can ask me questions about it, and I'll help you find errors or analyze the content.",
#                     elements=[current_pdf],
#                 ).send()
#                 return

#     # Handle regular chat messages
#     pdf_context = ""
#     if current_pdf:
#         pdf_context = (
#             " I have access to the uploaded paper and can reference it in my response."
#         )

#     response = await client.chat.completions.create(
#         messages=[
#             {
#                 "content": f"""
#                 Assume the role of a deeply knowledgable reviewer, with a deep understanding of the fields of proteomics, chemistry, computational biology, and machine learning. Check the given paper for any major errors, either mathematical or biological in nature, that may invalidate the paper.

# Keep in mind, these papers have already been published in journals, so if there are any errors, they are likely to be very subtle. Look very, very carefully. If there are any, please point them out. If there are none, please say so.

# Dont bother with minor issues like formatting or small mistakes, or irrelevant errors that are in most ML papers (e.g. that the datasets aren't large enough).

# A major error is something that is mathematically incorrect, or something that is biologically incorrect. It should be something that completely invalidates the conclusions of the paper.

# To start off with, give a summary of the paper, ensuring that you cover all the concepts, ideas, and math used in the paper to check. Then, give a list of all the major errors you found in the paper, if there any. If there are none, say so.

# Give all of this in the following format:

# Summary:

# Major Errors (if any):

#                 {pdf_context}""",
#                 "role": "system",
#             },
#             {"content": message.content, "role": "user"},
#         ],
#         **settings,
#     )

#     # Send response, including PDF element if available
#     elements = [current_pdf] if current_pdf else []
#     await cl.Message(
#         content=response.choices[0].message.content, elements=elements
#     ).send()

import chainlit as cl
from prism.pipeline import run_checks
import tempfile
import json


@cl.on_message
async def main(message: cl.Message):
    if isinstance(message, str) or not getattr(message, "elements", None):
        await cl.Message("Please upload a PDF.").send()
        return

    pdf_el = message.elements[0]
    if pdf_el.mime != "application/pdf":
        await cl.Message("Only PDF files are supported for now.").send()
        return

    # Save upload to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as f:
        f.write(await pdf_el.read())

    await cl.Message("🔍 Running checks, this may take ~30 s…").send()

    results = run_checks(f.name)
    pretty = json.dumps(results, indent=2)[:4000]  # truncate for chat

    await cl.Message(
        f"Here’s the Phase 1 JSON (first 4 000 chars):\n```json\n{pretty}\n```"
    ).send()
