function blockNonNumericInput() {
  const ageField = document.getElementById("age");
  const contactField = document.getElementById("contact-number");
  const familyBody = document.getElementById("family-body");

  const numericFields = [ageField, contactField].filter(Boolean);
  const blockedKeys = ["e", "E", "+", "-", "."];

  const isControlKey = function (event) {
    return (
      event.ctrlKey ||
      event.metaKey ||
      ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Home", "End", "Tab"].includes(event.key)
    );
  };

  const sanitizeDigitsOnly = function (field) {
    const cleanedValue = (field.value || "").replace(/\D+/g, "");
    if (field.value !== cleanedValue) {
      field.value = cleanedValue;
    }
  };

  const applyNumericAttributes = function (field) {
    field.setAttribute("inputmode", "numeric");
    field.setAttribute("pattern", "[0-9]*");
  };

  numericFields.forEach(function (field) {
    applyNumericAttributes(field);

    field.addEventListener("keydown", function (event) {
      if (isControlKey(event)) {
        return;
      }

      if (blockedKeys.includes(event.key) || !/^\d$/.test(event.key)) {
        event.preventDefault();
      }
    });

    field.addEventListener("input", function () {
      sanitizeDigitsOnly(field);
    });

    field.addEventListener("paste", function (event) {
      event.preventDefault();
      const pastedText = (event.clipboardData || window.clipboardData).getData("text");
      const digitsOnly = (pastedText || "").replace(/\D+/g, "");

      const selectionStart = field.selectionStart ?? field.value.length;
      const selectionEnd = field.selectionEnd ?? field.value.length;
      const before = field.value.slice(0, selectionStart);
      const after = field.value.slice(selectionEnd);
      field.value = before + digitsOnly + after;
      sanitizeDigitsOnly(field);
    });
  });

  if (familyBody) {
    familyBody.querySelectorAll('input[aria-label="Family age"]').forEach(function (field) {
      applyNumericAttributes(field);
      sanitizeDigitsOnly(field);
    });

    familyBody.addEventListener("keydown", function (event) {
      const field = event.target.closest('input[aria-label="Family age"]');
      if (!field) {
        return;
      }

      if (isControlKey(event)) {
        return;
      }

      if (blockedKeys.includes(event.key) || !/^\d$/.test(event.key)) {
        event.preventDefault();
      }
    });

    familyBody.addEventListener("input", function (event) {
      const field = event.target.closest('input[aria-label="Family age"]');
      if (!field) {
        return;
      }

      applyNumericAttributes(field);
      sanitizeDigitsOnly(field);
    });

    familyBody.addEventListener("paste", function (event) {
      const field = event.target.closest('input[aria-label="Family age"]');
      if (!field) {
        return;
      }

      event.preventDefault();
      const pastedText = (event.clipboardData || window.clipboardData).getData("text");
      const digitsOnly = (pastedText || "").replace(/\D+/g, "");

      const selectionStart = field.selectionStart ?? field.value.length;
      const selectionEnd = field.selectionEnd ?? field.value.length;
      const before = field.value.slice(0, selectionStart);
      const after = field.value.slice(selectionEnd);
      field.value = before + digitsOnly + after;
      sanitizeDigitsOnly(field);
    });
  }
}

function createFamilyRow() {
  const row = document.createElement("tr");

  row.innerHTML = `
    <td><input type="text" aria-label="Family member name" /></td>
    <td><input type="text" aria-label="Family relationship" /></td>
    <td><input type="number" min="0" aria-label="Family age" /></td>
    <td>
      <select aria-label="Family civil status">
        <option value="" selected disabled>Select status</option>
        <option>Single</option>
        <option>Separated</option>
        <option>Widower</option>
        <option>Married</option>
      </select>
    </td>
    <td><input type="text" aria-label="Family occupation or income" /></td>
    <td class="family-action-cell">
      <button type="button" class="family-delete-btn" aria-label="Delete family row">X</button>
    </td>
  `;

  return row;
}

