from fastapi import FastAPI, UploadFile, File, Form # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore

import cv2 # type: ignore
import easyocr # type: ignore
import numpy as np # type: ignore
import re

from datetime import datetime, date


app = FastAPI(
    title="OSCA Age Verification API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://application-system-kappa.vercel.app"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


MINIMUM_SENIOR_AGE = 60

ocr_reader = None


@app.get("/")
def root():
    return {
        "success": True,
        "message": "OSCA Age Verification API is running."
    }


@app.get("/health")
def health():
    return {
        "success": True,
        "status": "healthy"
    }


def get_ocr_reader():

    global ocr_reader

    if ocr_reader is None:

        print("Loading EasyOCR...")

        ocr_reader = easyocr.Reader(
            ["en"],
            gpu=False,
            download_enabled=False,
            verbose=False
        )

        print("EasyOCR loaded successfully.")

    return ocr_reader


def decode_uploaded_image(image_bytes):

    np_array = np.frombuffer(
        image_bytes,
        np.uint8
    )

    return cv2.imdecode(
        np_array,
        cv2.IMREAD_COLOR
    )


def parse_birth_date(value):

    if not value:
        return None

    value = value.strip()

    value = re.sub(
        r",\s*",
        ", ",
        value
    )

    formats = [
        "%B %d, %Y",
        "%b %d, %Y",
        "%m/%d/%Y",
        "%d/%m/%Y",
        "%Y-%m-%d"
    ]

    for date_format in formats:

        try:
            return datetime.strptime(
                value,
                date_format
            ).date()

        except ValueError:
            continue

    return None


def calculate_age(birth_date):

    today = date.today()

    age = (
        today.year
        -
        birth_date.year
    )

    if (
        (today.month, today.day)
        <
        (birth_date.month, birth_date.day)
    ):
        age -= 1

    return age


def extract_birth_date_from_image(image_bytes):

    reader = get_ocr_reader()

    image = decode_uploaded_image(
        image_bytes
    )

    if image is None:
        return None, None

    results = reader.readtext(
        image,
        detail=1
    )

    detected_text = []

    for _, text, confidence in results:

        detected_text.append({
            "text": text,
            "confidence": float(confidence)
        })


    # First try to find a DOB label.
    for index, item in enumerate(
        detected_text
    ):

        normalized = (
            item["text"]
            .upper()
            .replace("0", "O")
        )

        if (
            "DATE OF BIRTH"
            not in normalized
            and
            "PETSA NG KAPANGANAKAN"
            not in normalized
        ):
            continue

        for offset in range(
            1,
            4
        ):

            candidate_index = (
                index + offset
            )

            if candidate_index >= len(
                detected_text
            ):
                break

            candidate = detected_text[
                candidate_index
            ]

            parsed = parse_birth_date(
                candidate["text"]
            )

            if parsed:
                return (
                    parsed,
                    round(
                        candidate["confidence"],
                        4
                    )
                )


    # Fallback: search all OCR text for a date.
    for item in detected_text:

        parsed = parse_birth_date(
            item["text"]
        )

        if parsed:
            return (
                parsed,
                round(
                    item["confidence"],
                    4
                )
            )


    return None, None


@app.post("/verify-age")
async def verify_age(
    document: UploadFile = File(...),
    date_of_birth: str = Form(...)
):

    try:

        entered_birth_date = (
            datetime.strptime(
                date_of_birth,
                "%Y-%m-%d"
            )
            .date()
        )

    except ValueError:

        return {
            "success": False,
            "verified": False,
            "message":
                "The entered date of birth is invalid."
        }


    document_bytes = (
        await document.read()
    )

    if not document_bytes:

        return {
            "success": False,
            "verified": False,
            "message":
                "The uploaded valid ID is empty."
        }


    try:

        (
            detected_birth_date,
            ocr_confidence
        ) = extract_birth_date_from_image(
            document_bytes
        )

    except Exception as exc:

        print(
            "OCR verification error:",
            exc
        )

        return {
            "success": False,
            "verified": False,
            "message":
                "Unable to read the date of birth from the uploaded valid ID."
        }


    if detected_birth_date is None:

        return {
            "success": True,
            "verified": False,
            "enteredBirthDate":
                entered_birth_date.isoformat(),
            "detectedBirthDate":
                None,
            "birthDateMatches":
                False,
            "age":
                None,
            "ageEligible":
                False,
            "message":
                "No recognizable date of birth was found on the uploaded valid ID."
        }


    birth_date_matches = (
        entered_birth_date
        ==
        detected_birth_date
    )

    age = calculate_age(
        detected_birth_date
    )

    age_eligible = (
        age >= MINIMUM_SENIOR_AGE
    )

    verified = (
        birth_date_matches
        and
        age_eligible
    )


    if not birth_date_matches:

        message = (
            "The date of birth entered in the application "
            "does not match the uploaded valid ID."
        )

    elif not age_eligible:

        message = (
            "The applicant is not yet 60 years old."
        )

    else:

        message = (
            "Age verification passed."
        )


    return {
        "success": True,
        "verified": verified,
        "enteredBirthDate":
            entered_birth_date.isoformat(),
        "detectedBirthDate":
            detected_birth_date.isoformat(),
        "birthDateMatches":
            birth_date_matches,
        "age": age,
        "minimumAge":
            MINIMUM_SENIOR_AGE,
        "ageEligible":
            age_eligible,
        "ocrConfidence":
            ocr_confidence,
        "message":
            message
    }