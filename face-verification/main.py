from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form
)

from fastapi.middleware.cors import (
    CORSMiddleware
)

import cv2
import numpy as np
import onnxruntime as ort
import easyocr
import re

from datetime import datetime, date
from pathlib import Path


# =====================================================
# MODEL PATHS
# =====================================================

BASE_DIR = Path(__file__).resolve().parent

YUNET_MODEL_PATH = (
    BASE_DIR
    / "models"
    / "face_detection_yunet_2023mar.onnx"
)

SFACE_MODEL_PATH = (
    BASE_DIR
    / "models"
    / "face_recognition_sface_2021dec.onnx"
)

MINIFASNET_MODEL_PATH = (
    BASE_DIR
    / "models"
    / "MiniFASNetV2.onnx"
)


# =====================================================
# CONFIGURATION
# =====================================================

YUNET_SCORE_THRESHOLD = 0.50

YUNET_NMS_THRESHOLD = 0.30

SFACE_COSINE_THRESHOLD = 0.363

ANTI_SPOOF_CROP_SCALE = 2.7

MINIMUM_SENIOR_AGE = 60


# =====================================================
# FASTAPI APP
# =====================================================

app = FastAPI(
    title="OSCA Verification API",
    version="3.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# GLOBAL MODEL SESSIONS
# =====================================================

anti_spoof_session = None

ocr_reader = None


# =====================================================
# BASIC ROUTES
# =====================================================

@app.get("/")
def root():

    return {
        "success": True,
        "message":
            "OSCA Verification API is running."
    }


@app.get("/health")
def health_check():

    return {
        "success": True,
        "status": "healthy",

        "models": {
            "yunet":
                YUNET_MODEL_PATH.exists(),

            "sface":
                SFACE_MODEL_PATH.exists(),

            "minifasnet":
                MINIFASNET_MODEL_PATH.exists(),

            "easyocr":
                True
        }
    }


# =====================================================
# TEST IMAGE UPLOAD
# =====================================================

@app.post("/test-image")
async def test_image(
    image: UploadFile = File(...)
):

    image_bytes = await image.read()

    return {
        "success": True,
        "filename": image.filename,
        "contentType": image.content_type,
        "size": len(image_bytes)
    }


# =====================================================
# IMAGE HELPERS
# =====================================================

def decode_uploaded_image(
    image_bytes
):

    np_array = np.frombuffer(
        image_bytes,
        np.uint8
    )

    image = cv2.imdecode(
        np_array,
        cv2.IMREAD_COLOR
    )

    return image


def prepare_image_for_detection(
    image
):

    if image is None:
        return None

    height, width = image.shape[:2]

    min_dimension = min(
        width,
        height
    )

    if min_dimension < 640:

        scale = (
            640
            /
            min_dimension
        )

        new_width = int(
            width
            *
            scale
        )

        new_height = int(
            height
            *
            scale
        )

        image = cv2.resize(
            image,
            (
                new_width,
                new_height
            ),
            interpolation=cv2.INTER_CUBIC
        )

    return image


# =====================================================
# EASYOCR
# =====================================================

def get_ocr_reader():

    global ocr_reader

    if ocr_reader is None:

        print(
            "Loading EasyOCR..."
        )

        ocr_reader = easyocr.Reader(
            ["en"],
            gpu=False
        )

        print(
            "EasyOCR loaded successfully."
        )

    return ocr_reader


# =====================================================
# AGE VERIFICATION HELPERS
# =====================================================

def parse_birth_date(
    value
):

    if not value:
        return None

    value = value.strip()

    # Example:
    #
    # November 05,2005
    #
    # becomes:
    #
    # November 05, 2005

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

            parsed = datetime.strptime(
                value,
                date_format
            )

            return parsed.date()

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


def extract_birth_date_from_image(
    image_bytes
):

    reader = get_ocr_reader()


    image = decode_uploaded_image(
        image_bytes
    )


    if image is None:

        return (
            None,
            None,
            []
        )


    results = reader.readtext(
        image,
        detail=1
    )


    detected_text = []


    for result in results:

        box, text, confidence = result


        detected_text.append(
            {
                "text":
                    text,

                "confidence":
                    round(
                        float(
                            confidence
                        ),
                        4
                    )
            }
        )


    # =================================================
    # FIRST METHOD:
    #
    # Find a DOB label and then inspect the text
    # immediately following it.
    # =================================================

    for index, item in enumerate(
        detected_text
    ):

        text_upper = (
            item["text"]
            .upper()
        )


        normalized_text = (
            text_upper
            .replace(
                "0",
                "O"
            )
        )


        is_birth_date_label = (

            "DATE OF BIRTH"
            in normalized_text

            or

            "PETSA NG KAPANGANAKAN"
            in normalized_text
        )


        if not is_birth_date_label:

            continue


        # Search the next few OCR results because
        # the date normally follows the DOB label.

        for offset in range(
            1,
            4
        ):

            candidate_index = (
                index
                +
                offset
            )


            if (
                candidate_index
                >=
                len(
                    detected_text
                )
            ):

                break


            candidate = (
                detected_text[
                    candidate_index
                ]
            )


            parsed_date = (
                parse_birth_date(
                    candidate[
                        "text"
                    ]
                )
            )


            if parsed_date:

                return (
                    parsed_date,

                    candidate[
                        "confidence"
                    ],

                    detected_text
                )


    # =================================================
    # FALLBACK:
    #
    # Search all OCR results for a recognizable date.
    # =================================================

    for item in detected_text:

        parsed_date = (
            parse_birth_date(
                item[
                    "text"
                ]
            )
        )


        if parsed_date:

            return (
                parsed_date,

                item[
                    "confidence"
                ],

                detected_text
            )


    return (
        None,
        None,
        detected_text
    )


# =====================================================
# YUNET FACE DETECTION
# =====================================================

def create_face_detector(
    width,
    height
):

    if not YUNET_MODEL_PATH.exists():

        raise FileNotFoundError(
            "YuNet face detection model is missing."
        )


    detector = cv2.FaceDetectorYN.create(
        str(
            YUNET_MODEL_PATH
        ),
        "",
        (
            width,
            height
        ),
        YUNET_SCORE_THRESHOLD,
        YUNET_NMS_THRESHOLD,
        5000
    )


    detector.setInputSize(
        (
            width,
            height
        )
    )


    return detector


def detect_single_face(
    image
):

    if image is None:

        return (
            None,
            "invalid_image"
        )


    prepared_image = (
        prepare_image_for_detection(
            image
        )
    )


    height, width = (
        prepared_image.shape[:2]
    )


    detector = (
        create_face_detector(
            width,
            height
        )
    )


    _, faces = detector.detect(
        prepared_image
    )


    # -------------------------------------------------
    # No face
    # -------------------------------------------------

    if (
        faces is None
        or
        len(faces) == 0
    ):

        return (
            None,
            "no_face"
        )


    # -------------------------------------------------
    # Sort by face area
    # -------------------------------------------------

    faces = sorted(
        faces,

        key=lambda face:
            face[2]
            *
            face[3],

        reverse=True
    )


    largest_face = faces[0]


    # -------------------------------------------------
    # Check for another significant face
    # -------------------------------------------------

    if len(faces) > 1:

        largest_area = (
            largest_face[2]
            *
            largest_face[3]
        )


        second_area = (
            faces[1][2]
            *
            faces[1][3]
        )


        if (
            second_area
            >=
            largest_area
            *
            0.40
        ):

            return (
                None,
                "multiple_faces"
            )


    return (
        {
            "image":
                prepared_image,

            "face":
                largest_face,

            "confidence":
                float(
                    largest_face[14]
                ),

            "detections":
                len(faces)
        },

        None
    )


# =====================================================
# SFACE FACE RECOGNITION
# =====================================================

def create_face_recognizer():

    if not SFACE_MODEL_PATH.exists():

        raise FileNotFoundError(
            "SFace recognition model is missing."
        )


    return cv2.FaceRecognizerSF.create(
        str(
            SFACE_MODEL_PATH
        ),
        ""
    )


# =====================================================
# MINIFASNET ANTI-SPOOFING
# =====================================================

def create_anti_spoof_session():

    global anti_spoof_session


    if anti_spoof_session is not None:

        return anti_spoof_session


    if not MINIFASNET_MODEL_PATH.exists():

        raise FileNotFoundError(
            "MiniFASNetV2 anti-spoofing model is missing."
        )


    anti_spoof_session = (
        ort.InferenceSession(
            str(
                MINIFASNET_MODEL_PATH
            ),

            providers=[
                "CPUExecutionProvider"
            ]
        )
    )


    return anti_spoof_session


def softmax(
    values
):

    exp_values = np.exp(
        values
        -
        np.max(
            values,
            axis=1,
            keepdims=True
        )
    )


    return (
        exp_values
        /
        exp_values.sum(
            axis=1,
            keepdims=True
        )
    )


def crop_face_for_antispoof(
    image,
    face,
    scale=ANTI_SPOOF_CROP_SCALE
):

    image_height, image_width = (
        image.shape[:2]
    )


    x = int(
        face[0]
    )

    y = int(
        face[1]
    )

    face_width = int(
        face[2]
    )

    face_height = int(
        face[3]
    )


    if (
        face_width <= 0
        or
        face_height <= 0
    ):

        return None


    effective_scale = min(

        (image_height - 1)
        /
        face_height,

        (image_width - 1)
        /
        face_width,

        scale
    )


    new_width = (
        face_width
        *
        effective_scale
    )


    new_height = (
        face_height
        *
        effective_scale
    )


    center_x = (
        x
        +
        face_width / 2
    )


    center_y = (
        y
        +
        face_height / 2
    )


    x1 = max(
        0,
        int(
            center_x
            -
            new_width / 2
        )
    )


    y1 = max(
        0,
        int(
            center_y
            -
            new_height / 2
        )
    )


    x2 = min(
        image_width - 1,
        int(
            center_x
            +
            new_width / 2
        )
    )


    y2 = min(
        image_height - 1,
        int(
            center_y
            +
            new_height / 2
        )
    )


    cropped = image[
        y1:y2 + 1,
        x1:x2 + 1
    ]


    if cropped.size == 0:

        return None


    return cv2.resize(
        cropped,
        (
            80,
            80
        )
    )


def check_face_liveness(
    image,
    face
):

    cropped_face = (
        crop_face_for_antispoof(
            image,
            face,
            scale=
                ANTI_SPOOF_CROP_SCALE
        )
    )


    if cropped_face is None:

        return {
            "isReal":
                False,

            "label":
                "Invalid",

            "score":
                0.0,

            "classIndex":
                -1,

            "probabilities":
                []
        }


    input_tensor = (
        cropped_face
        .astype(
            np.float32
        )
    )


    input_tensor = (
        np.transpose(
            input_tensor,
            (
                2,
                0,
                1
            )
        )
    )


    input_tensor = (
        np.expand_dims(
            input_tensor,
            axis=0
        )
    )


    session = (
        create_anti_spoof_session()
    )


    input_name = (
        session
        .get_inputs()[0]
        .name
    )


    output_name = (
        session
        .get_outputs()[0]
        .name
    )


    logits = session.run(
        [
            output_name
        ],
        {
            input_name:
                input_tensor
        }
    )[0]


    probabilities = softmax(
        logits
    )


    predicted_class = int(
        np.argmax(
            probabilities,
            axis=1
        )[0]
    )


    predicted_score = float(
        probabilities[
            0,
            predicted_class
        ]
    )


    # MiniFASNetV2:
    #
    # class 1 = real
    # other classes = spoof/fake

    is_real = (
        predicted_class == 1
    )


    return {
        "isReal":
            is_real,

        "label":
            (
                "Real"
                if is_real
                else "Fake"
            ),

        "score":
            round(
                predicted_score,
                4
            ),

        "classIndex":
            predicted_class,

        "probabilities": [
            round(
                float(value),
                4
            )
            for value
            in probabilities[0]
        ]
    }


# =====================================================
# DETECT FACE ENDPOINT
# =====================================================

@app.post("/detect-face")
async def detect_face(
    image: UploadFile = File(...)
):

    image_bytes = (
        await image.read()
    )


    img = decode_uploaded_image(
        image_bytes
    )


    if img is None:

        return {
            "success": False,
            "faceDetected": False,
            "faceCount": 0,

            "message":
                "The uploaded file is not a valid image."
        }


    try:

        result, error = (
            detect_single_face(
                img
            )
        )

    except Exception as exc:

        print(
            "Face detection error:",
            exc
        )


        return {
            "success": False,
            "faceDetected": False,
            "faceCount": 0,

            "message":
                "Unable to perform face detection."
        }


    if error == "no_face":

        return {
            "success": True,
            "faceDetected": False,
            "faceCount": 0,

            "message":
                "No face was detected in the image."
        }


    if error == "multiple_faces":

        return {
            "success": True,
            "faceDetected": True,
            "faceCount": 2,

            "message":
                "Multiple faces were detected. Please use an image containing only one person."
        }


    return {
        "success": True,
        "faceDetected": True,
        "faceCount": 1,

        "confidence":
            round(
                result[
                    "confidence"
                ],
                4
            ),

        "message":
            "One face was detected successfully."
    }


# =====================================================
# CHECK LIVENESS ENDPOINT
# =====================================================

@app.post("/check-liveness")
async def check_liveness(
    image: UploadFile = File(...)
):

    image_bytes = (
        await image.read()
    )


    img = decode_uploaded_image(
        image_bytes
    )


    if img is None:

        return {
            "success": False,
            "isReal": False,

            "message":
                "The uploaded file is not a valid image."
        }


    try:

        face_result, face_error = (
            detect_single_face(
                img
            )
        )

    except Exception as exc:

        print(
            "Liveness face detection error:",
            exc
        )


        return {
            "success": False,
            "isReal": False,

            "message":
                "Unable to detect a face for liveness verification."
        }


    if face_error == "no_face":

        return {
            "success": True,
            "isReal": False,

            "message":
                "No face was detected."
        }


    if face_error == "multiple_faces":

        return {
            "success": True,
            "isReal": False,

            "message":
                "Multiple faces were detected."
        }


    try:

        liveness = (
            check_face_liveness(
                face_result[
                    "image"
                ],

                face_result[
                    "face"
                ]
            )
        )

    except Exception as exc:

        print(
            "Anti-spoofing error:",
            exc
        )


        return {
            "success": False,
            "isReal": False,

            "message":
                "Unable to perform liveness detection."
        }


    return {
        "success": True,

        "isReal":
            liveness[
                "isReal"
            ],

        "label":
            liveness[
                "label"
            ],

        "score":
            liveness[
                "score"
            ],

        "classIndex":
            liveness[
                "classIndex"
            ],

        "probabilities":
            liveness[
                "probabilities"
            ],

        "message":
            (
                "A live face was detected."
                if liveness[
                    "isReal"
                ]
                else
                "Possible photo or screen spoof detected."
            )
    }


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
    # 1. VALIDATE ENTERED DOB
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
            "success": False,
            "verified": False,
            "birthDateMatches": False,
            "ageEligible": False,

            "message":
                "The entered date of birth is invalid."
        }


    # =================================================
    # 2. READ DOCUMENT
    # =================================================

    document_bytes = (
        await document.read()
    )


    if not document_bytes:

        return {
            "success": False,
            "verified": False,
            "birthDateMatches": False,
            "ageEligible": False,

            "message":
                "The uploaded valid ID is empty."
        }


    # =================================================
    # 3. OCR DATE OF BIRTH
    # =================================================

    try:

        (
            detected_birth_date,
            ocr_confidence,
            detected_text
        ) = (
            extract_birth_date_from_image(
                document_bytes
            )
        )

    except Exception as exc:

        print(
            "OCR age verification error:",
            exc
        )


        return {
            "success": False,
            "verified": False,
            "birthDateMatches": False,
            "ageEligible": False,

            "message":
                "Unable to read the date of birth from the uploaded valid ID."
        }


    # =================================================
    # 4. DOB NOT FOUND
    # =================================================

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

            "ocrConfidence":
                None,

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
    # 6. CALCULATE AGE FROM DOCUMENT DOB
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
        "success": True,

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

        "ocrConfidence":
            ocr_confidence,

        "message":
            message
    }