function wireFamilyRowButton() {
  const addRowButton = document.getElementById("add-family-row");
  const familyBody = document.getElementById("family-body");

  if (!addRowButton || !familyBody) {
    return;
  }

  addRowButton.addEventListener("click", function () {
    familyBody.appendChild(createFamilyRow());
  });

  familyBody.addEventListener("click", function (event) {
    const deleteButton = event.target.closest(".family-delete-btn");
    if (!deleteButton) {
      return;
    }

    const tableRow = deleteButton.closest("tr");
    if (!tableRow) {
      return;
    }

    if (familyBody.rows.length <= 1) {
      return;
    }

    tableRow.remove();
  });
}

function setupSpecifyForCheckboxes() {
  const optionLabels = document.querySelectorAll(".check-option");

  optionLabels.forEach(function (label) {
    const optionText = label.textContent || "";
    if (!/specify/i.test(optionText)) {
      return;
    }

    const checkbox = label.querySelector('input[type="checkbox"]');
    if (!checkbox) {
      return;
    }

    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.className = "specify-input";
    textInput.placeholder = "Please specify";
    textInput.setAttribute("aria-label", "Specify details");
    textInput.hidden = true;

    label.insertAdjacentElement("afterend", textInput);

    checkbox.addEventListener("change", function () {
      textInput.hidden = !checkbox.checked;
      if (!checkbox.checked) {
        textInput.value = "";
      }
    });
  });
}

function setupSpecifyForSelects() {
  const selects = document.querySelectorAll("select");

  selects.forEach(function (selectElement) {
    const hasSpecifyOption = Array.from(selectElement.options).some(function (opt) {
      return /specify/i.test(opt.textContent || "");
    });

    if (!hasSpecifyOption) {
      return;
    }

    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.className = "specify-input";
    textInput.placeholder = "Please specify";
    textInput.setAttribute("aria-label", "Specify details");
    textInput.hidden = true;

    selectElement.insertAdjacentElement("afterend", textInput);

    selectElement.addEventListener("change", function () {
      const selected = selectElement.options[selectElement.selectedIndex];
      const shouldShow = selected && /specify/i.test(selected.textContent || "");
      textInput.hidden = !shouldShow;
      if (!shouldShow) {
        textInput.value = "";
      }
    });
  });
}

function setupUploadButtons() {
  const uploadInputs = document.querySelectorAll('.upload-input:not(#upload-verification)');

  uploadInputs.forEach(function (inputElement) {
    const uploadBox = inputElement.nextElementSibling;
    if (!uploadBox || !uploadBox.classList.contains("upload-box")) {
      return;
    }

    const fileNameLabel = uploadBox.querySelector(".upload-file-name");

    inputElement.addEventListener("change", function () {
      if (!fileNameLabel) {
        return;
      }

      if (inputElement.files && inputElement.files.length > 0) {
        fileNameLabel.textContent = inputElement.files[0].name;
      } else {
        fileNameLabel.textContent = "No file selected";
      }
    });

    uploadBox.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        inputElement.click();
      }
    });
  });
}

function setupFaceCamera() {
  const openButton = document.getElementById("open-face-camera");
  const closeButton = document.getElementById("close-face-camera");
  const previewWrap = document.getElementById("face-camera-preview");
  const videoElement = document.getElementById("face-camera-video");
  const statusLabel = document.getElementById("face-camera-status");
  const fallbackInput = document.getElementById("upload-verification");

  if (!openButton || !closeButton || !previewWrap || !videoElement) {
    return;
  }

  let faceStream = null;

  const setStatus = function (message) {
    if (statusLabel) {
      statusLabel.textContent = message;
    }
  };

  const stopCamera = function () {
    if (faceStream) {
      faceStream.getTracks().forEach(function (track) {
        track.stop();
      });
      faceStream = null;
    }

    videoElement.srcObject = null;
    previewWrap.hidden = true;
    previewWrap.setAttribute("aria-hidden", "true");
    openButton.setAttribute("aria-expanded", "false");
  };

  openButton.addEventListener("click", async function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("Camera access is not supported in this browser. Opening file capture instead.");
      if (fallbackInput) {
        fallbackInput.click();
      }
      return;
    }

    if (faceStream) {
      setStatus("Camera is already open.");
      return;
    }

    try {
      faceStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user"
        },
        audio: false
      });

      videoElement.srcObject = faceStream;
      previewWrap.hidden = false;
      previewWrap.setAttribute("aria-hidden", "false");
      openButton.setAttribute("aria-expanded", "true");
      closeButton.focus();
    } catch (error) {
      setStatus("Unable to access camera. Please allow permission, then try again.");
      if (fallbackInput) {
        fallbackInput.click();
      }
    }
  });

  closeButton.addEventListener("click", function () {
    stopCamera();
  });

  window.addEventListener("beforeunload", function () {
    stopCamera();
  });

  previewWrap.addEventListener("click", function (event) {
    if (event.target === previewWrap) {
      stopCamera();
    }
  });

  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !previewWrap.hidden) {
      stopCamera();
    }
  });
}

