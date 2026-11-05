from fastapi import ( # type: ignore
    FastAPI,
    UploadFile,
    File,
    Form
)

from fastapi.middleware.cors import ( # type: ignore
    CORSMiddleware
)

import httpx # type: ignore
import os
import re

from datetime import datetime, date


# =====================================================
# FASTAPI APP
# =====================================================

app = FastAPI(
    title="OSCA Age Verification API",
    version="2.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://application-system-kappa.vercel.app"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


# =====================================================
# CONFIGURATION
# =====================================================

MINIMUM_SENIOR_AGE = 60

OCR_SPACE_URL = (
    "https://api.ocr.space/parse/image"
)

OCR_SPACE_API_KEY = os.getenv(
    "OCR_SPACE_API_KEY"
)


# =====================================================
# BASIC ROUTES
# =====================================================

@app.get("/")
def root():

    return {
        "success": True,
        "message":
            "OSCA Age Verification API is running."
    }


@app.get("/health")
def health():

    return {
        "success": True,
        "status": "healthy",
        "ocrConfigured":
            bool(
                OCR_SPACE_API_KEY
            )
    }


# =====================================================
# DATE HELPERS
# =====================================================

def parse_birth_date(
    value
):

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
        "%B %d %Y",
        "%b %d %Y",
        "%m/%d/%Y",
        "%d/%m/%Y",
        "%Y-%m-%d"
    ]


    for date_format in formats:

        try:

            return (
                datetime.strptime(
                    value,
                    date_format
                )
                .date()
            )

        except ValueError:

            continue


    return None


def calculate_age(
    birth_date
):

    today = date.today()


    age = (
        today.year
        -
        birth_date.year
    )


    if (
        (
            today.month,
            today.day
        )
        <
        (
            birth_date.month,
            birth_date.day
        )
    ):

        age -= 1


    return age


# =====================================================
# DOB EXTRACTION
# =====================================================