# =====================================================
# FULL FACE VERIFICATION ENDPOINT
# =====================================================

@app.post("/verify-face")
async def verify_face(

    source_image:
        UploadFile = File(...),

    target_image:
        UploadFile = File(...)
):

    # =================================================
    # 1. READ FILES
    # =================================================

    source_bytes = (
        await source_image.read()
    )

    target_bytes = (
        await target_image.read()
    )


    # =================================================
    # 2. DECODE FILES
    # =================================================

    source = decode_uploaded_image(
        source_bytes
    )

    target = decode_uploaded_image(
        target_bytes
    )


    if source is None:

        return {
            "success": False,
            "verified": False,
            "livenessPassed": False,

            "message":
                "The uploaded valid ID image is invalid."
        }


    if target is None:

        return {
            "success": False,
            "verified": False,
            "livenessPassed": False,

            "message":
                "The captured camera image is invalid."
        }


    # =================================================
    # 3. DETECT FACE ON VALID ID
    # =================================================

    try:

        source_result, source_error = (
            detect_single_face(
                source
            )
        )

    except Exception as exc:

        print(
            "Source face detection error:",
            exc
        )


        return {
            "success": False,
            "verified": False,
            "livenessPassed": False,

            "message":
                "Unable to detect the face on the uploaded ID."
        }


    if source_error == "no_face":

        return {
            "success": True,
            "verified": False,
            "livenessPassed": False,

            "message":
                "No face was detected on the uploaded valid ID."
        }


    if source_error == "multiple_faces":

        return {
            "success": True,
            "verified": False,
            "livenessPassed": False,

            "message":
                "Multiple faces were detected on the uploaded valid ID."
        }


    # =================================================
    # 4. DETECT FACE ON LIVE CAMERA CAPTURE
    # =================================================

    try:

        target_result, target_error = (
            detect_single_face(
                target
            )
        )

    except Exception as exc:

        print(
            "Target face detection error:",
            exc
        )


        return {
            "success": False,
            "verified": False,
            "livenessPassed": False,

            "message":
                "Unable to detect the face from the camera."
        }


    if target_error == "no_face":

        return {
            "success": True,
            "verified": False,
            "livenessPassed": False,

            "message":
                "No face was detected from the camera."
        }


    if target_error == "multiple_faces":

        return {
            "success": True,
            "verified": False,
            "livenessPassed": False,

            "message":
                "Multiple faces were detected from the camera. Only one person should be visible."
        }


    # =================================================
    # 5. LIVENESS CHECK
    # =================================================

    try:

        liveness = (
            check_face_liveness(
                target_result[
                    "image"
                ],

                target_result[
                    "face"
                ]
            )
        )

    except Exception as exc:

        print(
            "Anti-spoofing verification error:",
            exc
        )


        return {
            "success": False,
            "verified": False,
            "livenessPassed": False,

            "message":
                "Unable to perform liveness verification."
        }


    # =================================================
    # 6. REJECT SPOOF
    # =================================================

    if not liveness[
        "isReal"
    ]:

        return {
            "success": True,

            "verified":
                False,

            "livenessPassed":
                False,

            "livenessLabel":
                liveness[
                    "label"
                ],

            "livenessScore":
                liveness[
                    "score"
                ],

            "livenessClass":
                liveness[
                    "classIndex"
                ],

            "livenessProbabilities":
                liveness[
                    "probabilities"
                ],

            "message":
                "Face verification failed. A possible photo or screen spoof was detected."
        }


    # =================================================
    # 7. LOAD SFACE
    # =================================================

    try:

        recognizer = (
            create_face_recognizer()
        )

    except Exception as exc:

        print(
            "SFace loading error:",
            exc
        )


        return {
            "success": False,
            "verified": False,
            "livenessPassed": True,

            "message":
                "Unable to load the face recognition model."
        }


    # =================================================
    # 8. ALIGN AND COMPARE FACES
    # =================================================

    try:

        source_aligned = (
            recognizer.alignCrop(
                source_result[
                    "image"
                ],

                source_result[
                    "face"
                ]
            )
        )


        target_aligned = (
            recognizer.alignCrop(
                target_result[
                    "image"
                ],

                target_result[
                    "face"
                ]
            )
        )


        source_features = (
            recognizer.feature(
                source_aligned
            )
        )


        target_features = (
            recognizer.feature(
                target_aligned
            )
        )


        cosine_score = (
            recognizer.match(
                source_features,
                target_features,
                cv2.FaceRecognizerSF_FR_COSINE
            )
        )


    except cv2.error as exc:

        print(
            "OpenCV face comparison error:",
            exc
        )


        return {
            "success": False,
            "verified": False,
            "livenessPassed": True,

            "message":
                "Unable to compare the detected faces."
        }


    # =================================================
    # 9. FINAL FACE VERIFICATION RESULT
    # =================================================

    verified = bool(
        cosine_score
        >=
        SFACE_COSINE_THRESHOLD
    )


    return {
        "success": True,

        "verified":
            verified,

        "livenessPassed":
            True,

        "livenessLabel":
            liveness[
                "label"
            ],

        "livenessScore":
            liveness[
                "score"
            ],

        "livenessClass":
            liveness[
                "classIndex"
            ],

        "livenessProbabilities":
            liveness[
                "probabilities"
            ],

        "similarity":
            round(
                float(
                    cosine_score
                ),
                4
            ),

        "threshold":
            SFACE_COSINE_THRESHOLD,

        "sourceFaceConfidence":
            round(
                source_result[
                    "confidence"
                ],
                4
            ),

        "targetFaceConfidence":
            round(
                target_result[
                    "confidence"
                ],
                4
            ),

        "message":
            (
                "The live face matches the uploaded valid ID."
                if verified
                else
                "The live face does not match the uploaded valid ID."
            )
    }