function setupApplicationDate() {
  const dateField = document.getElementById("date-application");

  if (!dateField || dateField.value) {
    return;
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  dateField.value = `${year}-${month}-${day}`;
}

function showConfirmationModal(title, message, onConfirm) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.setAttribute("role", "presentation");

  const modal = document.createElement("div");
  modal.className = "custom-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "modal-title");

  const content = document.createElement("div");
  content.className = "modal-content";

  const titleEl = document.createElement("h2");
  titleEl.id = "modal-title";
  titleEl.className = "modal-title";
  titleEl.textContent = title;

  const messageEl = document.createElement("p");
  messageEl.className = "modal-message";
  messageEl.textContent = message;

  const buttonContainer = document.createElement("div");
  buttonContainer.className = "modal-buttons";

  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.className = "modal-btn modal-btn-danger";
  confirmBtn.textContent = "Yes, Cancel";
  confirmBtn.addEventListener("click", function () {
    document.body.removeChild(backdrop);
    if (typeof onConfirm === "function") {
      onConfirm();
    }
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "modal-btn modal-btn-secondary";
  cancelBtn.textContent = "No, Keep Filling";
  cancelBtn.addEventListener("click", function () {
    document.body.removeChild(backdrop);
  });

  backdrop.addEventListener("click", function (event) {
    if (event.target === backdrop) {
      document.body.removeChild(backdrop);
    }
  });

  buttonContainer.appendChild(confirmBtn);
  buttonContainer.appendChild(cancelBtn);

  content.appendChild(titleEl);
  content.appendChild(messageEl);
  content.appendChild(buttonContainer);

  modal.appendChild(content);
  backdrop.appendChild(modal);

  document.body.appendChild(backdrop);

  confirmBtn.focus();
}

function setupFormCancelButton() {
  const cancelButton = document.getElementById("cancel-application");

  if (!cancelButton) {
    return;
  }

  cancelButton.addEventListener("click", function () {
    showConfirmationModal(
      "Cancel Application?",
      "Are you sure you want to cancel this application? Your data will not be saved.",
      function () {
        window.location.href = "index.html";
      }
    );
  });
}

function setupHomepageNavigation() {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  const closeMenuBtn = document.getElementById("closeMenuBtn");
  const menuOverlay = document.getElementById("menuOverlay");

  if (!hamburgerBtn || !mobileMenu || !closeMenuBtn || !menuOverlay) {
    return;
  }

  function openMenu() {
    mobileMenu.classList.add("open");
    document.body.classList.add("menu-open");
    menuOverlay.classList.add("active");
  }

  function closeMenu() {
    mobileMenu.classList.remove("open");
    document.body.classList.remove("menu-open");
    menuOverlay.classList.remove("active");
  }

  hamburgerBtn.addEventListener("click", openMenu);
  closeMenuBtn.addEventListener("click", closeMenu);
  menuOverlay.addEventListener("click", closeMenu);

  document.querySelectorAll(".mobile-nav-link").forEach(function (link) {
    link.addEventListener("click", function (event) {
      const targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") {
        return;
      }

      event.preventDefault();
      closeMenu();

      setTimeout(function () {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: "smooth" });
        }
      }, 200);
    });
  });

  document.querySelectorAll(".nav-link").forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();

      const targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") {
        return;
      }

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" });
      }

      document.querySelectorAll(".nav-link").forEach(function (navLink) {
        navLink.classList.remove("nav-link-active");
      });
      link.classList.add("nav-link-active");
    });
  });

  document.querySelectorAll('footer a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();

      const targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") {
        return;
      }

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  const sections = ["home", "about", "contact"];
  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }

        const id = entry.target.getAttribute("id");
        document.querySelectorAll(".nav-link").forEach(function (link) {
          link.classList.remove("nav-link-active");
          if (link.getAttribute("href") === `#${id}`) {
            link.classList.add("nav-link-active");
          }
        });
      });
    },
    { threshold: 0.3 }
  );

  sections.forEach(function (sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      observer.observe(section);
    }
  });

  const homeLink = document.querySelector('.nav-link[href="#home"]');
  if (homeLink) {
    homeLink.classList.add("nav-link-active");
  }
}