def extract_birth_date_from_text(text, expected_birth_date=None):
    """
    Extract DOB candidates from OCR text. Prefer the submitted date only when
    OCR actually contains that calendar date. Supports numeric and written
    month formats; ambiguous numeric dates are resolved against the form DOB.
    """
    if not text:
        return None

    normalized = re.sub(r"\s+", " ", str(text)).strip()
    month_names = (
        "January|February|March|April|May|June|July|August|September|"
        "October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|"
        "Oct|Nov|Dec"
    )

    patterns = [
        re.compile(
            r"\b(" + month_names + r")\.?\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(\d{4})\b",
            re.IGNORECASE
        ),
        re.compile(
            r"\b(\d{1,2})(?:st|nd|rd|th)?\s+(" + month_names + r")\.?\s+(\d{4})\b",
            re.IGNORECASE
        ),
        re.compile(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b"),
        re.compile(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b")
    ]

    candidates = []
    for index, pattern in enumerate(patterns):
        for match in pattern.finditer(normalized):
            groups = match.groups()
            try:
                if index == 0:
                    month = datetime.strptime(groups[0][:3].title(), "%b").month
                    parsed = date(int(groups[2]), month, int(groups[1]))
                    written = True
                elif index == 1:
                    month = datetime.strptime(groups[1][:3].title(), "%b").month
                    parsed = date(int(groups[2]), month, int(groups[0]))
                    written = True
                elif index == 2:
                    first, second, year = map(int, groups)
                    # Both interpretations are retained; the submitted DOB
                    # selects the correct one when the date is ambiguous.
                    for month, day in ((first, second), (second, first)):
                        try:
                            candidates.append({
                                "date": date(year, month, day),
                                "start": match.start(),
                                "written": False
                            })
                        except ValueError:
                            pass
                    continue
                else:
                    year, month, day = map(int, groups)
                    parsed = date(year, month, day)
                    written = False

                candidates.append({
                    "date": parsed,
                    "start": match.start(),
                    "written": written
                })
            except (ValueError, TypeError):
                continue

    if not candidates:
        return None

    # Prefer a date explicitly associated with a DOB label when present.
    labels = list(re.finditer(
        r"\b(?:date\s+of\s+birth|birth\s+date|birthdate|dob)\b",
        normalized,
        re.IGNORECASE
    ))
    for label in labels:
        nearby = [
            item for item in candidates
            if label.end() - 8 <= item["start"] <= label.end() + 100
        ]
        if nearby:
            if expected_birth_date is not None:
                exact = [item for item in nearby if item["date"] == expected_birth_date]
                if exact:
                    return expected_birth_date
            nearby.sort(key=lambda item: abs(item["start"] - label.end()))
            return nearby[0]["date"]

    # If OCR omitted the label, use an exact date match among recognized
    # candidates. This supports IDs with flattened/reordered text.
    if expected_birth_date is not None and any(
        item["date"] == expected_birth_date for item in candidates
    ):
        return expected_birth_date

    # A single written-month date is unambiguous without a label.
    written_dates = {item["date"] for item in candidates if item["written"]}
    if len(written_dates) == 1:
        return next(iter(written_dates))

    unique_dates = {item["date"] for item in candidates}
    if len(unique_dates) == 1:
        return next(iter(unique_dates))

    return None


# =====================================================
# OCR.SPACE
# =====================================================

async def run_ocr(
    file_bytes,
    filename,
    content_type
):

    if not OCR_SPACE_API_KEY:

        raise RuntimeError(
            "OCR_SPACE_API_KEY is not configured."
        )


    files = {
        "file": (
            filename
            or
            "valid-id.jpg",

            file_bytes,

            content_type
            or
            "image/jpeg"
        )
    }


    data = {
        "language":
            "eng",

        "OCREngine":
            "2",

        "isOverlayRequired":
            "false",

        "scale":
            "true"
    }


    headers = {
        "apikey":
            OCR_SPACE_API_KEY
    }


    async with httpx.AsyncClient(
        timeout=60.0
    ) as client:

        response = (
            await client.post(
                OCR_SPACE_URL,
                data=data,
                files=files,
                headers=headers
            )
        )


    response.raise_for_status()


    result = response.json()


    if result.get(
        "IsErroredOnProcessing"
    ):

        error_message = (
            result.get(
                "ErrorMessage"
            )
        )


        if isinstance(
            error_message,
            list
        ):

            error_message = " ".join(
                str(item)
                for item
                in error_message
            )


        raise RuntimeError(
            error_message
            or
            "OCR processing failed."
        )


    parsed_results = (
        result.get(
            "ParsedResults"
        )
        or
        []
    )


    if not parsed_results:
        return ""


    full_text = "\n".join(
        item.get(
            "ParsedText",
            ""
        )
        for item
        in parsed_results
    )


    return full_text


# =====================================================
# AGE VERIFICATION ENDPOINT
# =====================================================

@app.post("/verify-age")
async def verify_age(

    document:
        UploadFile = File(...),

    date_of_birth:
        str = Form(...)
):

    # =================================================
    # 1. VALIDATE FORM DOB
    # =================================================

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
            "success":
                False,

            "verified":
                False,

            "message":
                "The entered date of birth is invalid."
        }


    # =================================================
    # 2. READ ID
    # =================================================

    document_bytes = (
        await document.read()
    )


    if not document_bytes:

        return {
            "success":
                False,

            "verified":
                False,

            "message":
                "The uploaded valid ID is empty."
        }


    # =================================================
    # 3. OCR
    # =================================================

    try:

        ocr_text = await run_ocr(
            document_bytes,
            document.filename,
            document.content_type
        )

    except Exception as exc:

        print(
            "OCR API error:",
            repr(
                exc
            )
        )


        return {
            "success":
                False,

            "verified":
                False,

            "message":
                "Unable to read the date of birth from the uploaded valid ID."
        }


    # =================================================
    # 4. EXTRACT DOB
    # =================================================

    detected_birth_date = (
        extract_birth_date_from_text(
            ocr_text,
            expected_birth_date=entered_birth_date
        )
    )


    if detected_birth_date is None:

        return {
            "success":
                True,

            "verified":
                False,

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


    # =================================================
    # 5. COMPARE DOB
    # =================================================

    birth_date_matches = (
        entered_birth_date
        ==
        detected_birth_date
    )


    # =================================================
    # 6. CALCULATE AGE
    # =================================================

    age = calculate_age(
        detected_birth_date
    )


    age_eligible = (
        age
        >=
        MINIMUM_SENIOR_AGE
    )


    # =================================================
    # 7. FINAL RESULT
    # =================================================

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
        "success":
            True,

        "verified":
            verified,

        "enteredBirthDate":
            entered_birth_date.isoformat(),

        "detectedBirthDate":
            detected_birth_date.isoformat(),

        "birthDateMatches":
            birth_date_matches,

        "age":
            age,

        "minimumAge":
            MINIMUM_SENIOR_AGE,

        "ageEligible":
            age_eligible,

        "message":
            message
    }