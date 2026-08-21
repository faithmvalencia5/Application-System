from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

import cv2
import numpy as np

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


# =====================================================
# APP
# =====================================================

app = FastAPI(
    title="OSCA Face Verification API",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# BASIC ROUTES
# =====================================================

@app.get("/")
def root():
    return {
        "success": True,
        "message":
            "OSCA Face Verification API is running."
    }


@app.get("/health")
def health_check():
    return {
        "success": True,
        "status": "healthy"
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
# HELPER: DECODE IMAGE
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


# =====================================================
# HELPER: PREPARE IMAGE
# =====================================================

def prepare_image_for_detection(
    image
):
    if image is None:
        return None

    height, width = image.shape[:2]

    
    #Enlarge small images because ID photos,
    #scanned documents, and compressed photos
    #may otherwise contain faces that are too
    #small for reliable detection.
    

    min_dimension = min(
        width,
        height
    )

    if min_dimension < 640:

        scale = (
            640 / min_dimension
        )

        new_width = int(
            width * scale
        )

        new_height = int(
            height * scale
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
# HELPER: CREATE YUNET DETECTOR
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
        str(YUNET_MODEL_PATH),
        "",
        (
            width,
            height
        ),

        # Detection threshold
        0.50,

        # Non-maximum suppression threshold
        0.30,

        # Maximum detections
        5000
    )

    detector.setInputSize(
        (
            width,
            height
        )
    )

    return detector


# =====================================================
# HELPER: DETECT EXACTLY ONE FACE
# =====================================================

def detect_single_face(image):
    if image is None:
        return None, "invalid_image"

    prepared_image = prepare_image_for_detection(image)

    height, width = prepared_image.shape[:2]

    detector = create_face_detector(
        width,
        height
    )

    _, faces = detector.detect(prepared_image)

    # ---------------------------------------------
    # No face
    # ---------------------------------------------

    if faces is None or len(faces) == 0:
        return None, "no_face"

    # ---------------------------------------------
    # Sort detections by face area
    # ---------------------------------------------

    faces = sorted(
        faces,
        key=lambda face: face[2] * face[3],
        reverse=True
    )

    largest_face = faces[0]

    # ---------------------------------------------
    # If multiple detections exist, determine
    # whether there is actually another significant
    # face in the image.
    # ---------------------------------------------

    if len(faces) > 1:

        largest_area = (
            largest_face[2]
            * largest_face[3]
        )

        second_area = (
            faces[1][2]
            * faces[1][3]
        )

        # If the second detected face is reasonably
        # large compared with the main face, assume
        # that there really are multiple people.
        if second_area >= largest_area * 0.40:

            return None, "multiple_faces"

        # Otherwise the smaller detection is treated
        # as a likely false detection.

    return (
        {
            "image": prepared_image,
            "face": largest_face,
            "confidence": float(
                largest_face[14]
            ),
            "detections": len(faces)
        },
        None
    )


# =====================================================
# HELPER: CREATE SFACE RECOGNIZER
# =====================================================

def create_face_recognizer():

    if not SFACE_MODEL_PATH.exists():

        raise FileNotFoundError(
            "SFace recognition model is missing."
        )


    recognizer = (
        cv2.FaceRecognizerSF.create(
            str(
                SFACE_MODEL_PATH
            ),
            ""
        )
    )

    return recognizer


# =====================================================
# DETECT FACE
# =====================================================

@app.post("/detect-face")
async def detect_face(
    image: UploadFile = File(...)
):

    image_bytes = await image.read()


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


    except FileNotFoundError as exc:

        return {
            "success": False,
            "faceDetected": False,
            "faceCount": 0,
            "message": str(exc)
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
                result["confidence"],
                4
            ),

        "message":
            "One face was detected successfully."
    }


# =====================================================
# VERIFY TWO FACES
# =====================================================

@app.post("/verify-face")
async def verify_face(

    source_image:
        UploadFile = File(...),

    target_image:
        UploadFile = File(...)
):

    # -------------------------------------------------
    # Read both uploads
    # -------------------------------------------------

    source_bytes = (
        await source_image.read()
    )

    target_bytes = (
        await target_image.read()
    )


    # -------------------------------------------------
    # Decode images
    # -------------------------------------------------

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

            "message":
                "The source image is not a valid image."
        }


    if target is None:

        return {
            "success": False,
            "verified": False,

            "message":
                "The target image is not a valid image."
        }


    # -------------------------------------------------
    # Detect source face
    # -------------------------------------------------

    try:

        source_result, source_error = (
            detect_single_face(
                source
            )
        )

    except FileNotFoundError as exc:

        return {
            "success": False,
            "verified": False,
            "message": str(exc)
        }


    if source_error == "no_face":

        return {
            "success": True,
            "verified": False,

            "message":
                "No face was detected in the source image."
        }


    if source_error == "multiple_faces":

        return {
            "success": True,
            "verified": False,

            "message":
                "Multiple faces were detected in the source image."
        }


    # -------------------------------------------------
    # Detect target face
    # -------------------------------------------------

    try:

        target_result, target_error = (
            detect_single_face(
                target
            )
        )

    except FileNotFoundError as exc:

        return {
            "success": False,
            "verified": False,
            "message": str(exc)
        }


    if target_error == "no_face":

        return {
            "success": True,
            "verified": False,

            "message":
                "No face was detected in the target image."
        }


    if target_error == "multiple_faces":

        return {
            "success": True,
            "verified": False,

            "message":
                "Multiple faces were detected in the target image."
        }


    # -------------------------------------------------
    # Load SFace
    # -------------------------------------------------

    try:

        recognizer = (
            create_face_recognizer()
        )

    except FileNotFoundError as exc:

        return {
            "success": False,
            "verified": False,
            "message": str(exc)
        }


    # -------------------------------------------------
    # Align and crop faces
    # -------------------------------------------------

    try:

        source_aligned = (
            recognizer.alignCrop(
                source_result["image"],
                source_result["face"]
            )
        )


        target_aligned = (
            recognizer.alignCrop(
                target_result["image"],
                target_result["face"]
            )
        )


        # ---------------------------------------------
        # Generate facial embeddings
        # ---------------------------------------------

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


        # ---------------------------------------------
        # Compare using cosine similarity
        # ---------------------------------------------

        cosine_score = (
            recognizer.match(
                source_features,
                target_features,

                cv2.FaceRecognizerSF_FR_COSINE
            )
        )


    except cv2.error as exc:

        print(
            "OpenCV face verification error:",
            exc
        )

        return {
            "success": False,
            "verified": False,

            "message":
                "Unable to compare the detected faces."
        }


    # =================================================
    # SFACE DEFAULT COSINE THRESHOLD
    # =================================================

    COSINE_THRESHOLD = 0.363


    verified = bool(
        cosine_score
        >= COSINE_THRESHOLD
    )


    return {
        "success": True,

        "verified":
            verified,

        "similarity":
            round(
                float(
                    cosine_score
                ),
                4
            ),

        "threshold":
            COSINE_THRESHOLD,

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
                "The faces match."
                if verified
                else
                "The faces do not match."
            )
    }