const verificationRecords = {
  "OSCA20260001": {
    applicant: "Test Applicant",
    status: "under review",
    statusLabel: "Under Review",
    note: "Your application is currently being reviewed by the OSCA team."
  },
  "OSCA-2026-1001": {
    applicant: "Maria Santos",
    status: "pending",
    statusLabel: "Pending",
    note: "Your application has been received and is waiting for the first review step."
  },
  "OSCA-2026-1002": {
    applicant: "Juan Dela Cruz",
    status: "under review",
    statusLabel: "Under Review",
    note: "Your documents are currently being checked for completeness and validity."
  },
  "OSCA-2026-1003": {
    applicant: "Rosa Mendoza",
    status: "in process",
    statusLabel: "In Process",
    note: "Your application is moving through the processing stage with the assigned staff."
  },
  "OSCA-2026-1004": {
    applicant: "Pedro Reyes",
    status: "ready for release",
    statusLabel: "Ready for Release",
    note: "Your ID is ready to be claimed at the OSCA office. Bring a valid ID when you visit."
  }
};

function normalizeApplicationId(value) {
  return (value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function setupVerificationPage() {
  const entryStep = document.getElementById("verify-step-entry");
  const statusStep = document.getElementById("verify-step-status");
  const entryForm = document.getElementById("verify-id-form");
  const inputField = document.getElementById("application-id-input");
  const errorLabel = document.getElementById("application-id-error");
  const statusItems = document.querySelectorAll(".verify-status-item[data-status]");
  const verifiedId = document.getElementById("verified-application-id");
  const verifiedApplicant = document.getElementById("verified-applicant-name");
  const verificationNote = document.getElementById("verification-note");
  const closeButtons = [
    document.getElementById("close-verification-page-entry"),
    document.getElementById("close-verification-page-entry-secondary"),
    document.getElementById("close-verification-page-status"),
    document.getElementById("close-verification-page-status-secondary")
  ].filter(Boolean);

  if (!entryStep || !statusStep || !entryForm || !inputField || !verifiedId || !verifiedApplicant || !verificationNote) {
    return;
  }

  const showEntryStep = function () {
    entryStep.hidden = false;
    statusStep.hidden = true;
    if (errorLabel) {
      errorLabel.textContent = "";
    }
    entryForm.reset();
    window.setTimeout(function () {
      inputField.focus();
    }, 0);
  };

  const showStatusStep = function (applicationId, record) {
    verifiedId.textContent = applicationId;
    verifiedApplicant.textContent = record.applicant;
    verificationNote.textContent = record.note;

    statusItems.forEach(function (item) {
      const isCurrent = item.getAttribute("data-status") === record.status;
      item.classList.toggle("active", isCurrent);
      if (isCurrent) {
        item.setAttribute("aria-current", "step");
      } else {
        item.removeAttribute("aria-current");
      }
    });

    entryStep.hidden = true;
    statusStep.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeVerificationPage = function () {
    window.location.href = "index.html";
  };

  closeButtons.forEach(function (button) {
    button.addEventListener("click", closeVerificationPage);
  });

  entryForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const applicationId = normalizeApplicationId(inputField.value);
    const record = verificationRecords[applicationId];

    if (!record) {
      if (errorLabel) {
        errorLabel.textContent = "Invalid ID or ID not existing.";
      }
      inputField.focus();
      return;
    }

    showStatusStep(applicationId, record);
  });

  showEntryStep();
}

function setupRequestIdModal() {
  const requestIdButton = document.getElementById("request-id-button");
  const requestIdModal = document.getElementById("verify-request-id-modal");
  const statusStep = document.getElementById("verify-step-status");
  const requestIdForm = document.getElementById("request-id-form");
  const reasonSelect = document.getElementById("request-reason-select");
  const otherReasonWrapper = document.getElementById("other-reason-wrapper");
  const otherReasonInput = document.getElementById("other-reason-input");
  const requestReasonError = document.getElementById("request-reason-error");
  const closeRequestIdModalButton = document.getElementById("close-request-id-modal");
  const cancelRequestIdButton = document.getElementById("cancel-request-id");

  if (!requestIdButton || !requestIdModal || !statusStep || !requestIdForm || !reasonSelect) {
    return;
  }

  const showRequestIdModal = function () {
    statusStep.hidden = true;
    requestIdModal.hidden = false;
    reasonSelect.value = "";
    if (otherReasonInput) {
      otherReasonInput.value = "";
    }
    if (requestReasonError) {
      requestReasonError.textContent = "";
    }
    window.setTimeout(function () {
      reasonSelect.focus();
    }, 0);
  };

  const closeRequestIdModal = function () {
    requestIdModal.hidden = true;
    statusStep.hidden = false;
    reasonSelect.value = "";
    if (otherReasonInput) {
      otherReasonInput.value = "";
    }
    if (otherReasonWrapper) {
      otherReasonWrapper.style.display = "none";
    }
    if (requestReasonError) {
      requestReasonError.textContent = "";
    }
  };

  reasonSelect.addEventListener("change", function () {
    if (otherReasonWrapper && otherReasonInput) {
      if (reasonSelect.value === "other") {
        otherReasonWrapper.style.display = "block";
        window.setTimeout(function () {
          otherReasonInput.focus();
        }, 0);
      } else {
        otherReasonWrapper.style.display = "none";
        otherReasonInput.value = "";
      }
    }
  });

  requestIdButton.addEventListener("click", showRequestIdModal);

  closeRequestIdModalButton.addEventListener("click", closeRequestIdModal);
  cancelRequestIdButton.addEventListener("click", closeRequestIdModal);

  requestIdForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const selectedReason = reasonSelect.value;
    let requestMessage = "";

    if (!selectedReason) {
      if (requestReasonError) {
        requestReasonError.textContent = "Please select a reason.";
      }
      return;
    }

    if (selectedReason === "other") {
      const otherReason = otherReasonInput ? otherReasonInput.value.trim() : "";
      if (!otherReason) {
        if (requestReasonError) {
          requestReasonError.textContent = "Please specify your reason.";
        }
        return;
      }
      requestMessage = "Other: " + otherReason;
    } else if (selectedReason === "lost") {
      requestMessage = "Lost";
    } else if (selectedReason === "damage") {
      requestMessage = "Damage";
    }

    showSuccessNotification("Reason: " + requestMessage + "\n\nWe will process your request soon.");
    closeRequestIdModal();
  });
}

function showSuccessNotification(message) {
  const overlay = document.getElementById("success-notification-overlay");
  const notification = document.getElementById("success-notification");
  const notificationMessage = document.getElementById("notification-message");
  const closeButton = document.getElementById("notification-close-button");

  if (!overlay || !notification || !notificationMessage || !closeButton) {
    return;
  }

  notificationMessage.textContent = message;
  overlay.hidden = false;
  notification.hidden = false;

  const closeNotification = function () {
    overlay.hidden = true;
    notification.hidden = true;
  };

  closeButton.addEventListener("click", closeNotification);
  overlay.addEventListener("click", closeNotification);

  window.setTimeout(function () {
    if (!notification.hidden) {
      closeNotification();
    }
  }, 5000);
}

document.addEventListener("DOMContentLoaded", function () {
  blockNonNumericInput();
  wireFamilyRowButton();
  setupSpecifyForCheckboxes();
  setupSpecifyForSelects();
  setupUploadButtons();
  setupFaceCamera();
  setupApplicationDate();
  setupFormCancelButton();
  setupHomepageNavigation();
  setupVerificationPage();
  setupRequestIdModal();
});
