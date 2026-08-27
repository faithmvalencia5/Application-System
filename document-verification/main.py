import io
import os
import re

from datetime import datetime
from difflib import SequenceMatcher
from typing import Optional

import cv2
import numpy as np
import requests

from fastapi import (
    FastAPI,
    File,
    Form,
    UploadFile
)

from fastapi.middleware.cors import (
    CORSMiddleware
)

from PIL import Image


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="OSCA Document Verification API",
    description=(
        "Automated document screening and authenticity "
        "support for the OSCA Senior Citizen ID "
        "Application System. Final verification is "
        "performed by authorized OSCA staff."
    ),
    version="3.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "https://application-system-kappa.vercel.app"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ============================================================
# CONFIGURATION
# ============================================================

OCR_SPACE_API_KEY = os.getenv(
    "OCR_SPACE_API_KEY",
    ""
)

OCR_SPACE_URL = (
    "https://api.ocr.space/parse/image"
)

MAX_FILE_SIZE = (
    10
    *
    1024
    *
    1024
)

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
}


# ============================================================
# DOCUMENT TYPE RULES
# ============================================================

DOCUMENT_RULES = {

    "valid_id": {

        "minimum_indicators": 2,

        "indicators": [
            "REPUBLIC OF THE PHILIPPINES",
            "PAMBANSANG PAGKAKAKILANLAN",
            "PHILIPPINE NATIONAL ID",
            "NATIONAL ID",
            "PHILSYS",
            "SOCIAL SECURITY SYSTEM",
            "SSS",
            "UNIFIED MULTI PURPOSE ID",
            "UNIFIED MULTIPURPOSE ID",
            "UMID",
            "PHILIPPINE HEALTH INSURANCE CORPORATION",
            "PHILHEALTH",
            "BUREAU OF INTERNAL REVENUE",
            "TAXPAYER IDENTIFICATION NUMBER",
            "TIN",
            "GOVERNMENT SERVICE INSURANCE SYSTEM",
            "GSIS",
            "DATE OF BIRTH",
            "PETSA NG KAPANGANAKAN",
            "ADDRESS",
            "TIRAHAN",
            "ID",
            "IDENTIFICATION"
        ]
    },


    "birth_certificate": {

        "minimum_indicators": 2,

        "indicators": [
            "CERTIFICATE OF LIVE BIRTH",
            "CERTIFICATE OF BIRTH",
            "OFFICE OF THE CIVIL REGISTRAR GENERAL",
            "CIVIL REGISTRAR",
            "PHILIPPINE STATISTICS AUTHORITY",
            "DATE OF BIRTH",
            "PLACE OF BIRTH",
            "CHILD",
            "REGISTRY NO"
        ]
    },


    "cedula": {

        "minimum_indicators": 2,

        "indicators": [
            "COMMUNITY TAX CERTIFICATE",
            "CEDULA",
            "COMMUNITY TAX",
            "PLACE OF ISSUE",
            "DATE OF ISSUE",
            "TAXPAYER",
            "ADDRESS",
            "BASIC COMMUNITY TAX",
            "CTC"
        ]
    }
}


# ============================================================
# BASIC ROUTES
# ============================================================

@app.get("/")
def root():

    return {
        "success": True,
        "service":
            "OSCA Document Verification API",
        "status":
            "running"
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


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_value(
    value
):

    if value is None:
        return ""

    value = str(
        value
    ).upper()

    value = re.sub(
        r"[^A-Z0-9\s]",
        " ",
        value
    )

    value = re.sub(
        r"\s+",
        " ",
        value
    )

    return value.strip()


# ============================================================
# SIMILARITY
# ============================================================

def similarity_score(
    first,
    second
):

    first = normalize_value(
        first
    )

    second = normalize_value(
        second
    )

    if not first or not second:
        return 0.0

    return SequenceMatcher(
        None,
        first,
        second
    ).ratio()


# ============================================================
# OCR-TOLERANT VALUE MATCHING
# ============================================================

def value_exists_in_document(
    value,
    ocr_text,
    threshold=0.78
):

    value = normalize_value(
        value
    )

    text = normalize_value(
        ocr_text
    )

    if not value:
        return None

    if not text:
        return False


    # --------------------------------------------------------
    # 1. Exact normalized match
    # --------------------------------------------------------

    if value in text:
        return True


    value_words = (
        value.split()
    )

    document_words = (
        text.split()
    )


    # --------------------------------------------------------
    # 2. Single word
    # --------------------------------------------------------

    if len(
        value_words
    ) == 1:

        for word in document_words:

            if (
                similarity_score(
                    value,
                    word
                )
                >=
                threshold
            ):

                return True

        return False


    # --------------------------------------------------------
    # 3. Sliding windows
    # --------------------------------------------------------

    expected_size = len(
        value_words
    )


    for start in range(
        len(
            document_words
        )
    ):

        for difference in range(
            -1,
            3
        ):

            window_size = (
                expected_size
                +
                difference
            )

            if window_size <= 0:
                continue


            end = (
                start
                +
                window_size
            )


            candidate_words = (
                document_words[
                    start:end
                ]
            )


            if not candidate_words:
                continue


            candidate = " ".join(
                candidate_words
            )


            if (
                similarity_score(
                    value,
                    candidate
                )
                >=
                threshold
            ):

                return True


    # --------------------------------------------------------
    # 4. Word coverage fallback
    # --------------------------------------------------------

    matched_words = 0


    for expected_word in value_words:

        found = False


        for document_word in document_words:

            if (
                similarity_score(
                    expected_word,
                    document_word
                )
                >=
                0.80
            ):

                found = True
                break


        if found:
            matched_words += 1


    coverage = (
        matched_words
        /
        len(
            value_words
        )
    )


    return (
        coverage
        >=
        0.75
    )


# ============================================================
# DATE OF BIRTH
# ============================================================

def generate_dob_variants(
    date_of_birth
):

    if not date_of_birth:
        return []


    try:

        dob = datetime.strptime(
            date_of_birth,
            "%Y-%m-%d"
        )

    except ValueError:

        return []


    variants = [

        dob.strftime(
            "%Y-%m-%d"
        ),

        dob.strftime(
            "%m/%d/%Y"
        ),

        dob.strftime(
            "%d/%m/%Y"
        ),

        dob.strftime(
            "%m-%d-%Y"
        ),

        dob.strftime(
            "%d-%m-%Y"
        ),

        dob.strftime(
            "%B %d, %Y"
        ),

        dob.strftime(
            "%B %d %Y"
        ),

        dob.strftime(
            "%b %d, %Y"
        ),

        dob.strftime(
            "%b %d %Y"
        ),

        dob.strftime(
            "%d %B %Y"
        ),

        dob.strftime(
            "%d %b %Y"
        ),

        (
            f"{dob.month}/"
            f"{dob.day}/"
            f"{dob.year}"
        ),

        (
            f"{dob.day}/"
            f"{dob.month}/"
            f"{dob.year}"
        ),

        (
            f"{dob.day} "
            f"{dob.strftime('%B')} "
            f"{dob.year}"
        ),

        (
            f"{dob.day} "
            f"{dob.strftime('%b')} "
            f"{dob.year}"
        ),

        (
            f"{dob.strftime('%B')} "
            f"{dob.day} "
            f"{dob.year}"
        ),

        (
            f"{dob.strftime('%b')} "
            f"{dob.day} "
            f"{dob.year}"
        )
    ]


    return list(
        dict.fromkeys(
            variants
        )
    )


def check_dob(
    date_of_birth,
    ocr_text
):

    if not date_of_birth:
        return None


    variants = (
        generate_dob_variants(
            date_of_birth
        )
    )


    if not variants:
        return False


    document_text = (
        normalize_value(
            ocr_text
        )
    )


    # --------------------------------------------------------
    # Exact comparison
    # --------------------------------------------------------

    for variant in variants:

        normalized_variant = (
            normalize_value(
                variant
            )
        )


        if (
            normalized_variant
            and
            normalized_variant
            in
            document_text
        ):

            return True


    # --------------------------------------------------------
    # OCR-tolerant comparison
    # --------------------------------------------------------

    for variant in variants:

        result = (
            value_exists_in_document(
                variant,
                ocr_text,
                threshold=0.80
            )
        )


        if result is True:
            return True


    return False


# ============================================================
# NAME MATCHING
# ============================================================

def check_name_part(
    value,
    ocr_text
):

    if not value:
        return None


    return (
        value_exists_in_document(
            value,
            ocr_text,
            threshold=0.76
        )
    )


def check_full_name(
    first_name,
    middle_name,
    surname,
    ocr_text
):

    first_result = (
        check_name_part(
            first_name,
            ocr_text
        )
    )


    middle_result = (
        check_name_part(
            middle_name,
            ocr_text
        )
    )


    surname_result = (
        check_name_part(
            surname,
            ocr_text
        )
    )


    name_matched = (
        first_result is True
        and
        surname_result is True
    )


    if middle_name:

        name_matched = (
            name_matched
            and
            middle_result is True
        )


    return {
        "nameMatched":
            name_matched,

        "firstNameMatched":
            first_result,

        "middleNameMatched":
            middle_result,

        "surnameMatched":
            surname_result
    }


# ============================================================
# PLACE OF BIRTH
# ============================================================

def check_place_of_birth(
    place_of_birth,
    ocr_text
):

    if not place_of_birth:
        return None


    return (
        value_exists_in_document(
            place_of_birth,
            ocr_text,
            threshold=0.72
        )
    )


# ============================================================
# ADDRESS
# ============================================================

def check_address(
    address,
    ocr_text
):

    if not address:
        return None


    return (
        value_exists_in_document(
            address,
            ocr_text,
            threshold=0.72
        )
    )


# ============================================================
# CROSS-DOCUMENT IDENTITY CONSISTENCY
# ============================================================

def evaluate_identity_consistency(
    document_type,
    ocr_text,
    first_name,
    middle_name,
    surname,
    date_of_birth,
    place_of_birth,
    address
):

    name_checks = check_full_name(
        first_name,
        middle_name,
        surname,
        ocr_text
    )

    dob_matched = check_dob(
        date_of_birth,
        ocr_text
    )

    place_of_birth_matched = (
        check_place_of_birth(
            place_of_birth,
            ocr_text
        )
    )

    address_matched = (
        check_address(
            address,
            ocr_text
        )
    )


    # --------------------------------------------------------
    # Determine required identity fields per document
    # --------------------------------------------------------

    required_checks = {
        "firstNameMatched":
            name_checks["firstNameMatched"],

        "surnameMatched":
            name_checks["surnameMatched"]
    }


    if middle_name:
        required_checks[
            "middleNameMatched"
        ] = name_checks[
            "middleNameMatched"
        ]


    if document_type in {
        "valid_id",
        "birth_certificate"
    }:
        required_checks[
            "dateOfBirthMatched"
        ] = dob_matched


    if document_type == "birth_certificate":
        required_checks[
            "placeOfBirthMatched"
        ] = place_of_birth_matched


    if document_type in {
        "valid_id",
        "cedula"
    }:
        required_checks[
            "addressMatched"
        ] = address_matched


    # --------------------------------------------------------
    # Separate definite mismatches from unreadable/uncertain
    # --------------------------------------------------------

    definite_mismatches = [
        field
        for field, result
        in required_checks.items()
        if result is False
    ]

    unavailable_checks = [
        field
        for field, result
        in required_checks.items()
        if result is None
    ]


    # --------------------------------------------------------
    # Final consistency status
    # --------------------------------------------------------

    if definite_mismatches:

        consistency_status = "failed"

        message = (
            "The information on this document does not "
            "match the applicant information. Please "
            "upload the correct document."
        )

    elif unavailable_checks:

        consistency_status = "needs_review"

        message = (
            "Some applicant information could not be "
            "confirmed from the uploaded document."
        )

    else:

        consistency_status = "matched"

        message = (
            "The document information matches the "
            "applicant information."
        )


    return {
        "status":
            consistency_status,

        "documentType":
            document_type,

        "checks": {
            **name_checks,

            "dateOfBirthMatched":
                dob_matched,

            "placeOfBirthMatched":
                place_of_birth_matched,

            "addressMatched":
                address_matched
        },

        "mismatches":
            definite_mismatches,

        "unavailableChecks":
            unavailable_checks,

        "message":
            message
    }

# ============================================================
# FILE VALIDATION
# ============================================================

async def validate_uploaded_file(
    document:
        UploadFile
):

    if not document:

        return {
            "valid": False,
            "message":
                "No document was uploaded."
        }


    content_type = (
        document.content_type
        or
        ""
    ).lower()


    if (
        content_type
        not in
        ALLOWED_CONTENT_TYPES
    ):

        return {
            "valid": False,

            "message":
                (
                    "Unsupported file type. "
                    "Please upload a JPG, PNG, "
                    "or WEBP image."
                )
        }


    file_bytes = (
        await document.read()
    )


    if not file_bytes:

        return {
            "valid": False,
            "message":
                "The uploaded file is empty."
        }


    if (
        len(
            file_bytes
        )
        >
        MAX_FILE_SIZE
    ):

        return {
            "valid": False,

            "message":
                (
                    "The uploaded file is too large. "
                    "Maximum file size is 10 MB."
                )
        }


    # --------------------------------------------------------
    # Confirm image can actually be opened
    # --------------------------------------------------------

    try:

        image = Image.open(
            io.BytesIO(
                file_bytes
            )
        )

        image.verify()


    except Exception:

        return {
            "valid": False,

            "message":
                (
                    "The uploaded file could not "
                    "be read as a valid image."
                )
        }


    return {
        "valid":
            True,

        "file_bytes":
            file_bytes,

        "content_type":
            content_type
    }


# ============================================================
# OCR.SPACE
# ============================================================

def extract_text_with_ocr_space(
    file_bytes,
    filename,
    content_type
):

    if not OCR_SPACE_API_KEY:

        return {
            "success": False,
            "text": "",

            "message":
                "OCR_SPACE_API_KEY is not configured."
        }


    try:

        response = requests.post(

            OCR_SPACE_URL,

            files={
                "file": (
                    filename,
                    file_bytes,
                    content_type
                )
            },

            data={
                "apikey":
                    OCR_SPACE_API_KEY,

                "language":
                    "eng",

                "isOverlayRequired":
                    "false",

                "detectOrientation":
                    "true",

                "scale":
                    "true",

                "OCREngine":
                    "2"
            },

            timeout=60
        )


    except requests.RequestException as exc:

        return {
            "success": False,
            "text": "",

            "message":
                (
                    "Unable to connect to "
                    "the OCR service: "
                    f"{str(exc)}"
                )
        }


    if response.status_code != 200:

        return {
            "success": False,
            "text": "",

            "message":
                (
                    "OCR service returned HTTP "
                    f"{response.status_code}."
                )
        }


    try:

        result = response.json()

    except ValueError:

        return {
            "success": False,
            "text": "",

            "message":
                "OCR service returned an invalid response."
        }


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


        return {
            "success": False,
            "text": "",

            "message":
                (
                    error_message
                    or
                    "OCR could not process the document."
                )
        }


    parsed_results = (
        result.get(
            "ParsedResults"
        )
        or
        []
    )


    extracted_parts = []


    for parsed_result in parsed_results:

        parsed_text = (
            parsed_result.get(
                "ParsedText",
                ""
            )
        )


        if parsed_text:

            extracted_parts.append(
                parsed_text
            )


    extracted_text = "\n".join(
        extracted_parts
    ).strip()


    if not extracted_text:

        return {
            "success": False,
            "text": "",

            "message":
                (
                    "No readable text was "
                    "detected in the document."
                )
        }


    return {
        "success": True,
        "text": extracted_text,
        "message":
            "OCR completed successfully."
    }


# ============================================================
# NATIONAL ID QR DETECTION
# ============================================================

def decode_qr_from_image(
    file_bytes
):

    try:

        np_array = (
            np.frombuffer(
                file_bytes,
                np.uint8
            )
        )


        image = cv2.imdecode(
            np_array,
            cv2.IMREAD_COLOR
        )


        if image is None:

            return {
                "success": False,
                "qrDetected": False,
                "qrData": None,

                "message":
                    "Unable to read the uploaded image."
            }


        detector = (
            cv2.QRCodeDetector()
        )


        data, points, _ = (
            detector.detectAndDecode(
                image
            )
        )


        if not data:

            # ------------------------------------------------
            # Try enlarged image because QR codes on IDs
            # can be small relative to the uploaded photo.
            # ------------------------------------------------

            height, width = (
                image.shape[:2]
            )


            enlarged = cv2.resize(
                image,
                (
                    width * 2,
                    height * 2
                ),
                interpolation=
                    cv2.INTER_CUBIC
            )


            data, points, _ = (
                detector.detectAndDecode(
                    enlarged
                )
            )


        if not data:

            return {
                "success": True,
                "qrDetected": False,
                "qrData": None,

                "message":
                    (
                        "No readable QR code "
                        "was detected."
                    )
            }


        return {
            "success": True,
            "qrDetected": True,
            "qrData": data,

            "message":
                "QR code detected successfully."
        }


    except Exception as exc:

        print(
            "QR decoding error:",
            repr(
                exc
            )
        )


        return {
            "success": False,
            "qrDetected": False,
            "qrData": None,

            "message":
                "Unable to decode the QR code."
        }


# ============================================================
# TEMPORARY NATIONAL ID QR TEST
# ============================================================

@app.post(
    "/test-national-id-qr"
)
async def test_national_id_qr(

    document:
        UploadFile = File(...)
):

    document_result = (
        await validate_uploaded_file(
            document
        )
    )


    if not document_result[
        "valid"
    ]:

        return {
            "success": False,
            "qrDetected": False,

            "message":
                document_result[
                    "message"
                ]
        }


    qr_result = (
        decode_qr_from_image(
            document_result[
                "file_bytes"
            ]
        )
    )


    # IMPORTANT:
    # qrData is deliberately not returned by
    # this endpoint because National ID QR data
    # can contain personal information.
    return {
        "success":
            qr_result[
                "success"
            ],

        "qrDetected":
            qr_result[
                "qrDetected"
            ],

        "message":
            qr_result[
                "message"
            ]
    }


# ============================================================
# VALID ID SUBTYPE + AUTHENTICITY SUPPORT
# ============================================================

VALID_ID_TYPES = {
    "national_id": {"label": "National ID", "indicators": ["PAMBANSANG PAGKAKAKILANLAN", "PHILIPPINE NATIONAL ID", "NATIONAL ID", "PHILSYS"], "qr_expected": True},
    "sss_umid": {"label": "SSS / UMID", "indicators": ["SOCIAL SECURITY SYSTEM", "SSS", "UNIFIED MULTI PURPOSE ID", "UNIFIED MULTIPURPOSE ID", "UMID"], "qr_expected": False},
    "philhealth": {"label": "PhilHealth ID", "indicators": ["PHILIPPINE HEALTH INSURANCE CORPORATION", "PHILHEALTH"], "qr_expected": False},
    "tin": {"label": "TIN ID", "indicators": ["BUREAU OF INTERNAL REVENUE", "TAXPAYER IDENTIFICATION NUMBER", "TIN"], "qr_expected": True},
    "gsis_umid": {"label": "GSIS / UMID", "indicators": ["GOVERNMENT SERVICE INSURANCE SYSTEM", "GSIS"], "qr_expected": False}
}

def detect_valid_id_type(ocr_text):
    text = normalize_value(ocr_text)
    order = ["national_id", "philhealth", "tin", "gsis_umid", "sss_umid"]
    scores = {}
    for id_type in order:
        scores[id_type] = sum(1 for x in VALID_ID_TYPES[id_type]["indicators"] if normalize_value(x) in text)
    if "GSIS" in text: scores["gsis_umid"] += 3
    if "SOCIAL SECURITY SYSTEM" in text or re.search(r"\bSSS\b", text): scores["sss_umid"] += 3
    if "PHILHEALTH" in text: scores["philhealth"] += 3
    if "BUREAU OF INTERNAL REVENUE" in text or "TAXPAYER IDENTIFICATION NUMBER" in text: scores["tin"] += 3
    if "PAMBANSANG PAGKAKAKILANLAN" in text or "PHILIPPINE NATIONAL ID" in text or "PHILSYS" in text: scores["national_id"] += 3
    best = max(order, key=lambda x: scores[x])
    if scores[best] <= 0:
        return {"detected": False, "idType": "unknown", "idLabel": "Unknown Valid ID", "scores": scores}
    return {"detected": True, "idType": best, "idLabel": VALID_ID_TYPES[best]["label"], "scores": scores}

def inspect_valid_id_authenticity(id_type, file_bytes, ocr_text):
    if id_type not in VALID_ID_TYPES:
        return {"checked": True, "idType": id_type or "unknown", "authenticityStatus": "unsupported_id", "authenticationMethod": None, "qrDetected": False, "message": "The valid ID type could not be identified."}
    qr = {"qrDetected": False}
    if VALID_ID_TYPES[id_type]["qr_expected"]:
        qr = decode_qr_from_image(file_bytes)
    qr_detected = bool(qr.get("qrDetected"))
    methods = {
        "national_id": "national_id_qr_detected" if qr_detected else "national_id_image_screening",
        "tin": "tin_qr_detected" if qr_detected else "tin_image_screening",
        "philhealth": "philhealth_image_screening",
        "sss_umid": "sss_umid_image_screening",
        "gsis_umid": "gsis_umid_image_screening"
    }
    return {
        "checked": True,
        "idType": id_type,
        "authenticityStatus": "official_verification_required",
        "authenticationMethod": methods[id_type],
        "qrDetected": qr_detected,
        "message": "The ID passed image/document screening, but issuer-backed official verification is required before it can be declared authentic."
    }

# ============================================================
# DOCUMENT TYPE SCREENING
# ============================================================

def screen_document_type(
    document_type,
    ocr_text
):

    document_type = (
        document_type
        or
        ""
    ).strip().lower()


    rules = (
        DOCUMENT_RULES.get(
            document_type
        )
    )


    if not rules:

        return {
            "matched": False,
            "matchedIndicators": [],

            "message":
                "Unsupported document type."
        }


    normalized_text = (
        normalize_value(
            ocr_text
        )
    )


    matched_indicators = []


    for indicator in rules[
        "indicators"
    ]:

        normalized_indicator = (
            normalize_value(
                indicator
            )
        )


        if (
            normalized_indicator
            in
            normalized_text
        ):

            matched_indicators.append(
                indicator
            )


    matched = (
        len(
            matched_indicators
        )
        >=
        rules[
            "minimum_indicators"
        ]
    )


    return {
        "matched":
            matched,

        "matchedIndicators":
            matched_indicators
    }


# ============================================================
# INFORMATION CHECKS
# ============================================================

def perform_information_checks(
    document_type,
    ocr_text,
    first_name,
    middle_name,
    surname,
    date_of_birth,
    place_of_birth,
    address
):

    name_results = (
        check_full_name(
            first_name,
            middle_name,
            surname,
            ocr_text
        )
    )


    information_checks = {

        **name_results,

        "dateOfBirthMatched":
            None,

        "placeOfBirthMatched":
            None,

        "addressMatched":
            None
    }


    # --------------------------------------------------------
    # VALID ID
    # --------------------------------------------------------

    if document_type == "valid_id":

        information_checks[
            "dateOfBirthMatched"
        ] = check_dob(
            date_of_birth,
            ocr_text
        )


        information_checks[
            "addressMatched"
        ] = check_address(
            address,
            ocr_text
        )

    # --------------------------------------------------------
    # BIRTH CERTIFICATE
    # --------------------------------------------------------

    elif (
        document_type
        ==
        "birth_certificate"
    ):

        information_checks[
            "dateOfBirthMatched"
        ] = check_dob(
            date_of_birth,
            ocr_text
        )


        information_checks[
            "placeOfBirthMatched"
        ] = check_place_of_birth(
            place_of_birth,
            ocr_text
        )


        information_checks[
            "addressMatched"
        ] = None


    # --------------------------------------------------------
    # CEDULA
    # --------------------------------------------------------

    elif document_type == "cedula":

        information_checks[
            "addressMatched"
        ] = check_address(
            address,
            ocr_text
        )


        information_checks[
            "dateOfBirthMatched"
        ] = None


        information_checks[
            "placeOfBirthMatched"
        ] = None


    return information_checks


# ============================================================
# MISMATCHES
# ============================================================

def build_mismatches(
    information_checks
):

    mismatches = []


    if (
        information_checks.get(
            "nameMatched"
        )
        is False
    ):

        mismatches.append(
            "Applicant name was not matched."
        )


    if (
        information_checks.get(
            "dateOfBirthMatched"
        )
        is False
    ):

        mismatches.append(
            "Date of birth was not matched."
        )


    if (
        information_checks.get(
            "placeOfBirthMatched"
        )
        is False
    ):

        mismatches.append(
            "Place of birth was not matched."
        )


    if (
        information_checks.get(
            "addressMatched"
        )
        is False
    ):

        mismatches.append(
            "Address was not matched."
        )


    return mismatches

def inspect_birth_certificate_authenticity(
    file_bytes,
    ocr_text
):
    """
    Screens a Philippine birth certificate for expected document
    characteristics.

    IMPORTANT:
    This does NOT claim that PSA/LCRO issued the document.
    True issuer authenticity requires an official issuer-backed
    verification mechanism or final staff verification.
    """

    text = normalize_value(ocr_text)

    indicators = {
        "certificateTitle": (
            "CERTIFICATE OF LIVE BIRTH" in text
        ),

        "civilRegistrar": (
            "CIVIL REGISTRAR" in text
            or
            "CIVIL REGISTRAR GENERAL" in text
        ),

        "psaOrNso": (
            "PHILIPPINE STATISTICS AUTHORITY" in text
            or
            "NATIONAL STATISTICS OFFICE" in text
            or
            "OFFICE OF THE CIVIL REGISTRAR GENERAL" in text
        ),

        "registryNumber": bool(
            re.search(
                r"\bREGISTRY\s*(NO|NUMBER)\b",
                text
            )
        ),

        "dateOfBirthField": (
            "DATE OF BIRTH" in text
        ),

        "placeOfBirthField": (
            "PLACE OF BIRTH" in text
        ),

        "motherSection": (
            "MOTHER" in text
            or
            "MAIDEN NAME" in text
        ),

        "fatherSection": (
            "FATHER" in text
        ),

        "certificationSection": (
            "CERTIFICATION OF BIRTH" in text
            or
            "CERTIFICATION" in text
        )
    }

    matched_count = sum(
        1
        for value in indicators.values()
        if value
    )

    total_count = len(indicators)

    # This is a document-structure confidence score,
    # NOT an authenticity probability.
    structure_score = round(
        matched_count / total_count,
        2
    )

    if matched_count >= 6:

        screening = "passed"

        message = (
            "The uploaded file contains the expected "
            "structure and indicators of a Philippine "
            "Certificate of Live Birth. However, image "
            "screening cannot prove that PSA or the Local "
            "Civil Registrar issued the document. Final "
            "official/staff verification is required."
        )

    elif matched_count >= 3:

        screening = "needs_review"

        message = (
            "Some expected Birth Certificate indicators "
            "were detected, but the document could not be "
            "confidently screened. OSCA staff must review it."
        )

    else:

        screening = "failed"

        message = (
            "The uploaded file does not contain enough "
            "expected Birth Certificate indicators."
        )

    return {
        "checked": True,

        "document":
            "birth_certificate",

        "documentStructureScreening":
            screening,

        "structureScore":
            structure_score,

        "matchedStructureIndicators": [
            key
            for key, value
            in indicators.items()
            if value
        ],

        "missingStructureIndicators": [
            key
            for key, value
            in indicators.items()
            if not value
        ],

        "authenticityStatus":
            "official_verification_required",

        "authenticationMethod":
            "birth_certificate_document_screening",

        "issuerVerification":
            "not_performed",

        "staffVerificationRequired":
            True,

        "message":
            message
    }

def inspect_cedula_authenticity(
    file_bytes,
    ocr_text
):
    """
    Screens a Community Tax Certificate for expected
    document characteristics.

    This does not constitute issuer authentication.
    """

    text = normalize_value(ocr_text)

    indicators = {
        "communityTaxCertificate": (
            "COMMUNITY TAX CERTIFICATE" in text
        ),

        "cedula": (
            "CEDULA" in text
        ),

        "republicOfPhilippines": (
            "REPUBLIC OF THE PHILIPPINES" in text
        ),

        "year": bool(
            re.search(
                r"\b20\d{2}\b",
                text
            )
        ),

        "nameField": (
            "NAME" in text
            or
            "TAXPAYER" in text
        ),

        "addressField": (
            "ADDRESS" in text
        ),

        "dateOfBirthField": (
            "DATE OF BIRTH" in text
            or
            "BIRTHDATE" in text
        ),

        "placeOfBirthField": (
            "PLACE OF BIRTH" in text
        ),

        "citizenshipField": (
            "CITIZENSHIP" in text
        ),

        "signatureField": (
            "SIGNATURE" in text
        )
    }


    matched_count = sum(
        1
        for value in indicators.values()
        if value
    )

    total_count = len(indicators)

    structure_score = round(
        matched_count / total_count,
        2
    )


    if matched_count >= 6:

        screening = "passed"

        message = (
            "The uploaded file contains expected "
            "Community Tax Certificate characteristics. "
            "Issuer-backed verification is still required."
        )

    elif matched_count >= 3:

        screening = "needs_review"

        message = (
            "Some expected Community Tax Certificate "
            "characteristics were detected, but the "
            "document requires additional review."
        )

    else:

        screening = "failed"

        message = (
            "The uploaded file does not contain enough "
            "expected Community Tax Certificate indicators."
        )


    return {
        "checked": True,

        "document":
            "community_tax_certificate",

        "documentStructureScreening":
            screening,

        "structureScore":
            structure_score,

        "matchedStructureIndicators": [
            key
            for key, value
            in indicators.items()
            if value
        ],

        "missingStructureIndicators": [
            key
            for key, value
            in indicators.items()
            if not value
        ],

        "authenticityStatus":
            "official_verification_required",

        "authenticationMethod":
            "community_tax_certificate_document_screening",

        "issuerVerification":
            "not_performed",

        "staffVerificationRequired":
            True,

        "message":
            message
    }

# ============================================================
# MAIN DOCUMENT SCREENING ENDPOINT
# ============================================================

@app.post(
    "/screen-document"
)
async def screen_document(

    document:
        UploadFile = File(...),

    document_type:
        str = Form(...),

    first_name:
        str = Form(...),

    middle_name:
        Optional[str] = Form(
            None
        ),

    surname:
        str = Form(...),

    date_of_birth:
        Optional[str] = Form(
            None
        ),

    place_of_birth:
        Optional[str] = Form(
            None
        ),

    address:
        Optional[str] = Form(
            None
        )
):

    # ========================================================
    # 1. DOCUMENT TYPE
    # ========================================================

    document_type = (
        document_type
        or
        ""
    ).strip().lower()


    if (
        document_type
        not in
        DOCUMENT_RULES
    ):

        return {
            "success": False,
            "passed": False,
            "readable": False,
            "documentTypeMatched": False,
            "screeningStatus":
                "rejected",

            "message":
                (
                    "Invalid document type. "
                    "Use valid_id, "
                    "birth_certificate, or cedula."
                )
        }


    # ========================================================
    # 2. FILE VALIDATION
    # ========================================================

    file_result = (
        await validate_uploaded_file(
            document
        )
    )


    if not file_result[
        "valid"
    ]:

        return {
            "success": False,
            "passed": False,
            "readable": False,
            "documentTypeMatched": False,
            "screeningStatus":
                "rejected",

            "message":
                file_result[
                    "message"
                ]
        }


    # ========================================================
    # 3. OCR
    # ========================================================

    ocr_result = (
        extract_text_with_ocr_space(
            file_result[
                "file_bytes"
            ],

            document.filename
            or
            "document.jpg",

            file_result[
                "content_type"
            ]
        )
    )


    if not ocr_result[
        "success"
    ]:

        return {
            "success": False,
            "passed": False,
            "readable": False,
            "documentTypeMatched": False,
            "screeningStatus":
                "needs_review",

            "message":
                (
                    "The document could not be "
                    "reliably read. OSCA staff "
                    "must review the document."
                ),

            "ocrMessage":
                ocr_result[
                    "message"
                ]
        }


    ocr_text = (
        ocr_result[
            "text"
        ]
    )

    identity_consistency = (
        evaluate_identity_consistency(
            document_type,
            ocr_text,
            first_name,
            middle_name,
            surname,
            date_of_birth,
            place_of_birth,
            address
        )
    )

    if identity_consistency["status"] == "failed":
        return {
            "success": True,
            "passed": False,
            "screeningStatus": "rejected",
            "identityConsistency": identity_consistency,
            "staffVerificationRequired": True,
            "message": identity_consistency["message"]
        }


    # ========================================================
    # 4. DOCUMENT TYPE SCREENING
    # ========================================================

    type_result = (
        screen_document_type(
            document_type,
            ocr_text
        )
    )


    if not type_result[
        "matched"
    ]:

        return {
            "success": True,
            "passed": False,
            "readable": True,
            "documentTypeMatched": False,

            "matchedIndicators":
                type_result[
                    "matchedIndicators"
                ],

            "screeningStatus":
                "rejected",

            "message":
                (
                    "The uploaded file does not "
                    "appear to be the required "
                    "document."
                )
        }


    # ========================================================
    # 5. INFORMATION COMPARISON
    # ========================================================

    information_checks = (
        perform_information_checks(
            document_type,
            ocr_text,
            first_name,
            middle_name,
            surname,
            date_of_birth,
            place_of_birth,
            address
        )
    )


    mismatches = (
        build_mismatches(
            information_checks
        )
    )


    # ========================================================
    # 6. VALID ID SUBTYPE + AUTHENTICITY SUPPORT
    # ========================================================

    valid_id_detection = None
    authenticity_check = None
    national_id_qr = None

    if document_type == "valid_id":
        valid_id_detection = detect_valid_id_type(ocr_text)

        if not valid_id_detection["detected"]:
            return {
                "success": True, "passed": False, "readable": True,
                "documentTypeMatched": True,
                "matchedIndicators": type_result["matchedIndicators"],
                "informationChecks": information_checks,
                "mismatches": mismatches,
                "validIdType": "unknown", "validIdTypeMatched": False,
                "authenticityCheck": {
                    "checked": True, "idType": "unknown",
                    "authenticityStatus": "unsupported_id",
                    "authenticationMethod": None, "qrDetected": False,
                    "message": "The uploaded ID could not be identified as National ID, SSS/UMID, PhilHealth, TIN, or GSIS/UMID."
                },
                "screeningStatus": "rejected",
                "staffVerificationRequired": True,
                "message": "Please upload a supported ID: National ID, SSS/UMID, PhilHealth, TIN, or GSIS/UMID."
            }

        authenticity_check = inspect_valid_id_authenticity(
            valid_id_detection["idType"], file_result["file_bytes"], ocr_text
        )

        if valid_id_detection["idType"] == "national_id":
            national_id_qr = {
                "checked": True,
                "qrDetected": authenticity_check["qrDetected"],
                "authenticationStatus": authenticity_check["authenticityStatus"]
            }

        if document_type == "birth_certificate":
            authenticity_check = inspect_birth_certificate_authenticity(
                file_result["file_bytes"],
                ocr_text
            )

        if document_type == "cedula":

            authenticity_check = (
                inspect_cedula_authenticity(
                    file_result["file_bytes"],
                    ocr_text
                )
            )

    # ========================================================
    # 7. SCREENING STATUS
    # ========================================================

    if len(
        mismatches
    ) == 0:

        screening_status = (
            "passed"
        )

        passed = True

        message = (
            "The document passed automated "
            "screening. Final verification will "
            "be performed by OSCA staff."
        )


    else:

        screening_status = (
            "needs_review"
        )

        passed = False

        message = (
            "The document appears to be the "
            "correct type, but some information "
            "could not be matched. OSCA staff "
            "must review the document."
        )


    # ========================================================
    # 8. RESPONSE
    # ========================================================

    return {
        "success": True,

        "passed": passed,

        "readable": True,

        "documentTypeMatched": True,

        "matchedIndicators": type_result["matchedIndicators"],

        "informationChecks": information_checks,

        "mismatches": mismatches,

        "identityConsistency": identity_consistency,

        "validIdType": (valid_id_detection["idType"] if valid_id_detection else None),

        "validIdLabel": (valid_id_detection["idLabel"] if valid_id_detection else None),

        "validIdTypeMatched": (valid_id_detection["detected"] if valid_id_detection else None),

        "authenticityCheck": authenticity_check,

        "nationalIdQr": national_id_qr,

        "screeningStatus": screening_status,

        "staffVerificationRequired": True,

        "message": message
    }