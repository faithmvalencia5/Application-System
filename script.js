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
    familyBody.querySelectorAll('input[aria-label="Family age"], input[aria-label="Family income"]').forEach(function (field) {
      applyNumericAttributes(field);
      sanitizeDigitsOnly(field);
    });

    familyBody.addEventListener("keydown", function (event) {
      const field = event.target.closest('input[aria-label="Family age"], input[aria-label="Family income"]');
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
      const field = event.target.closest('input[aria-label="Family age"], input[aria-label="Family income"]');
      if (!field) {
        return;
      }

      applyNumericAttributes(field);
      sanitizeDigitsOnly(field);
    });

    familyBody.addEventListener("paste", function (event) {
      const field = event.target.closest('input[aria-label="Family age"], input[aria-label="Family income"]');
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
    <td data-label="Name"><input type="text" aria-label="Family member name" /></td>
    <td data-label="Relationship"><input type="text" aria-label="Family relationship" /></td>
    <td data-label="Age"><input type="number" min="0" aria-label="Family age" /></td>
    <td data-label="Civil status">
      <select aria-label="Family civil status">
        <option value="" selected disabled>Select status</option>
        <option>Single</option>
        <option>Separated</option>
        <option>Widower</option>
        <option>Married</option>
      </select>
    </td>
    <td data-label="Occupation"><input type="text" aria-label="Family occupation" /></td>
    <td data-label="Income"><input type="number" min="0" aria-label="Family income" /></td>
    <td class="family-action-cell" data-label="Action">
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
  // file preview modal elements
  const filePreviewModal = document.getElementById("file-preview-modal");
  const previewImage = document.getElementById("file-preview-image");
  const previewIframe = document.getElementById("file-preview-iframe");
  const previewClose = document.getElementById("file-preview-close");

  let currentPreviewUrl = null;

  const closePreview = function () {
    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl);
      currentPreviewUrl = null;
    }
    if (filePreviewModal) {
      filePreviewModal.hidden = true;
      filePreviewModal.setAttribute("aria-hidden", "true");
    }
    if (previewImage) {
      previewImage.hidden = true;
      previewImage.src = "";
    }
    if (previewIframe) {
      previewIframe.hidden = true;
      previewIframe.src = "";
    }
    currentInputForReplace = null;
  };

  if (previewClose) {
    previewClose.addEventListener("click", closePreview);
  }

  uploadInputs.forEach(function (inputElement) {
    const uploadBox = inputElement.nextElementSibling;
    if (!uploadBox || !uploadBox.classList.contains("upload-box")) {
      return;
    }

    const fileNameLabel = uploadBox.querySelector(".upload-file-name");
    const actions = uploadBox.nextElementSibling && uploadBox.nextElementSibling.classList.contains('upload-actions') ? uploadBox.nextElementSibling : null;
    const viewBtn = actions ? actions.querySelector('.view-btn') : null;
    const changeBtn = actions ? actions.querySelector('.change-btn') : null;

    const updateButtonsState = function () {
      const hasFile = inputElement.files && inputElement.files.length > 0;
      if (fileNameLabel) {
        fileNameLabel.textContent = hasFile ? inputElement.files[0].name : 'No file selected';
        if (hasFile) {
          uploadBox.classList.add('has-file');
        } else {
          uploadBox.classList.remove('has-file');
        }
      }
      if (viewBtn) {
        viewBtn.hidden = !hasFile;
        viewBtn.disabled = !hasFile;
      }
      if (changeBtn) {
        changeBtn.hidden = !hasFile;
      }
    };

    // initial state
    updateButtonsState();

    inputElement.addEventListener("change", function () {
      updateButtonsState();
    });

    if (viewBtn) {
      viewBtn.addEventListener('click', function () {
        if (!inputElement.files || inputElement.files.length === 0) return;
        const file = inputElement.files[0];
        if (!file) return;

        // prepare preview
        if (currentPreviewUrl) {
          URL.revokeObjectURL(currentPreviewUrl);
          currentPreviewUrl = null;
        }
        currentPreviewUrl = URL.createObjectURL(file);

        if (file.type && file.type.startsWith('image/')) {
          if (previewIframe) previewIframe.hidden = true;
          if (previewImage) {
            previewImage.src = currentPreviewUrl;
            previewImage.hidden = false;
          }
        } else if (file.type === 'application/pdf') {
          if (previewImage) previewImage.hidden = true;
          if (previewIframe) {
            previewIframe.src = currentPreviewUrl;
            previewIframe.hidden = false;
          }
        } else {
          // fallback: show download link by opening in new tab
          window.open(currentPreviewUrl, '_blank');
          return;
        }

        if (filePreviewModal) {
          filePreviewModal.hidden = false;
          filePreviewModal.setAttribute('aria-hidden', 'false');
        }
      });
    }

    if (changeBtn) {
      changeBtn.addEventListener('click', function () {
        inputElement.click();
      });
    }

    uploadBox.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        inputElement.click();
      }
    });
  });
}

function protectApplicationForm() {
  const isFormPage =
    window.location.pathname.endsWith("form.html");

  if (!isFormPage) {
    return;
  }

  const params =
    new URLSearchParams(window.location.search);

  const mode = params.get("mode");

  const isEditMode =
    mode === "edit" ||
    mode === "request-edit" ||
    mode === "duplicate-update";

  // Existing applications may open the form directly
  // from the Track Status page.
  if (isEditMode) {
    return;
  }

  // New applications must pass through the disclaimer
  // and reCAPTCHA page first.
  const hasAccess =
    sessionStorage.getItem("applicationFormAccess") ===
    "verified";

  if (!hasAccess) {
    window.location.href =
      "register-disclaimer.html";
  }
}

function setupFormMode() {

  if (
    !window.location.pathname.endsWith(
      "form.html"
    )
  ) {
    return;
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  const mode =
    params.get("mode");

  const applicationId =
    params.get("id");

  const sessionId =
    params.get("session");

  const isNormalEdit =
    (mode === "edit" ||
      mode === "request-edit") &&
    Boolean(applicationId);

  const isDuplicateUpdate =
    mode === "duplicate-update" &&
    Boolean(sessionId);

  if (
    !isNormalEdit &&
    !isDuplicateUpdate
  ) {
    return;
  }

  const titleBar =
    document.querySelector(
      ".title-bar"
    );

  const submitButton =
    document.querySelector(
      ".btn.submit"
    );

  const cancelButton =
    document.getElementById(
      "cancel-application"
    );

  if (titleBar) {
    titleBar.textContent =
      "EDIT SENIOR CITIZEN ID APPLICATION";
  }

  if (cancelButton) {
    cancelButton.textContent =
      "Close";
  }

  if (
    mode === "edit" ||
    mode === "duplicate-update"
  ) {
    if (submitButton) {
      submitButton.textContent =
        "Save Changes";
    }

  } else if (
    mode === "request-edit"
  ) {
    if (submitButton) {
      submitButton.textContent =
        "OK";
    }
  }
}

async function loadApplicationForEditing() {
  const isFormPage =
    window.location.pathname.endsWith("form.html");

  if (!isFormPage) {
    return;
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  const mode =
    params.get("mode");

  const applicationId =
    params.get("id");

  const sessionId =
    params.get("session");

  const isNormalEdit =
    mode === "edit" ||
    mode === "request-edit";

  const isDuplicateUpdate =
    mode === "duplicate-update";

  if (
    isNormalEdit &&
    !applicationId
  ) {
    return;
  }

  if (
    isDuplicateUpdate &&
    !sessionId
  ) {
    return;
  }

  if (
    !isNormalEdit &&
    !isDuplicateUpdate
  ) {
    return;
  }

  const setValue = function (id, value) {
    const field = document.getElementById(id);

    if (!field) {
      return;
    }

    field.value = value ?? "";
  };

  const normalizeLabelText = function (value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  };

  const findCheckboxGroup = function (titleHint) {
    const normalizedTitle = normalizeLabelText(titleHint);

    return Array.from(
      document.querySelectorAll(".checkbox-group")
    ).find(function (group) {
      const groupTitle = normalizeLabelText(
        group.querySelector(".group-label")?.textContent
      );

      return groupTitle.includes(normalizedTitle);
    });
  };

  const setCheckboxOption = function (
    groupTitle,
    optionText,
    checked,
    specifyValue
  ) {
    const group = findCheckboxGroup(groupTitle);

    if (!group) {
      return;
    }

    const normalizedOption = normalizeLabelText(optionText);

    const label = Array.from(
      group.querySelectorAll(".check-option")
    ).find(function (item) {
      return normalizeLabelText(item.textContent).includes(
        normalizedOption
      );
    });

    if (!label) {
      return;
    }

    const checkbox = label.querySelector(
      'input[type="checkbox"]'
    );

    if (!checkbox) {
      return;
    }

    checkbox.checked = Boolean(checked);
    checkbox.dispatchEvent(new Event("change"));

    const specifyInput = label.nextElementSibling;

    if (
      specifyInput &&
      specifyInput.classList.contains("specify-input")
    ) {
      specifyInput.value = checked
        ? (specifyValue ?? "")
        : "";
    }
  };

  const getFileNameFromPath = function (filePath) {
    if (!filePath) {
      return "";
    }

    const segments = String(filePath).split("/");
    return segments[segments.length - 1] || "";
  };

  const showExistingFile = function (
    inputId,
    filePath,
    signedUrl
  ) {
    const input = document.getElementById(inputId);

    if (!input || !filePath) {
      return;
    }

    const uploadBox = input.nextElementSibling;

    if (
      !uploadBox ||
      !uploadBox.classList.contains("upload-box")
    ) {
      return;
    }

    const fileNameLabel =
      uploadBox.querySelector(".upload-file-name");

    const actions =
      uploadBox.nextElementSibling &&
      uploadBox.nextElementSibling.classList.contains(
        "upload-actions"
      )
        ? uploadBox.nextElementSibling
        : null;

    const viewButton =
      actions?.querySelector(".view-btn");

    const changeButton =
      actions?.querySelector(".change-btn");

    input.dataset.existingFilePath = filePath;
    input.dataset.existingFileUrl = signedUrl || "";

    uploadBox.classList.add("has-file");

    if (fileNameLabel) {
      fileNameLabel.textContent =
        getFileNameFromPath(filePath);
    }

    if (viewButton) {
      viewButton.hidden = !signedUrl;
      viewButton.disabled = !signedUrl;

      viewButton.addEventListener(
        "click",
        function (event) {
          if (
            input.files &&
            input.files.length > 0
          ) {
            return;
          }

          event.stopImmediatePropagation();

          if (signedUrl) {
            window.open(
              signedUrl,
              "_blank",
              "noopener,noreferrer"
            );
          }
        },
        true
      );
    }

    if (changeButton) {
      changeButton.hidden = false;
    }
  };

  const mergeDraftIntoExisting =
    function (existing, draft) {

      const merged = {
        ...(existing || {})
      };

      if (!draft) {
        return merged;
      }

      Object.entries(draft).forEach(
        function ([key, value]) {

          if (
            value === null ||
            value === undefined ||
            (
              typeof value === "string" &&
              value.trim() === ""
            )
          ) {
            return;
          }

          if (
            typeof value === "boolean" &&
            value === false
          ) {
            return;
          }

          merged[key] = value;
        }
      );

      return merged;
    };


  if (mode === "duplicate-update") {

    try {
      const draftFiles =
        await getRequestEditFiles(
          sessionId
        );

      const inputMap = {
        valid_id_front:
          "upload-valid-id-front",

        valid_id_back:
          "upload-valid-id-back",

        latest_photo:
          "upload-latest-photo",

        birth_certificate:
          "upload-birth-certificate",

        community_tax_certificate:
          "upload-cedula",

        signature:
          "upload-signature"
      };

      Object.entries(
        draftFiles
      ).forEach(function ([fileType, file]) {

        const inputId =
          inputMap[fileType];

        const input =
          document.getElementById(
            inputId
          );

        if (!input || !file) {
          return;
        }

        const transfer =
          new DataTransfer();

        transfer.items.add(file);

        input.files =
          transfer.files;

        input.dispatchEvent(
          new Event("change")
        );
      });

    } catch (error) {
      console.error(
        "Unable to restore duplicate update files:",
        error
      );
    }
  }

  try {

    let loadUrl = "";

    if (isDuplicateUpdate) {

      loadUrl =
        "https://osca-backend.onrender.com/api/applications/duplicate/verified/" +
        encodeURIComponent(sessionId);

    } else {

      loadUrl =
        "https://osca-backend.onrender.com/api/applications/" +
        encodeURIComponent(applicationId);
    }

    const response =
      await fetch(loadUrl);

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Unable to load the application."
      );
    }

    const data = result.data;

    /*
    * Normally use data currently stored in the database.
    */
    let application =
      data.application || {};

    let membership =
      data.membership || {};

    let familyComposition =
      data.familyComposition || [];

    let personalBackground =
      data.personalBackground || {};

    let problemsNeeds =
      data.problemsNeeds || {};

    const applicationFiles =
      data.applicationFiles || {};

    let confirmations =
      data.confirmations || {};

    if (mode === "duplicate-update") {

      const savedSessionId =
        sessionStorage.getItem(
          "duplicateUpdateDraftSession"
        );

      const savedDraftRaw =
        sessionStorage.getItem(
          "duplicateUpdateDraft"
        );

      if (
        savedSessionId === sessionId &&
        savedDraftRaw
      ) {
        try {
          const savedDraft =
            JSON.parse(savedDraftRaw);

          application =
            mergeDraftIntoExisting(
              application,
              savedDraft.applicationsData
            );

          membership =
            mergeDraftIntoExisting(
              membership,
              savedDraft.membershipsData
            );

          personalBackground =
            mergeDraftIntoExisting(
              personalBackground,
              savedDraft.personalBackgroundData
            );

          problemsNeeds =
            mergeDraftIntoExisting(
              problemsNeeds,
              savedDraft.problemsNeedsData
            );

          confirmations =
            mergeDraftIntoExisting(
              confirmations,
              savedDraft.confirmationsData
            );

          if (
            Array.isArray(
              savedDraft.familyRowsData
            ) &&
            savedDraft.familyRowsData.length > 0
          ) {
            familyComposition =
              savedDraft.familyRowsData;
          }

        } catch (error) {
          console.error(
            "Unable to restore duplicate update draft:",
            error
          );
        }
      }
    }

    if (mode === "request-edit") {

      const temporaryApplicationId =
        sessionStorage.getItem(
          "pendingRequestApplicationId"
        );

      const temporaryChangesRaw =
        sessionStorage.getItem(
          "pendingRequestApplicationChanges"
        );

      if (
        temporaryApplicationId === applicationId &&
        temporaryChangesRaw
      ) {
        try {
          const temporaryChanges =
            JSON.parse(temporaryChangesRaw);

          application =
            temporaryChanges.applicationsData ||
            application;

          familyComposition =
            temporaryChanges.familyRowsData ||
            familyComposition;

          membership =
            temporaryChanges.membershipsData ||
            membership;

          personalBackground =
            temporaryChanges.personalBackgroundData ||
            personalBackground;

          problemsNeeds =
            temporaryChanges.problemsNeedsData ||
            problemsNeeds;

          confirmations =
            temporaryChanges.confirmationsData ||
            confirmations;

        } catch (error) {
          console.error(
            "Unable to restore temporary request edits:",
            error
          );
        }
      }
    }

    setValue("surname", application.surname);
    setValue("firstname", application.first_name);
    setValue("middlename", application.middle_name);
    setValue("dob", application.date_of_birth);
    setValue("age", application.age);
    setValue("sex", application.sex);
    setValue("birthplace", application.place_of_birth);
    setValue("civil-status", application.civil_status);
    setValue("address", application.house_street);
    setValue("barangay", application.barangay_district);

    const familyBody = document.getElementById("family-body");

    if (familyBody) {
      familyBody.innerHTML = "";

      const familyRows =
        familyComposition.length > 0
          ? familyComposition
          : [{}];

      familyRows.forEach(function (member) {
        const row = createFamilyRow();

        const nameField =
          row.querySelector(
            'input[aria-label="Family member name"]'
          );

        const relationshipField =
          row.querySelector(
            'input[aria-label="Family relationship"]'
          );

        const ageField =
          row.querySelector(
            'input[aria-label="Family age"]'
          );

        const civilStatusField =
          row.querySelector(
            'select[aria-label="Family civil status"]'
          );

        const occupationField =
          row.querySelector(
            'input[aria-label="Family occupation"]'
          );

        const incomeField =
          row.querySelector(
            'input[aria-label="Family income"]'
          );

        if (nameField) {
          nameField.value = member.name ?? "";
        }

        if (relationshipField) {
          relationshipField.value =
            member.relationship ?? "";
        }

        if (ageField) {
          ageField.value = member.age ?? "";
        }

        if (civilStatusField) {
          civilStatusField.value =
            member.civil_status ?? "";
        }

        if (occupationField) {
          occupationField.value =
            member.occupation ?? "";
        }

        if (incomeField) {
          incomeField.value = member.income ?? "";
        }

        familyBody.appendChild(row);
      });

      // SOURCE OF INCOME AND ASSISTANCE
      setCheckboxOption(
        "source of income and assistance",
        "own earnings",
        personalBackground.income_own_earnings
      );

      setCheckboxOption(
        "source of income and assistance",
        "own pension",
        personalBackground.income_own_pension
      );

      setCheckboxOption(
        "source of income and assistance",
        "stocks dividends",
        personalBackground.income_stocks_dividends
      );

      setCheckboxOption(
        "source of income and assistance",
        "dependent of children relatives",
        personalBackground.income_dependent_children
      );

      setCheckboxOption(
        "source of income and assistance",
        "spouse salary",
        personalBackground.income_spouse_salary
      );

      setCheckboxOption(
        "source of income and assistance",
        "insurance",
        personalBackground.income_insurance
      );

      setCheckboxOption(
        "source of income and assistance",
        "rentals sharecrops",
        personalBackground.income_rentals_sharecrops
      );

      setCheckboxOption(
        "source of income and assistance",
        "savings",
        personalBackground.income_savings
      );

      setCheckboxOption(
        "source of income and assistance",
        "livestock crop",
        personalBackground.income_livestock_crop
      );

      setCheckboxOption(
        "source of income and assistance",
        "others specify",
        personalBackground.income_other,
        personalBackground.income_other_specify
      );


      // ASSETS AND PROPERTIES
      setCheckboxOption(
        "assets and properties",
        "house",
        personalBackground.asset_house
      );

      setCheckboxOption(
        "assets and properties",
        "lot",
        personalBackground.asset_lot
      );

      setCheckboxOption(
        "assets and properties",
        "farmland",
        personalBackground.asset_farmland
      );

      setCheckboxOption(
        "assets and properties",
        "fishponds resorts",
        personalBackground.asset_fishponds_resorts
      );

      setCheckboxOption(
        "assets and properties",
        "commercial building",
        personalBackground.asset_commercial_building
      );

      setCheckboxOption(
        "assets and properties",
        "others specify",
        personalBackground.asset_other,
        personalBackground.asset_other_specify
      );


      // MONTHLY INCOME
      setValue(
        "monthly-income",
        personalBackground.monthly_income
      );


      // LIVING OR RESIDING WITH
      setCheckboxOption(
        "living residing with",
        "alone",
        personalBackground.living_alone
      );

      setCheckboxOption(
        "living residing with",
        "spouse",
        personalBackground.living_spouse
      );

      setCheckboxOption(
        "living residing with",
        "care institution",
        personalBackground.living_care_institution
      );

      setCheckboxOption(
        "living residing with",
        "children",
        personalBackground.living_children
      );

      setCheckboxOption(
        "living residing with",
        "friends",
        personalBackground.living_friends
      );

      setCheckboxOption(
        "living residing with",
        "common law spouse",
        personalBackground.living_common_law_spouse
      );

      setCheckboxOption(
        "living residing with",
        "grandchildren",
        personalBackground.living_grandchildren
      );

      setCheckboxOption(
        "living residing with",
        "households",
        personalBackground.living_households
      );

      setCheckboxOption(
        "living residing with",
        "relatives",
        personalBackground.living_relatives
      );

      setCheckboxOption(
        "living residing with",
        "in laws",
        personalBackground.living_in_laws
      );

      setCheckboxOption(
        "living residing with",
        "others specify",
        personalBackground.living_other,
        personalBackground.living_other_specify
      );


      // AREAS OF SPECIALIZATION OR SKILLS
      setCheckboxOption(
        "areas specialization skills",
        "medical",
        personalBackground.skill_medical
      );

      setCheckboxOption(
        "areas specialization skills",
        "dental",
        personalBackground.skill_dental
      );

      setCheckboxOption(
        "areas specialization skills",
        "farming",
        personalBackground.skill_farming
      );

      setCheckboxOption(
        "areas specialization skills",
        "arts",
        personalBackground.skill_arts
      );

      setCheckboxOption(
        "areas specialization skills",
        "teaching",
        personalBackground.skill_teaching
      );

      setCheckboxOption(
        "areas specialization skills",
        "counseling",
        personalBackground.skill_counseling
      );

      setCheckboxOption(
        "areas specialization skills",
        "fishing",
        personalBackground.skill_fishing
      );

      setCheckboxOption(
        "areas specialization skills",
        "engineering",
        personalBackground.skill_engineering
      );

      setCheckboxOption(
        "areas specialization skills",
        "legal services",
        personalBackground.skill_legal_services
      );

      setCheckboxOption(
        "areas specialization skills",
        "evangelization",
        personalBackground.skill_evangelization
      );

      setCheckboxOption(
        "areas specialization skills",
        "cooking",
        personalBackground.skill_cooking
      );

      setCheckboxOption(
        "areas specialization skills",
        "vocational",
        personalBackground.skill_vocational
      );

      setCheckboxOption(
        "areas specialization skills",
        "others specify",
        personalBackground.skill_other,
        personalBackground.skill_other_specify
      );


      // INVOLVEMENT
      setCheckboxOption(
        "involvement in common encountered",
        "medical",
        personalBackground.involvement_medical
      );

      setCheckboxOption(
        "involvement in common encountered",
        "dental",
        personalBackground.involvement_dental
      );

      setCheckboxOption(
        "involvement in common encountered",
        "religious",
        personalBackground.involvement_religious
      );

      setCheckboxOption(
        "involvement in common encountered",
        "sportsmanship",
        personalBackground.involvement_sportsmanship
      );

      setCheckboxOption(
        "involvement in common encountered",
        "resource volunteer",
        personalBackground.involvement_resource_volunteer
      );

      setCheckboxOption(
        "involvement in common encountered",
        "friendly visits",
        personalBackground.involvement_friendly_visits
      );

      setCheckboxOption(
        "involvement in common encountered",
        "counseling referral",
        personalBackground.involvement_counseling_referral
      );

      setCheckboxOption(
        "involvement in common encountered",
        "legal spouse",
        personalBackground.involvement_legal_services
      );

      setCheckboxOption(
        "involvement in common encountered",
        "community organization leader",
        personalBackground.involvement_community_leader
      );

      setCheckboxOption(
        "involvement in common encountered",
        "others specify",
        personalBackground.involvement_other,
        personalBackground.involvement_other_specify
      );

      // ECONOMIC PROBLEMS
      setCheckboxOption(
        "economic",
        "lack of income resource",
        problemsNeeds.economic_lack_income
      );

      setCheckboxOption(
        "economic",
        "skills capability training",
        problemsNeeds.economic_skills_training,
        problemsNeeds.economic_skills_training_specify
      );

      setCheckboxOption(
        "economic",
        "livelihood opportunities",
        problemsNeeds.economic_livelihood,
        problemsNeeds.economic_livelihood_specify
      );

      setCheckboxOption(
        "economic",
        "others specify",
        problemsNeeds.economic_other,
        problemsNeeds.economic_other_specify
      );


      // SOCIAL OR EMOTIONAL
      setCheckboxOption(
        "social emotional",
        "feeling of neglect rejection",
        problemsNeeds.social_neglect_rejection
      );

      setCheckboxOption(
        "social emotional",
        "feeling of helplessness worthlessness",
        problemsNeeds.social_helplessness
      );

      setCheckboxOption(
        "social emotional",
        "feeling of loneliness isolation",
        problemsNeeds.social_loneliness
      );

      setCheckboxOption(
        "social emotional",
        "inadequate leisure recreational activities",
        problemsNeeds.social_inadequate_recreation
      );

      setCheckboxOption(
        "social emotional",
        "senior citizens friendly environment",
        problemsNeeds.social_senior_friendly_environment
      );

      setCheckboxOption(
        "social emotional",
        "others specify",
        problemsNeeds.social_other,
        problemsNeeds.social_other_specify
      );


      // HEALTH
      setCheckboxOption(
        "health",
        "high cost of medicines",
        problemsNeeds.health_high_cost_medicine
      );

      setCheckboxOption(
        "health",
        "lack of medical professionals",
        problemsNeeds.health_lack_medical_professionals
      );

      setCheckboxOption(
        "health",
        "lack no access of sanitation",
        problemsNeeds.health_no_sanitation
      );

      setCheckboxOption(
        "health",
        "lack no health insurance",
        problemsNeeds.health_no_insurance
      );

      setCheckboxOption(
        "health",
        "lack of hospitals medical facilities",
        problemsNeeds.health_lack_hospital
      );

      setCheckboxOption(
        "health",
        "health problems ailments specify",
        problemsNeeds.health_problem,
        problemsNeeds.health_problem_specify
      );


      // HOUSING
      setCheckboxOption(
        "housing",
        "overcrowding in family home",
        problemsNeeds.housing_overcrowding
      );

      setCheckboxOption(
        "housing",
        "no permanent housing",
        problemsNeeds.housing_no_permanent_home
      );

      setCheckboxOption(
        "housing",
        "longing for independent living quiet atmosphere",
        problemsNeeds.housing_independent_living
      );

      setCheckboxOption(
        "housing",
        "lost privacy",
        problemsNeeds.housing_lost_privacy
      );

      setCheckboxOption(
        "housing",
        "living in squatter s area",
        problemsNeeds.housing_squatter_area
      );

      setCheckboxOption(
        "housing",
        "high cost of rental",
        problemsNeeds.housing_high_rental
      );

      setCheckboxOption(
        "housing",
        "others specify",
        problemsNeeds.housing_other,
        problemsNeeds.housing_other_specify
      );

      // COMMUNITY SERVICE
      setCheckboxOption(
        "community service",
        "desire to participate",
        problemsNeeds.community_desire_participate
      );

      setCheckboxOption(
        "community service",
        "skills resource to share",
        problemsNeeds.community_skills_to_share
      );

      setCheckboxOption(
        "community service",
        "others specify",
        problemsNeeds.community_other,
        problemsNeeds.community_other_specify
      );


      // OTHER SPECIFIC NEEDS
      setValue(
        "specific-needs",
        problemsNeeds.other_specific_needs
      );

      setValue(
        "date-application",
        applicationFiles.application_date
      );

      const setChecked = function (id, value) {
        const checkbox = document.getElementById(id);

        if (checkbox) {
          checkbox.checked = Boolean(value);
        }
      };

      setChecked(
        "consent-1",
        confirmations.info_true
      );

      setChecked(
        "consent-2",
        confirmations.full_knowledge
      );

      setChecked(
        "consent-3",
        confirmations.personal_consent
      );

      setChecked(
        "consent-4",
        confirmations.understand_storage
      );

      setChecked(
        "consent-5",
        confirmations.agree_all
      );

      setChecked(
        "consent-assisted",
        confirmations.assisted_certified
      );

      setValue(
        "assisted-by",
        confirmations.assisted_by
      );

      setValue(
        "relation-registrant",
        confirmations.relation
      );

      [
        "consent-1",
        "consent-2",
        "consent-3",
        "consent-4",
        "consent-5"
      ].forEach(function (id) {
        const checkbox =
          document.getElementById(id);

        if (checkbox) {
          checkbox.dispatchEvent(
            new Event("change")
          );
        }
      });
    }

    let education = application.educational_attainment;

    if (education === "Not Attend Any School") {
      education = "Not Attended Any School";
    }

    setValue("education", education);
    setValue("religion", application.religion);
    const religionField =
      document.getElementById("religion");

    if (religionField) {
      religionField.dispatchEvent(
        new Event("change")
      );

      const religionSpecifyInput =
        religionField.nextElementSibling;

      if (
        religionSpecifyInput &&
        religionSpecifyInput.classList.contains(
          "specify-input"
        )
      ) {
        religionSpecifyInput.value =
          application.religion_specify || "";
      }
    }
    setValue("occupation", application.occupation);
    setValue("id-osca", application.osca_id_number);
    setValue("id-sss", application.sss_id_number);
    setValue("id-philhealth", application.philhealth_id_number);
    setValue("id-gsis", application.gsis_id_number);
    setValue("id-tin", application.tin_id_number);
    setValue("contact-number", application.contact_number);

    setValue("assoc-name", membership.association_name);
    setValue("assoc-address", membership.association_address);
    setValue("assoc-date", membership.association_date);
    setValue("assoc-position", membership.position);

    showExistingFile(
      "upload-valid-id-front",
      applicationFiles.valid_id_url,
      applicationFiles.valid_id_signed_url
    );

    const existingValidIdInput =
      document.getElementById(
        "upload-valid-id-front"
      );

    if (existingValidIdInput) {
      existingValidIdInput.dataset.existingFileUrl =
        applicationFiles.valid_id_signed_url ||
        "";
    }

    showExistingFile(
      "upload-valid-id-back",
      applicationFiles.valid_id_back_url,
      applicationFiles.valid_id_back_signed_url
    );

    showExistingFile(
      "upload-latest-photo",
      applicationFiles.latest_photo_url,
      applicationFiles.latest_photo_signed_url
    );

    showExistingFile(
      "upload-birth-certificate",
      applicationFiles.birth_certificate_url,
      applicationFiles.birth_certificate_signed_url
    );

    showExistingFile(
      "upload-cedula",
      applicationFiles.community_tax_certificate_url,
      applicationFiles.community_tax_certificate_signed_url
    );

    showExistingFile(
      "upload-signature",
      applicationFiles.signature_url,
      applicationFiles.signature_signed_url
    );

    if (mode === "request-edit") {

      try {
        const temporaryFiles =
          await getRequestEditFiles(
            applicationId
          );

        const inputMap = {
          valid_id_front:
            "upload-valid-id-front",

          valid_id_back:
            "upload-valid-id-back",

          latest_photo:
            "upload-latest-photo",

          birth_certificate:
            "upload-birth-certificate",

          community_tax_certificate:
            "upload-cedula",

          signature:
            "upload-signature"
        };

        Object.entries(
          temporaryFiles
        ).forEach(function ([fileType, file]) {

          const inputId =
            inputMap[fileType];

          const input =
            document.getElementById(inputId);

          if (!input || !file) {
            return;
          }

          /*
          * Restore the temporary File into the browser
          * input without uploading it.
          */
          const transfer =
            new DataTransfer();

          transfer.items.add(file);

          input.files =
            transfer.files;

          input.dispatchEvent(
            new Event("change")
          );
        });

      } catch (error) {
        console.error(
          "Unable to restore temporary files:",
          error
        );
      }
    }
  
  } catch (error) {
    showSuccessNotification(
      "Unable to load application: " +
      (error.message || "Unknown error"),
      function () {
        window.location.href = "trackstatus.html";
      }
    );
  }
}

function setupFaceCamera() {
  const openButton =
    document.getElementById("open-face-camera");

  const closeButton =
    document.getElementById("close-face-camera");

  const previewWrap =
    document.getElementById("face-camera-preview");

  const videoElement =
    document.getElementById("face-camera-video");

  const canvasElement =
    document.getElementById("face-camera-canvas");

  const captureButton =
    document.getElementById("capture-face-button");

  const retakeButton =
    document.getElementById("retake-face-button");

  const resultBox =
    document.getElementById("face-verification-result");

  const statusLabel =
    document.getElementById("face-camera-status");

  const fallbackInput =
    document.getElementById("upload-verification");

  const validIdInput =
    document.getElementById("upload-valid-id-front");

  const formVerificationStatus =
    document.getElementById(
      "face-verification-form-status"
    );


  /*
   * IMPORTANT:
   * This works on your LAPTOP while the Python
   * FastAPI service is running locally.
   *
   * We will replace this URL later when we deploy
   * the face-verification API online.
   */
  const FACE_VERIFICATION_API =
    "https://application-system-vcv6.onrender.com/verify-face";


  if (
    !openButton ||
    !closeButton ||
    !previewWrap ||
    !videoElement ||
    !canvasElement ||
    !captureButton ||
    !retakeButton ||
    !fallbackInput ||
    !validIdInput
  ) {
    return;
  }


  let faceStream = null;


  // =====================================================
  // HELPERS
  // =====================================================

  const setStatus = function (message) {
    if (statusLabel) {
      statusLabel.textContent = message;
    }
  };


  const setVerificationResult = function (
    message,
    type
  ) {
    if (!resultBox) {
      return;
    }

    resultBox.hidden = false;
    resultBox.textContent = message;

    resultBox.classList.remove(
      "verification-success",
      "verification-error",
      "verification-loading"
    );

    if (type) {
      resultBox.classList.add(
        "verification-" + type
      );
    }
  };


  const clearVerification = function () {
    /*
     * A data attribute will let us know later
     * whether facial verification was completed.
     */
    fallbackInput.dataset.faceVerified =
      "false";

    fallbackInput.dataset.faceSimilarity =
      "";

    if (resultBox) {
      resultBox.hidden = true;
      resultBox.textContent = "";

      resultBox.classList.remove(
        "verification-success",
        "verification-error",
        "verification-loading"
      );
    }
    if (formVerificationStatus) {
      formVerificationStatus.hidden = true;
    }
  };


  const stopLiveStream = function () {
    if (faceStream) {
      faceStream
        .getTracks()
        .forEach(function (track) {
          track.stop();
        });

      faceStream = null;
    }

    videoElement.srcObject = null;
  };


  const resetCaptureState = function () {
    videoElement.hidden = false;
    canvasElement.hidden = true;

    captureButton.hidden = false;
    captureButton.disabled = false;
    captureButton.textContent =
      "Capture & Verify";

    retakeButton.hidden = true;

    clearVerification();

    setStatus(
      "Position your face clearly inside the camera."
    );
  };


  const stopCamera = function () {
    stopLiveStream();

    previewWrap.hidden = true;

    previewWrap.setAttribute(
      "aria-hidden",
      "true"
    );

    openButton.setAttribute(
      "aria-expanded",
      "false"
    );

    document.body.classList.remove(
      "camera-open"
    );
  };


  // =====================================================
  // START CAMERA
  // =====================================================

  const startCamera = async function () {
    resetCaptureState();

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setStatus(
        "Camera access is not supported in this browser."
      );

      return;
    }


    if (faceStream) {
      stopLiveStream();
    }


    try {
      faceStream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user"
          },
          audio: false
        });


      videoElement.srcObject =
        faceStream;


      /*
       * Mirror only the live preview.
       */
      videoElement.style.transform =
        "scaleX(-1)";


      previewWrap.hidden =
        false;


      previewWrap.setAttribute(
        "aria-hidden",
        "false"
      );


      openButton.setAttribute(
        "aria-expanded",
        "true"
      );


      document.body.classList.add(
        "camera-open"
      );


      setStatus(
        "Position your face clearly inside the camera."
      );


    } catch (error) {
      console.error(
        "Unable to open face camera:",
        error
      );


      setStatus(
        "Unable to access the camera. Please allow camera permission and try again."
      );
    }
  };


  // =====================================================
  // CAPTURE + VERIFY
  // =====================================================

  const captureFace = async function () {

    // -------------------------------------------------
    // Check Valid ID first
    // -------------------------------------------------

    let validIdFile =
      validIdInput.files?.[0] || null;

    if (!validIdFile) {

      const existingFileUrl =
        validIdInput.dataset.existingFileUrl;


      if (existingFileUrl) {

        try {

          setVerificationResult(
            "Loading your existing Valid ID...",
            "loading"
          );


          const existingResponse =
            await fetch(
              existingFileUrl
            );


          if (!existingResponse.ok) {
            throw new Error(
              "Unable to load existing Valid ID."
            );
          }


          const existingBlob =
            await existingResponse.blob();


          validIdFile =
            new File(
              [existingBlob],
              "existing-valid-id.jpg",
              {
                type:
                  existingBlob.type ||
                  "image/jpeg",

                lastModified:
                  Date.now()
              }
            );


        } catch (error) {

          console.error(
            "Unable to retrieve existing Valid ID:",
            error
          );


          setVerificationResult(
            "Unable to load your existing Valid ID. Please upload the Valid ID again.",
            "error"
          );


          return;
        }
      }
    }


    /*
    * Neither a newly selected ID nor an existing
    * stored ID is available.
    */
    if (!validIdFile) {

      setVerificationResult(
        "Please upload the front of your valid government ID before scanning your face.",
        "error"
      );

      return;
    }


    /*
     * For now the Python face-recognition endpoint
     * accepts images, not PDF documents.
     */
    if (
      !validIdFile.type ||
      !validIdFile.type.startsWith("image/")
    ) {
      setVerificationResult(
        "Please upload the front of your valid ID as an image (JPG, JPEG, or PNG) for facial verification.",
        "error"
      );

      setStatus(
        "The uploaded ID must be an image."
      );

      return;
    }


    // -------------------------------------------------
    // Make sure camera is ready
    // -------------------------------------------------

    if (
      !videoElement.videoWidth ||
      !videoElement.videoHeight
    ) {
      setStatus(
        "Camera is not ready yet. Please wait a moment and try again."
      );

      return;
    }


    captureButton.disabled = true;

    captureButton.textContent =
      "Verifying...";


    setStatus(
      "Capturing and verifying your face..."
    );


    setVerificationResult(
      "Please wait while your face is being verified.",
      "loading"
    );


    // -------------------------------------------------
    // Capture frame
    // -------------------------------------------------

    const context =
      canvasElement.getContext("2d");


    canvasElement.width =
      videoElement.videoWidth;


    canvasElement.height =
      videoElement.videoHeight;


    /*
     * Mirror the captured image so it matches
     * what the applicant sees in the preview.
     */
    context.save();


    context.translate(
      canvasElement.width,
      0
    );


    context.scale(
      -1,
      1
    );


    context.drawImage(
      videoElement,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );


    context.restore();


    canvasElement.toBlob(
      async function (blob) {

        if (!blob) {
          captureButton.disabled = false;

          captureButton.textContent =
            "Capture & Verify";


          setVerificationResult(
            "Unable to capture your face. Please try again.",
            "error"
          );


          setStatus(
            "Unable to capture the image."
          );

          return;
        }


        // ---------------------------------------------
        // Turn camera frame into a File
        // ---------------------------------------------

        const capturedFile =
          new File(
            [blob],
            "face-verification.jpg",
            {
              type: "image/jpeg",
              lastModified: Date.now()
            }
          );


        /*
         * Save captured image to the existing
         * verification file input.
         */
        const transfer =
          new DataTransfer();


        transfer.items.add(
          capturedFile
        );


        fallbackInput.files =
          transfer.files;


        // ---------------------------------------------
        // Show captured still frame
        // ---------------------------------------------

        videoElement.hidden =
          true;


        canvasElement.hidden =
          false;


        stopLiveStream();


        // ---------------------------------------------
        // Create request for FastAPI
        // ---------------------------------------------

        const verificationData =
          new FormData();


        /*
         * source_image = Valid ID
         * target_image = Live camera capture
         */
        verificationData.append(
          "source_image",
          validIdFile
        );


        verificationData.append(
          "target_image",
          capturedFile
        );


        try {

          // -------------------------------------------
          // Call Python facial-verification API
          // -------------------------------------------

          const response =
            await fetch(
              FACE_VERIFICATION_API,
              {
                method: "POST",
                body: verificationData
              }
            );


          let result;


          try {
            result =
              await response.json();

          } catch (jsonError) {
            throw new Error(
              "The face verification service returned an invalid response."
            );
          }


          if (!response.ok) {
            throw new Error(
              result.message ||
              "Face verification service failed."
            );
          }


          // ===========================================
          // VERIFIED
          // ===========================================

          if (
            result.success === true &&
            result.verified === true
          ) {

            fallbackInput.dataset.faceVerified =
              "true";

            if (formVerificationStatus) {
              formVerificationStatus.hidden = false;
            }


            fallbackInput.dataset.faceSimilarity =
              String(
                result.similarity ?? ""
              );


            setStatus(
              "Face verified successfully."
            );


            setVerificationResult(
              "✓ Face verified successfully.",
              "success"
            );


            captureButton.hidden =
              true;


            retakeButton.hidden =
              false;


            console.log(
              "Face verification successful:",
              result
            );


            return;
          }


          // ===========================================
          // NOT VERIFIED
          // ===========================================

          fallbackInput.dataset.faceVerified =
            "false";


          fallbackInput.dataset.faceSimilarity =
            String(
              result.similarity ?? ""
            );


          setStatus(
            "Face verification was unsuccessful."
          );


          let failureMessage =
            result.message ||
            "The scanned face does not match the person shown on the uploaded ID.";


          /*
           * Make technical API messages easier for
           * applicants to understand.
           */
          if (
            failureMessage
              .toLowerCase()
              .includes("no face")
          ) {
            failureMessage =
              "No clear face was detected. Please make sure your face and the face on your ID are clearly visible.";
          }


          if (
            failureMessage
              .toLowerCase()
              .includes("multiple faces")
          ) {
            failureMessage =
              "Multiple faces were detected. Please make sure only one person is visible.";
          }


          if (
            failureMessage ===
            "The faces do not match."
          ) {
            failureMessage =
              "The scanned face does not match the person shown on the uploaded valid ID.";
          }


          setVerificationResult(
            "✕ " + failureMessage,
            "error"
          );


          captureButton.hidden =
            true;


          retakeButton.hidden =
            false;


          console.log(
            "Face verification failed:",
            result
          );


        } catch (error) {

          console.error(
            "Face verification request error:",
            error
          );


          fallbackInput.dataset.faceVerified =
            "false";


          setStatus(
            "Unable to complete face verification."
          );


          setVerificationResult(
            "Unable to connect to the face verification service. Please try again.",
            "error"
          );


          captureButton.hidden =
            true;


          retakeButton.hidden =
            false;
        }
      },

      "image/jpeg",
      0.92
    );
  };


  // =====================================================
  // RETAKE
  // =====================================================

  const retakeFace = async function () {

    clearVerification();


    /*
     * Remove old captured verification photo.
     */
    const emptyTransfer =
      new DataTransfer();


    fallbackInput.files =
      emptyTransfer.files;


    const context =
      canvasElement.getContext("2d");


    context.clearRect(
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );


    await startCamera();
  };


  // =====================================================
  // IF VALID ID CHANGES, VERIFICATION IS INVALID
  // =====================================================

  validIdInput.addEventListener(
    "change",
    function () {

      /*
       * A face verified against an old ID image
       * must not remain valid after changing ID.
       */
      clearVerification();


      const emptyTransfer =
        new DataTransfer();


      fallbackInput.files =
        emptyTransfer.files;


      if (!previewWrap.hidden) {
        setStatus(
          "Valid ID changed. Please scan your face again."
        );
      }
    }
  );


  // =====================================================
  // EVENTS
  // =====================================================

  openButton.addEventListener(
    "click",
    async function () {

      const newValidIdFile =
        validIdInput.files?.[0] || null;

      const existingValidIdUrl =
        validIdInput.dataset.existingFileUrl || "";

      if (
        !newValidIdFile &&
        !existingValidIdUrl
      ) {

        showErrorNotification(
          "Please upload the front of your valid government ID before scanning your face."
        );

        validIdInput.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

        return;
      }

      if (
        newValidIdFile &&
        (
          !newValidIdFile.type ||
          !newValidIdFile.type.startsWith("image/")
        )
      ) {

        showErrorNotification(
          "Please upload the front of your valid government ID as a JPG, JPEG, or PNG image before facial verification."
        );

        return;
      }


      await startCamera();
    }
  );


  captureButton.addEventListener(
    "click",
    async function () {
      await captureFace();
    }
  );


  retakeButton.addEventListener(
    "click",
    async function () {
      await retakeFace();
    }
  );


  closeButton.addEventListener(
    "click",
    function () {
      stopCamera();
    }
  );


  window.addEventListener(
    "beforeunload",
    function () {
      stopCamera();
    }
  );


  previewWrap.addEventListener(
    "click",
    function (event) {

      if (
        event.target === previewWrap
      ) {
        stopCamera();
      }
    }
  );


  window.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Escape" &&
        !previewWrap.hidden
      ) {
        stopCamera();
      }
    }
  );
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

function setupApplicantAge() {
  const dobInput = document.getElementById("dob");
  const ageInput = document.getElementById("age");

  if (!dobInput || !ageInput) {
    return;
  }

  const calculateAge = function (birthDateValue) {
    if (!birthDateValue) {
      return "";
    }

    const birthDate = new Date(birthDateValue);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();

    if (
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age >= 0 ? String(age) : "";
  };

  dobInput.addEventListener("input", function () {
    ageInput.value = calculateAge(this.value);
  });

  if (dobInput.value) {
    ageInput.value = calculateAge(dobInput.value);
  }
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
  confirmBtn.textContent = "Yes";
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
  const cancelButton =
    document.getElementById("cancel-application");

  if (!cancelButton) {
    return;
  }

  cancelButton.addEventListener("click", async function () {
    const params =
      new URLSearchParams(window.location.search);

    const mode = params.get("mode");
    const duplicateSessionId = params.get("session");
    const applicationId = params.get("id");

    if (
      mode === "duplicate-update"
    ) {

      await clearDuplicateUpdateDraft(
        duplicateSessionId
      );

      window.location.href =
        "index.html";

      return;
    }

    if (
      applicationId &&
      (mode === "edit" || mode === "request-edit")
    ) {
      const step =
        mode === "request-edit"
          ? "3"
          : "2";

      window.location.href =
        "trackstatus.html?id=" +
        encodeURIComponent(applicationId) +
        "&step=" +
        step;

      return;
    }

    showConfirmationModal(
      "Cancel Application?",
      "Are you sure you want to cancel this application? Your data will not be saved.",
      function () {
        window.location.href = "index.html";
      }
    );
  });
}

function openRequestEditFileDatabase() {
  return new Promise(function (resolve, reject) {
    const request =
      indexedDB.open("oscaRequestEditFiles", 1);

    request.onupgradeneeded = function () {
      const database = request.result;

      if (!database.objectStoreNames.contains("files")) {
        database.createObjectStore("files");
      }
    };

    request.onsuccess = function () {
      resolve(request.result);
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}


async function saveRequestEditFiles(applicationId) {
  const database =
    await openRequestEditFileDatabase();

  const transaction =
    database.transaction("files", "readwrite");

  const store =
    transaction.objectStore("files");

  const fileInputs = {
    valid_id_front:
      document.getElementById("upload-valid-id-front"),

    valid_id_back:
      document.getElementById("upload-valid-id-back"),

    latest_photo:
      document.getElementById("upload-latest-photo"),

    birth_certificate:
      document.getElementById("upload-birth-certificate"),

    community_tax_certificate:
      document.getElementById("upload-cedula"),

    signature:
      document.getElementById("upload-signature")
  };

  Object.entries(fileInputs).forEach(
    function ([fileType, input]) {
      const file =
        input?.files?.[0] || null;

      const key =
        applicationId + ":" + fileType;

      if (file) {
        store.put(file, key);
      } else {
        store.delete(key);
      }
    }
  );

  return new Promise(function (resolve, reject) {
    transaction.oncomplete = function () {
      database.close();
      resolve();
    };

    transaction.onerror = function () {
      database.close();
      reject(transaction.error);
    };
  });
}

async function getRequestEditFiles(applicationId) {
  const database =
    await openRequestEditFileDatabase();

  const fileTypes = [
    "valid_id_front",
    "valid_id_back",
    "latest_photo",
    "birth_certificate",
    "community_tax_certificate",
    "signature"
  ];

  const transaction =
    database.transaction("files", "readonly");

  const store =
    transaction.objectStore("files");

  const files = {};

  await Promise.all(
    fileTypes.map(function (fileType) {
      return new Promise(function (resolve, reject) {
        const key =
          applicationId + ":" + fileType;

        const request = store.get(key);

        request.onsuccess = function () {
          if (request.result) {
            files[fileType] =
              request.result;
          }

          resolve();
        };

        request.onerror = function () {
          reject(request.error);
        };
      });
    })
  );

  database.close();

  return files;
}


async function clearRequestEditFiles(applicationId) {
  const database =
    await openRequestEditFileDatabase();

  const fileTypes = [
    "valid_id_front",
    "valid_id_back",
    "latest_photo",
    "birth_certificate",
    "community_tax_certificate",
    "signature"
  ];

  const transaction =
    database.transaction("files", "readwrite");

  const store =
    transaction.objectStore("files");

  fileTypes.forEach(function (fileType) {
    const key =
      applicationId + ":" + fileType;

    store.delete(key);
  });

  return new Promise(function (resolve, reject) {
    transaction.oncomplete = function () {
      database.close();
      resolve();
    };

    transaction.onerror = function () {
      database.close();
      reject(transaction.error);
    };
  });
}

async function clearPendingIdRequest(applicationId) {
  // Clear temporary edited application data
  sessionStorage.removeItem(
    "pendingRequestApplicationId"
  );

  sessionStorage.removeItem(
    "pendingRequestApplicationChanges"
  );

  // Clear temporary selected reason
  sessionStorage.removeItem(
    "pendingRequestReasonApplicationId"
  );

  sessionStorage.removeItem(
    "pendingRequestReason"
  );

  sessionStorage.removeItem(
    "pendingRequestOtherReason"
  );

  // Clear temporary replacement files
  if (applicationId) {
    try {
      await clearRequestEditFiles(
        applicationId
      );
    } catch (error) {
      console.error(
        "Unable to clear temporary request files:",
        error
      );
    }
  }
}

async function clearDuplicateUpdateDraft(sessionId) {
  sessionStorage.removeItem(
    "duplicateUpdateSession"
  );

  sessionStorage.removeItem(
    "duplicateUpdateDraftSession"
  );

  sessionStorage.removeItem(
    "duplicateUpdateDraft"
  );

  if (sessionId) {
    try {
      await clearRequestEditFiles(
        sessionId
      );
    } catch (error) {
      console.error(
        "Unable to clear temporary duplicate files:",
        error
      );
    }
  }
}

function setupFormSubmitConfirmation() {
  const submitButton = document.querySelector('.btn.submit');
  if (!submitButton) {
    return;
  }

  const getSupabaseClient = function () {
    return window.supabaseClient || window.supabase || null;
  };

  const getInputValue = function (id) {
    const field = document.getElementById(id);
    if (!field) {
      return "";
    }
    return (field.value || "").trim();
  };

  const toNull = function (value) {
    const clean = (value || '').trim();
    return clean === '' ? null : clean;
  };

  const parseInteger = function (value) {
    const clean = (value || '').trim();
    if (clean === '') {
      return null;
    }
    const parsed = Number(clean);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const parseNumeric = function (value) {
    const clean = (value || '').trim();
    if (clean === '') {
      return null;
    }
    const parsed = Number(clean);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const normalizeText = function (value) {
    return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  };

  const getSelectSpecifyValue = function (id) {
    const field = document.getElementById(id);
    if (!field) {
      return null;
    }

    const selectedOption = field.options[field.selectedIndex];
    const selectedText = normalizeText(selectedOption ? selectedOption.textContent : '');
    if (!selectedText.includes('specify')) {
      return null;
    }

    const specifyInput = field.nextElementSibling;
    if (!specifyInput || !specifyInput.classList || !specifyInput.classList.contains('specify-input')) {
      return null;
    }

    return toNull(specifyInput.value);
  };

  const getCheckboxGroups = function () {
    return Array.from(document.querySelectorAll('.checkbox-group')).map(function (group) {
      const title = normalizeText(group.querySelector('.group-label')?.textContent || '');
      const options = Array.from(group.querySelectorAll('.check-option')).map(function (label) {
        const checkbox = label.querySelector('input[type="checkbox"]');
        const clone = label.cloneNode(true);
        clone.querySelectorAll('input, select, textarea').forEach(function (field) {
          field.remove();
        });

        const text = normalizeText(clone.textContent || '');
        const specifyInput = label.nextElementSibling;
        const specifyValue = specifyInput && specifyInput.classList && specifyInput.classList.contains('specify-input')
          ? toNull(specifyInput.value)
          : null;

        return {
          text: text,
          checked: checkbox ? checkbox.checked : false,
          specify: specifyValue
        };
      });

      return { title: title, options: options };
    });
  };

  const getGroupByTitle = function (groups, titleHint) {
    const target = normalizeText(titleHint);
    return groups.find(function (group) {
      return group.title.includes(target);
    }) || null;
  };

  const isChecked = function (group, optionHint) {
    if (!group) {
      return false;
    }
    const target = normalizeText(optionHint);
    return group.options.some(function (option) {
      return option.checked && option.text.includes(target);
    });
  };

  const getSpecifyValue = function (group, optionHint) {
    if (!group) {
      return null;
    }
    const target = normalizeText(optionHint);
    const option = group.options.find(function (item) {
      return item.checked && item.text.includes(target);
    });
    if (!option) {
      return null;
    }
    return option.specify;
  };

  const collectFamilyRows = function () {
    const familyBody = document.getElementById('family-body');
    if (!familyBody) {
      return [];
    }

    return Array.from(familyBody.querySelectorAll('tr')).map(function (row) {
      return {
        name: toNull(row.querySelector('input[aria-label="Family member name"]')?.value || ''),
        relationship: toNull(row.querySelector('input[aria-label="Family relationship"]')?.value || ''),
        age: parseInteger(row.querySelector('input[aria-label="Family age"]')?.value || ''),
        civil_status: toNull(row.querySelector('select[aria-label="Family civil status"]')?.value || ''),
        occupation: toNull(row.querySelector('input[aria-label="Family occupation"]')?.value || ''),
        income: parseNumeric(row.querySelector('input[aria-label="Family income"]')?.value || '')
      };
    }).filter(function (item) {
      return item.name || item.relationship || item.age !== null || item.civil_status || item.occupation || item.income !== null;
    });
  };

  const collectAllPayloads = function () {
    const groups = getCheckboxGroups();

    const sourceIncomeGroup = getGroupByTitle(groups, 'source of income and assistance');
    const assetsGroup = getGroupByTitle(groups, 'assets and properties');
    const livingGroup = getGroupByTitle(groups, 'living residing with');
    const skillsGroup = getGroupByTitle(groups, 'areas specialization skills');
    const involvementGroup = getGroupByTitle(groups, 'involvement in common encountered');
    const economicGroup = getGroupByTitle(groups, 'economic');
    const socialGroup = getGroupByTitle(groups, 'social emotional');
    const healthGroup = getGroupByTitle(groups, 'health');
    const housingGroup = getGroupByTitle(groups, 'housing');
    const communityGroup = getGroupByTitle(groups, 'community service');

    const educationRaw = toNull(getInputValue('education'));
    const education = educationRaw === 'Not Attended Any School' ? 'Not Attend Any School' : educationRaw;

    const applicationsData = {
      surname: getInputValue('surname'),
      first_name: getInputValue('firstname'),
      middle_name: toNull(getInputValue('middlename')),
      date_of_birth: getInputValue('dob'),
      age: parseInteger(getInputValue('age')),
      sex: toNull(getInputValue('sex')),
      place_of_birth: toNull(getInputValue('birthplace')),
      civil_status: toNull(getInputValue('civil-status')),
      house_street: toNull(getInputValue('address')),
      barangay_district: toNull(getInputValue('barangay')),
      educational_attainment: education,
      religion: toNull(getInputValue('religion')),
      religion_specify: getSelectSpecifyValue('religion'),
      occupation: toNull(getInputValue('occupation')),
      osca_id_number: toNull(getInputValue('id-osca')),
      sss_id_number: toNull(getInputValue('id-sss')),
      philhealth_id_number: toNull(getInputValue('id-philhealth')),
      gsis_id_number: toNull(getInputValue('id-gsis')),
      tin_id_number: toNull(getInputValue('id-tin')),
      contact_number: toNull(getInputValue('contact-number')),
    };

    const membershipsData = {
      association_name: toNull(getInputValue('assoc-name')),
      association_address: toNull(getInputValue('assoc-address')),
      association_date: toNull(getInputValue('assoc-date')),
      position: toNull(getInputValue('assoc-position'))
    };

    const personalBackgroundData = {
      income_own_earnings: isChecked(sourceIncomeGroup, 'own earnings'),
      income_own_pension: isChecked(sourceIncomeGroup, 'own pension'),
      income_stocks_dividends: isChecked(sourceIncomeGroup, 'stocks dividends'),
      income_dependent_children: isChecked(sourceIncomeGroup, 'dependent of children relatives'),
      income_spouse_salary: isChecked(sourceIncomeGroup, 'spouse salary'),
      income_insurance: isChecked(sourceIncomeGroup, 'insurance'),
      income_rentals_sharecrops: isChecked(sourceIncomeGroup, 'rentals sharecrops'),
      income_savings: isChecked(sourceIncomeGroup, 'savings'),
      income_livestock_crop: isChecked(sourceIncomeGroup, 'livestock crop'),
      income_other: isChecked(sourceIncomeGroup, 'others specify'),
      income_other_specify: getSpecifyValue(sourceIncomeGroup, 'others specify'),

      asset_house: isChecked(assetsGroup, 'house'),
      asset_lot: isChecked(assetsGroup, 'lot'),
      asset_farmland: isChecked(assetsGroup, 'farmland'),
      asset_fishponds_resorts: isChecked(assetsGroup, 'fishponds resorts'),
      asset_commercial_building: isChecked(assetsGroup, 'commercial building'),
      asset_other: isChecked(assetsGroup, 'others specify'),
      asset_other_specify: getSpecifyValue(assetsGroup, 'others specify'),

      monthly_income: toNull(getInputValue('monthly-income')),

      living_alone: isChecked(livingGroup, 'alone'),
      living_spouse: isChecked(livingGroup, 'spouse'),
      living_care_institution: isChecked(livingGroup, 'care institution'),
      living_children: isChecked(livingGroup, 'children'),
      living_friends: isChecked(livingGroup, 'friends'),
      living_common_law_spouse: isChecked(livingGroup, 'common law spouse'),
      living_grandchildren: isChecked(livingGroup, 'grandchildren'),
      living_households: isChecked(livingGroup, 'households'),
      living_relatives: isChecked(livingGroup, 'relatives'),
      living_in_laws: isChecked(livingGroup, 'in laws'),
      living_other: isChecked(livingGroup, 'others specify'),
      living_other_specify: getSpecifyValue(livingGroup, 'others specify'),

      skill_medical: isChecked(skillsGroup, 'medical'),
      skill_dental: isChecked(skillsGroup, 'dental'),
      skill_farming: isChecked(skillsGroup, 'farming'),
      skill_arts: isChecked(skillsGroup, 'arts'),
      skill_teaching: isChecked(skillsGroup, 'teaching'),
      skill_counseling: isChecked(skillsGroup, 'counseling'),
      skill_fishing: isChecked(skillsGroup, 'fishing'),
      skill_engineering: isChecked(skillsGroup, 'engineering'),
      skill_legal_services: isChecked(skillsGroup, 'legal services'),
      skill_evangelization: isChecked(skillsGroup, 'evangelization'),
      skill_cooking: isChecked(skillsGroup, 'cooking'),
      skill_vocational: isChecked(skillsGroup, 'vocational'),
      skill_other: isChecked(skillsGroup, 'others specify'),
      skill_other_specify: getSpecifyValue(skillsGroup, 'others specify'),

      involvement_medical: isChecked(involvementGroup, 'medical'),
      involvement_dental: isChecked(involvementGroup, 'dental'),
      involvement_religious: isChecked(involvementGroup, 'religious'),
      involvement_sportsmanship: isChecked(involvementGroup, 'sportsmanship'),
      involvement_resource_volunteer: isChecked(involvementGroup, 'resource volunteer'),
      involvement_friendly_visits: isChecked(involvementGroup, 'friendly visits'),
      involvement_counseling_referral: isChecked(involvementGroup, 'counseling referral'),
      involvement_legal_services: isChecked(involvementGroup, 'legal spouse') || isChecked(involvementGroup, 'legal services'),
      involvement_community_leader: isChecked(involvementGroup, 'community organization leader'),
      involvement_other: isChecked(involvementGroup, 'others specify'),
      involvement_other_specify: getSpecifyValue(involvementGroup, 'others specify')
    };

    const problemsNeedsData = {

      economic_lack_income: isChecked(economicGroup, 'lack of income resource'),
      economic_skills_training: isChecked(economicGroup, 'skills capability training'),
      economic_skills_training_specify: getSpecifyValue(economicGroup, 'skills capability training'),
      economic_livelihood: isChecked(economicGroup, 'livelihood opportunities'),
      economic_livelihood_specify: getSpecifyValue(economicGroup, 'livelihood opportunities'),
      economic_other: isChecked(economicGroup, 'others specify'),
      economic_other_specify: getSpecifyValue(economicGroup, 'others specify'),

      social_neglect_rejection: isChecked(socialGroup, 'feeling of neglect rejection'),
      social_helplessness: isChecked(socialGroup, 'feeling of helplessness worthlessness'),
      social_loneliness: isChecked(socialGroup, 'feeling of loneliness isolation'),
      social_inadequate_recreation: isChecked(socialGroup, 'inadequate leisure recreational activities'),
      social_senior_friendly_environment: isChecked(socialGroup, 'senior citizens friendly environment'),
      social_other: isChecked(socialGroup, 'others specify'),
      social_other_specify: getSpecifyValue(socialGroup, 'others specify'),

      health_high_cost_medicine: isChecked(healthGroup, 'high cost of medicines'),
      health_lack_medical_professionals: isChecked(healthGroup, 'lack of medical professionals'),
      health_no_sanitation: isChecked(healthGroup, 'lack no access of sanitation'),
      health_no_insurance: isChecked(healthGroup, 'lack no health insurance'),
      health_lack_hospital: isChecked(healthGroup, 'lack of hospitals medical facilities'),
      health_problem: isChecked(healthGroup, 'health problems ailments specify'),
      health_problem_specify: getSpecifyValue(healthGroup, 'health problems ailments specify'),

      housing_overcrowding: isChecked(housingGroup, 'overcrowding in family home'),
      housing_no_permanent_home: isChecked(housingGroup, 'no permanent housing'),
      housing_independent_living: isChecked(housingGroup, 'longing for independent living quiet atmosphere'),
      housing_lost_privacy: isChecked(housingGroup, 'lost privacy'),
      housing_squatter_area: isChecked(housingGroup, 'living in squatter s area'),
      housing_high_rental: isChecked(housingGroup, 'high cost of rental'),
      housing_other: isChecked(housingGroup, 'others specify'),
      housing_other_specify: getSpecifyValue(housingGroup, 'others specify'),

      community_desire_participate: isChecked(communityGroup, 'desire to participate'),
      community_skills_to_share: isChecked(communityGroup, 'skills resource to share'),
      community_other: isChecked(communityGroup, 'others specify'),
      community_other_specify: getSpecifyValue(communityGroup, 'others specify'),

      other_specific_needs: toNull(getInputValue('specific-needs'))
    };

    const applicationFilesData = {
      valid_id_url: toNull(document.getElementById('upload-valid-id-front')?.files?.[0]?.name || ''),
      valid_id_back_url: toNull(document.getElementById('upload-valid-id-back')?.files?.[0]?.name || ''),
      latest_photo_url: toNull(document.getElementById('upload-latest-photo')?.files?.[0]?.name || ''),
      birth_certificate_url: toNull(document.getElementById('upload-birth-certificate')?.files?.[0]?.name || ''),
      community_tax_certificate_url: toNull(document.getElementById('upload-cedula')?.files?.[0]?.name || ''),
      signature_url: toNull(document.getElementById('upload-signature')?.files?.[0]?.name || ''),
      application_date: toNull(getInputValue('date-application'))
    };

    const confirmationsData = {
      info_true: Boolean(
        document.getElementById("consent-1")?.checked
      ),

      full_knowledge: Boolean(
        document.getElementById("consent-2")?.checked
      ),

      personal_consent: Boolean(
        document.getElementById("consent-3")?.checked
      ),

      understand_storage: Boolean(
        document.getElementById("consent-4")?.checked
      ),

      agree_all: Boolean(
        document.getElementById("consent-5")?.checked
      ),

      assisted_certified: Boolean(
        document.getElementById("consent-assisted")?.checked
      ),

      assisted_by: toNull(
        getInputValue("assisted-by")
      ),

      relation: toNull(
        getInputValue("relation-registrant")
      )
    };

    const statusHistoryData = {
      status: 'Pending',
    };

    return {
      applicationsData: applicationsData,
      familyRowsData: collectFamilyRows(),
      membershipsData: membershipsData,
      personalBackgroundData: personalBackgroundData,
      problemsNeedsData: problemsNeedsData,
      applicationFilesData: applicationFilesData,
      confirmationsData: confirmationsData,
      statusHistoryData: statusHistoryData
    };
  };

  const saveApplicationOLD = async function (supabaseClient) {
    const { data: appRow, error: appError } = await supabaseClient
      .from('applications')
      .insert({
        surname: getInputValue('surname'),
        first_name: getInputValue('firstname'),
        middle_name: toNull(getInputValue('middlename')),
        date_of_birth: getInputValue('dob'),
        age: parseInteger(getInputValue('age')),
        sex: toNull(getInputValue('sex')),
        place_of_birth: toNull(getInputValue('birthplace')),
        civil_status: toNull(getInputValue('civil-status')),
        house_street: toNull(getInputValue('address')),
        barangay_district: toNull(getInputValue('barangay')),
        educational_attainment: (toNull(getInputValue('education')) === 'Not Attended Any School') ? 'Not Attend Any School' : toNull(getInputValue('education')),
        religion: toNull(getInputValue('religion')),
        religion_specify: getSelectSpecifyValue('religion'),
        occupation: toNull(getInputValue('occupation')),
        osca_id_number: toNull(getInputValue('id-osca')),
        sss_id_number: toNull(getInputValue('id-sss')),
        philhealth_id_number: toNull(getInputValue('id-philhealth')),
        gsis_id_number: toNull(getInputValue('id-gsis')),
        tin_id_number: toNull(getInputValue('id-tin')),
        contact_number: toNull(getInputValue('contact-number')),
        application_status: 'Pending'
      })
      .select('application_id')
      .single();

    if (appError || !appRow || !appRow.application_id) {
      throw appError || new Error('Unable to create application record.');
    }

    const applicationId = appRow.application_id;
    const payloads = collectAllPayloads(applicationId);

    try {
      if (payloads.familyRowsData.length > 0) {
        const { error: familyError } = await supabaseClient.from('family_composition').insert(payloads.familyRowsData);
        if (familyError) {
          throw familyError;
        }
      }

      const hasMembershipData = payloads.membershipsData.association_name || payloads.membershipsData.association_address || payloads.membershipsData.association_date || payloads.membershipsData.position;
      if (hasMembershipData) {
        const { error: membershipError } = await supabaseClient.from('memberships').insert(payloads.membershipsData);
        if (membershipError) {
          throw membershipError;
        }
      }

      const { error: personalBackgroundError } = await supabaseClient.from('personal_background').insert(payloads.personalBackgroundData);
      if (personalBackgroundError) {
        throw personalBackgroundError;
      }

      const { error: problemsNeedsError } = await supabaseClient.from('problems_needs').insert(payloads.problemsNeedsData);
      if (problemsNeedsError) {
        throw problemsNeedsError;
      }

      const { error: applicationFilesError } = await supabaseClient.from('application_files').insert(payloads.applicationFilesData);
      if (applicationFilesError) {
        throw applicationFilesError;
      }

      const { error: confirmationsError } = await supabaseClient.from('confirmations').insert(payloads.confirmationsData);
      if (confirmationsError) {
        throw confirmationsError;
      }

      const { error: statusHistoryError } = await supabaseClient.from('application_status_history').insert(payloads.statusHistoryData);
      if (statusHistoryError) {
        throw statusHistoryError;
      }
    } catch (error) {
      await supabaseClient.from('applications').delete().eq('application_id', applicationId);
      throw error;
    }
  };

  const saveApplication = async function () {
    const payload = collectAllPayloads();

    const params =
      new URLSearchParams(
        window.location.search
      );

    const mode =
      params.get("mode");

    const applicationId =
      params.get("id");

    const duplicateSessionId =
      params.get("session");

    const isPendingEdit =
      mode === "edit" &&
      Boolean(applicationId);

    const isDuplicateUpdate =
      mode === "duplicate-update" &&
      Boolean(duplicateSessionId);

    const formData = new FormData();

    formData.append("payload", JSON.stringify(payload));

    const validIdFront =
      document.getElementById("upload-valid-id-front")?.files?.[0];

    if (validIdFront) {
      formData.append("valid_id_front", validIdFront);
    }

    const validIdBack =
      document.getElementById("upload-valid-id-back")?.files?.[0];

    if (validIdBack) {
      formData.append("valid_id_back", validIdBack);
    }

    const latestPhoto =
      document.getElementById("upload-latest-photo")?.files?.[0];

    if (latestPhoto) {
      formData.append("latest_photo", latestPhoto);
    }

    const birthCertificate =
      document.getElementById("upload-birth-certificate")?.files?.[0];

    if (birthCertificate) {
      formData.append("birth_certificate", birthCertificate);
    }

    const communityTax =
      document.getElementById("upload-cedula")?.files?.[0];

    if (communityTax) {
      formData.append(
        "community_tax_certificate",
        communityTax
      );
    }

    const signature =
      document.getElementById("upload-signature")?.files?.[0];

    if (signature) {
      formData.append("signature", signature);
    }

    const verificationPhoto =
      document.getElementById(
        "upload-verification"
      )?.files?.[0];

    if (verificationPhoto) {
      formData.append(
        "verification_photo",
        verificationPhoto
      );
    }

    let requestUrl = "";
    let requestMethod = "";

    if (isDuplicateUpdate) {

      requestUrl =
        "https://osca-backend.onrender.com/api/applications/duplicate/verified/" +
        encodeURIComponent(
          duplicateSessionId
        );

      requestMethod = "PUT";

    } else if (isPendingEdit) {

      requestUrl =
        "https://osca-backend.onrender.com/api/applications/" +
        encodeURIComponent(
          applicationId
        );

      requestMethod = "PUT";

    } else {

      requestUrl =
        "https://osca-backend.onrender.com/api/applications/register";

      requestMethod = "POST";
    }

    const response = await fetch(requestUrl, {
      method: requestMethod,
      body: formData
    });

    const responseText =
      await response.text();

    let result;

    try {
      result = responseText
        ? JSON.parse(responseText)
        : {};
    } catch (error) {

      console.error(
        "Backend returned non-JSON response:",
        {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          body: responseText
        }
      );

      throw new Error(
        "The server returned an invalid response. " +
        "Please check the backend logs."
      );
    }

    if (
      response.status === 409 &&
      result.duplicate === true
    ) {
      return result;
    }

    if (!response.ok) {
      throw new Error(
        result.message ||
        (
          isPendingEdit
            ? "Unable to save application changes."
            : "Registration failed."
        )
      );
    }

    return result;
  };

  const requiredConsents = [
    document.getElementById('consent-1'),
    document.getElementById('consent-2'),
    document.getElementById('consent-3'),
    document.getElementById('consent-4'),
    document.getElementById('consent-5')
  ].filter(Boolean);
  const consentError = document.getElementById('consent-error');

  const showInlineError = function (message) {
    if (!consentError) {
      showSuccessNotification(message);
      return;
    }

    consentError.textContent = message;
    consentError.hidden = false;
  };

  const hideInlineError = function () {
    if (!consentError) {
      return;
    }
    consentError.hidden = true;
  };

  const invalidClassName = 'field-invalid';

  const markFieldInvalid = function (fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) {
      return;
    }
    field.classList.add(invalidClassName);
  };

  const clearFieldInvalid = function (fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) {
      return;
    }
    field.classList.remove(invalidClassName);
  };

  const clearAllInvalidFields = function () {
    document.querySelectorAll('.' + invalidClassName).forEach(function (field) {
      field.classList.remove(invalidClassName);
    });
  };

  const validateRequiredFields = function () {
    clearAllInvalidFields();

    const requiredFields = [
      { id: 'surname', label: 'Surname' },
      { id: 'firstname', label: 'First name' },
      { id: 'dob', label: 'Date of birth' },
      { id: 'sex', label: 'Sex' },
      { id: 'civil-status', label: 'Civil status' },
      { id: 'address', label: 'House No. & Street Name' },
      { id: 'barangay', label: 'Barangay / District' },
      { id: 'education', label: 'Educational attainment' },
      { id: 'contact-number', label: 'Contact number' }
    ];

    const missingField = requiredFields.find(function (field) {
      return getInputValue(field.id) === '';
    });

    if (missingField) {
      markFieldInvalid(missingField.id);
      showInlineError('Please complete required field: ' + missingField.label + '.');
      const targetField = document.getElementById(missingField.id);
      if (targetField) {
        targetField.focus();
      }
      return false;
    }

    const ageValue = getInputValue('age');
    if (ageValue !== '' && parseInteger(ageValue) === null) {
      markFieldInvalid('age');
      showInlineError('Please enter a valid age.');
      const ageField = document.getElementById('age');
      if (ageField) {
        ageField.focus();
      }
      return false;
    }

    const contactValue = getInputValue('contact-number');
    if (contactValue !== '' && !/^\d{7,15}$/.test(contactValue)) {
      markFieldInvalid('contact-number');
      showInlineError('Please enter a valid contact number (7 to 15 digits).');
      const contactField = document.getElementById('contact-number');
      if (contactField) {
        contactField.focus();
      }
      return false;
    }

    const allConsentsChecked = requiredConsents.length === 5 && requiredConsents.every(function (checkbox) {
      return checkbox.checked;
    });

    if (!allConsentsChecked) {
      showInlineError('Please confirm all required statements before submitting the application.');
      return false;
    }

    const verificationInput =
      document.getElementById(
        "upload-verification"
      );

    const faceVerified =
      verificationInput?.dataset.faceVerified ===
      "true";

    if (!faceVerified) {
      showInlineError(
        "Please complete face verification before submitting your application."
      );

      const verificationSection =
        document.getElementById(
          "open-face-camera"
        );

      if (verificationSection) {
        verificationSection.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }

      return false;
    }

    hideInlineError();
    return true;
  };

  // Disable submit until all required consents are checked
  const updateSubmitState = function () {
    if (requiredConsents.length !== 5) {
      submitButton.disabled = false;
      return;
    }

    const anyUnchecked = requiredConsents.some(function (cb) { return !cb.checked; });
    submitButton.disabled = anyUnchecked;
  };

  requiredConsents.forEach(function (cb) {
    cb.addEventListener('change', function () {
      updateSubmitState();
      if (requiredConsents.every(function (checkbox) { return checkbox.checked; })) {
        hideInlineError();
      }
    });
  });

  const requiredFieldIds = [
    'surname',
    'firstname',
    'dob',
    'age',
    'sex',
    'civil-status',
    'address',
    'barangay',
    'education',
    'contact-number'
  ];

  requiredFieldIds.forEach(function (fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) {
      return;
    }

    const eventName = field.tagName === 'SELECT' ? 'change' : 'input';
    field.addEventListener(eventName, function () {
      clearFieldInvalid(fieldId);
      if (consentError && !consentError.hidden) {
        hideInlineError();
      }
    });
  });

  // initialize
  updateSubmitState();

  submitButton.addEventListener("click", function () {
    if (!validateRequiredFields()) {
      return;
    }

    const params =
      new URLSearchParams(window.location.search);

    const mode = params.get("mode");
    const existingApplicationId = params.get("id");

    const isPendingEdit =
      mode === "edit" &&
      Boolean(existingApplicationId);

    const isRequestEdit =
      mode === "request-edit" &&
      Boolean(existingApplicationId);

    const duplicateSessionId =
      params.get("session");

    const isDuplicateUpdate =
      mode === "duplicate-update" &&
      Boolean(duplicateSessionId);
    
    const confirmationTitle =
      isPendingEdit || isDuplicateUpdate
        ? "Save Changes?"
        : isRequestEdit
          ? "Confirm Changes?"
          : "Submit Application?";

    const confirmationMessage =
      isPendingEdit || isDuplicateUpdate
        ? "Are you sure you want to save the changes made to this application?"
        : isRequestEdit
          ? "Are you sure the information is correct? These changes will only be saved when you submit your ID request."
          : "Are you sure you want to submit this application? Please confirm that all information is correct before submitting.";

    showConfirmationModal(
      confirmationTitle,
      confirmationMessage,
      async function () {
        submitButton.disabled = true;

        const originalText =
          submitButton.textContent;

        submitButton.textContent =
          isPendingEdit || isDuplicateUpdate
            ? "Saving..."
            : isRequestEdit
              ? "Processing..."
              : "Submitting...";

        try {
          if (isRequestEdit) {
            const temporaryPayload =
              collectAllPayloads();

            sessionStorage.setItem(
              "pendingRequestApplicationId",
              existingApplicationId
            );

            sessionStorage.setItem(
              "pendingRequestApplicationChanges",
              JSON.stringify(temporaryPayload)
            );

            await saveRequestEditFiles(
              existingApplicationId
            );

            window.location.href =
              "trackstatus.html?id=" +
              encodeURIComponent(existingApplicationId) +
              "&step=3";

            return;
          }

          const attemptedApplicationDraft =
            collectAllPayloads();

          const result =
            await saveApplication();

          if (
            !isPendingEdit &&
            result?.duplicate === true
          ) {
            const updateSessionId =
              result.verificationSessions?.updateExisting;

            if (!updateSessionId) {
              throw new Error(
                "Unable to prepare the existing record update."
              );
            }

            sessionStorage.setItem(
              "duplicateUpdateDraftSession",
              updateSessionId
            );

            sessionStorage.setItem(
              "duplicateUpdateDraft",
              JSON.stringify(
                attemptedApplicationDraft
              )
            );

            await saveRequestEditFiles(
              updateSessionId
            );

            showDuplicateRecordModal(
              result.verificationSessions
            );

            return;
          }

          if (isDuplicateUpdate) {

            const existingApplicationId =
              result?.applicationId;

            if (!existingApplicationId) {
              throw new Error(
                "The record was updated, but the Application ID was not returned."
              );
            }

            sessionStorage.removeItem(
              "duplicateUpdateSession"
            );

            sessionStorage.removeItem(
              "duplicateUpdateDraftSession"
            );

            sessionStorage.removeItem(
              "duplicateUpdateDraft"
            );

            await clearRequestEditFiles(
              duplicateSessionId
            );

            showSuccessNotification(
              "Your existing information has been updated successfully.\n\n" +

              "A request for an updated Senior Citizen ID has also been submitted.\n\n" +

              "Application ID: " +
              existingApplicationId +
              "\n\n" +

              "Please take note of this Application ID. You will need it to track your application and ID request.",

              function () {
                window.location.href =
                  "trackstatus.html?id=" +
                  encodeURIComponent(
                    existingApplicationId
                  );
              }
            );

            return;
          }

          if (isPendingEdit) {
            const returnedApplicationId =
              result?.application?.application_id ||
              existingApplicationId;

            showSuccessNotification(
              "Your application changes have been saved successfully.",
              function () {
                window.location.href =
                  "trackstatus.html?id=" +
                  encodeURIComponent(returnedApplicationId) +
                  "&step=2";
              }
            );

            return;
          }

          const newApplicationId =
            result?.application?.application_id;

          if (!newApplicationId) {
            throw new Error(
              "The application was submitted, but the Application ID was not returned."
            );
          }

          sessionStorage.removeItem(
            "applicationFormAccess"
          );

          showSuccessNotification(
            "Your application has been submitted successfully.\n\n" +
            "Application ID: " +
            newApplicationId +
            "\n\n" +
            "Please take note of this Application ID. You will need it to track the status of your application.",
            function () {
              window.location.href =
                "index.html";
            }
          );

        } catch (error) {
          const message =
            error && error.message
              ? error.message
              : "Unknown error";

          showErrorNotification(
            (
              isPendingEdit
                ? "Saving failed: "
                : isRequestEdit
                  ? "Unable to keep changes: "
                  : ""
            ) + message
          );

        } finally {
          submitButton.disabled = false;
          submitButton.textContent =
            originalText;
        }
      }
    );
  });
}

function setupDisclaimerPage() {
  const consentCheckbox = document.getElementById("consent-checkbox");
  const continueButton = document.getElementById("continue-btn");
  const disclaimerError = document.getElementById("disclaimer-error");

  if (!consentCheckbox || !continueButton) {
    return;
  }

  const showDisclaimerError = function (message) {
    if (disclaimerError) {
      disclaimerError.textContent = message;
      disclaimerError.hidden = false;
    }
  };

  const hideDisclaimerError = function () {
    if (disclaimerError) {
      disclaimerError.textContent = "";
      disclaimerError.hidden = true;
    }
  };

  const hasCaptchaResponse = function () {
    return typeof window.grecaptcha !== "undefined" &&
      typeof window.grecaptcha.getResponse === "function" &&
      window.grecaptcha.getResponse().length > 0;
  };

  const updateContinueState = function () {
    const captchaReady = hasCaptchaResponse();
    continueButton.disabled = !(consentCheckbox.checked && captchaReady);
  };

  window.handleRecaptchaSuccess = function () {
    sessionStorage.setItem("applicationFormAccess", "verified");

    hideDisclaimerError();
    updateContinueState();
  };

  window.handleRecaptchaExpired = function () {
    sessionStorage.removeItem("applicationFormAccess");

    showDisclaimerError("CAPTCHA has expired. Please complete it again.");
    updateContinueState();
  };

  consentCheckbox.addEventListener("change", function () {
    hideDisclaimerError();
    updateContinueState();
  });

  continueButton.addEventListener("click", function () {
    if (!consentCheckbox.checked) {
      showDisclaimerError("Please confirm the disclaimer before continuing.");
      return;
    }

    if (!hasCaptchaResponse()) {
      showDisclaimerError("Please complete the CAPTCHA before proceeding.");
      return;
    }

    hideDisclaimerError();
    window.location.href = "form.html";
  });

  updateContinueState();
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

function normalizeApplicationId(value) {
  return (value || "").trim();
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
  const requestIdButton = document.getElementById("request-id-button");
  const editApplicationStep2 = document.getElementById("edit-application-step2");
  const editApplicationStep3 = document.getElementById("edit-application-step3");
  const closeButtons = [
    document.getElementById("close-verification-page-entry"),
    document.getElementById("close-verification-page-entry-secondary"),
    document.getElementById("close-verification-page-status"),
    document.getElementById("close-verification-page-status-secondary")
  ].filter(Boolean);

  if (!entryStep || !statusStep || !entryForm || !inputField || !verifiedId || !verifiedApplicant || !verificationNote) {
    return;
  }

  const API_BASE_URL = 'https://osca-backend.onrender.com/api/applications';
  let currentApplicationId = "";
  let currentApplicationStatus = "";

  const toTimelineStatus = function (statusValue) {
    const normalized = (statusValue || '').trim().toLowerCase();

    if (normalized === 'released') {
      return 'ready for release';
    }
    if (normalized === 'rejected') {
      return 'pending';
    }

    return normalized;
  };

  const getDefaultNoteByStatus = function (statusValue) {
    const normalized = toTimelineStatus(statusValue);

    if (normalized === 'pending') {
      return 'Your application has been received and is waiting for review.';
    }
    if (normalized === 'under review') {
      return 'Your application is currently being reviewed by the OSCA team.';
    }
    if (normalized === 'in process') {
      return 'Your application is currently being processed by the assigned staff.';
    }
    if (normalized === 'ready for release') {
      return 'Your ID is ready for release. Please visit the OSCA office with a valid ID.';
    }
    if (normalized === 'completed') {
      return 'Your application process has been completed successfully.';
    }

    return 'Your application status has been updated.';
  };

  const fetchVerificationRecord = async function (applicationId) {
    const response = await fetch(`${API_BASE_URL}/status/${encodeURIComponent(applicationId)}`);
    const result = await response.json();

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(result.message || 'Unable to check application status.');
    }

    return {
      applicant: result.applicant,
      status: toTimelineStatus(result.status),
      note: result.note,

      hasActiveIdRequest:
        Boolean(result.has_active_id_request),

      idRequest:
        result.id_request || null
    };
  };

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
    currentApplicationId = applicationId;
    verifiedApplicant.textContent = record.applicant;
    verificationNote.textContent = getDefaultNoteByStatus(record.status);
    if (
      record.hasActiveIdRequest &&
      record.idRequest
    ) {
      const requestStatus =
        record.idRequest.status || "Pending";

      verificationNote.textContent =
        "Your ID request has already been submitted. " +
        "Current request status: " +
        requestStatus +
        ".";
    }

    currentApplicationStatus =
      String(record.status || "").trim().toLowerCase();

    const canEditFromStep2 =
      currentApplicationStatus === "pending";

    const canRequestId =
      currentApplicationStatus === "completed" &&
      !record.hasActiveIdRequest;

    const canEditFromStep3 =
      currentApplicationStatus === "completed" &&
      !record.hasActiveIdRequest;

    if (editApplicationStep2) {
      editApplicationStep2.hidden = !canEditFromStep2;
      editApplicationStep2.disabled = !canEditFromStep2;
    }

    if (requestIdButton) {
      requestIdButton.hidden = !canRequestId;
      requestIdButton.disabled = !canRequestId;
    }

    if (editApplicationStep3) {
      editApplicationStep3.hidden = !canEditFromStep3;
      editApplicationStep3.disabled = !canEditFromStep3;
    }

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

    const returnParams =
      new URLSearchParams(window.location.search);

    const requestedStep =
      returnParams.get("step");

    if (
      requestedStep === "3" &&
      currentApplicationStatus === "completed" &&
      requestIdButton
    ) {
      window.setTimeout(function () {
        requestIdButton.click();
      }, 0);
    }
  };

  const closeVerificationPage = function () {
    window.location.href = "index.html";
  };

  closeButtons.forEach(function (button) {
    button.addEventListener("click", closeVerificationPage);
  });

  entryForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const applicationId = normalizeApplicationId(inputField.value);

    if (!applicationId) {
      if (errorLabel) {
        errorLabel.textContent = "Please enter your Application ID.";
      }
      inputField.focus();
      return;
    }

    const submitButton = entryForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : '';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Checking...';
    }

    let record = null;
    try {
      record = await fetchVerificationRecord(applicationId);
    } catch (error) {
      if (errorLabel) {
        errorLabel.textContent = "Unable to check status right now. Please try again.";
      }
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
      return;
    }

    if (!record) {
      if (errorLabel) {
        errorLabel.textContent = "Invalid ID or ID not existing.";
      }
      inputField.focus();
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
      return;
    }

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }

    showStatusStep(applicationId, record);
  });

  editApplicationStep2?.addEventListener("click", function () {

    if (!currentApplicationId) {
      return;
    }

    window.location.href =
      "form.html?mode=edit&id=" +
      encodeURIComponent(currentApplicationId) +
      "&return=step2";

  });

  editApplicationStep3?.addEventListener("click", function () {

    if (!currentApplicationId) {
      return;
    }

    const reasonSelect =
      document.getElementById("request-reason-select");

    const otherReasonInput =
      document.getElementById("other-reason-input");

    sessionStorage.setItem(
      "pendingRequestReasonApplicationId",
      currentApplicationId
    );

    sessionStorage.setItem(
      "pendingRequestReason",
      reasonSelect?.value || ""
    );

    sessionStorage.setItem(
      "pendingRequestOtherReason",
      otherReasonInput?.value || ""
    );

    window.location.href =
      "form.html?mode=request-edit&id=" +
      encodeURIComponent(currentApplicationId) +
      "&return=step3";

  });

  showEntryStep();

  const returnParams =
    new URLSearchParams(window.location.search);

  const returnApplicationId =
    returnParams.get("id");

  if (returnApplicationId) {
    inputField.value =
      returnApplicationId;

    entryForm.requestSubmit();
  }
}

function setupRequestIdModal() {
  const requestIdButton =
    document.getElementById("request-id-button");

  const requestIdModal =
    document.getElementById("verify-request-id-modal");

  const statusStep =
    document.getElementById("verify-step-status");

  const requestIdForm =
    document.getElementById("request-id-form");

  const reasonSelect =
    document.getElementById("request-reason-select");

  const otherReasonWrapper =
    document.getElementById("other-reason-wrapper");

  const otherReasonInput =
    document.getElementById("other-reason-input");

  const requestReasonError =
    document.getElementById("request-reason-error");

  const closeRequestIdModalButton =
    document.getElementById("close-request-id-modal");

  const cancelRequestIdButton =
    document.getElementById("cancel-request-id");

  if (
    !requestIdButton ||
    !requestIdModal ||
    !statusStep ||
    !requestIdForm ||
    !reasonSelect ||
    !closeRequestIdModalButton ||
    !cancelRequestIdButton
  ) {
    return;
  }

  const showRequestIdModal = function () {
    statusStep.hidden = true;
    requestIdModal.hidden = false;

    const applicationId =
      (
        document.getElementById(
          "verified-application-id"
        )?.textContent ||
        new URLSearchParams(
          window.location.search
        ).get("id") ||
        ""
      ).trim();

    const savedApplicationId =
      sessionStorage.getItem(
        "pendingRequestReasonApplicationId"
      );

    const savedReason =
      sessionStorage.getItem(
        "pendingRequestReason"
      );

    const savedOtherReason =
      sessionStorage.getItem(
        "pendingRequestOtherReason"
      );

    if (
      savedApplicationId === applicationId &&
      savedReason
    ) {
      reasonSelect.value = savedReason;

      if (savedReason === "other") {
        if (otherReasonWrapper) {
          otherReasonWrapper.style.display = "block";
        }

        if (otherReasonInput) {
          otherReasonInput.value =
            savedOtherReason || "";
        }

      } else {
        if (otherReasonWrapper) {
          otherReasonWrapper.style.display = "none";
        }

        if (otherReasonInput) {
          otherReasonInput.value = "";
        }
      }

    } else {
      reasonSelect.value = "";

      if (otherReasonInput) {
        otherReasonInput.value = "";
      }

      if (otherReasonWrapper) {
        otherReasonWrapper.style.display = "none";
      }
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
    
    if (otherReasonWrapper) {
      otherReasonWrapper.style.display = "none";
    }
    if (requestReasonError) {
      requestReasonError.textContent = "";
    }
  };

  reasonSelect.addEventListener("change", function () {

    const applicationId =
      (
        document.getElementById(
          "verified-application-id"
        )?.textContent ||
        new URLSearchParams(
          window.location.search
        ).get("id") ||
        ""
      ).trim();

    if (applicationId) {
      sessionStorage.setItem(
        "pendingRequestReasonApplicationId",
        applicationId
      );
    }

    sessionStorage.setItem(
      "pendingRequestReason",
      reasonSelect.value || ""
    );

    if (otherReasonWrapper && otherReasonInput) {
      if (reasonSelect.value === "other") {
        otherReasonWrapper.style.display = "block";

        window.setTimeout(function () {
          otherReasonInput.focus();
        }, 0);

      } else {
        otherReasonWrapper.style.display = "none";
        otherReasonInput.value = "";

        sessionStorage.removeItem(
          "pendingRequestOtherReason"
        );
      }
    }
  });

  if (otherReasonInput) {
  otherReasonInput.addEventListener(
    "input",
    function () {
      sessionStorage.setItem(
        "pendingRequestOtherReason",
        otherReasonInput.value
      );
    }
  );
}

  requestIdButton.addEventListener("click", showRequestIdModal);

  closeRequestIdModalButton.addEventListener("click", closeRequestIdModal);
  cancelRequestIdButton.addEventListener(
    "click",
    async function () {
      const applicationId =
        (
          document.getElementById(
            "verified-application-id"
          )?.textContent ||
          new URLSearchParams(
            window.location.search
          ).get("id") ||
          ""
        ).trim();

      await clearPendingIdRequest(
        applicationId
      );

      reasonSelect.value = "";

      if (otherReasonInput) {
        otherReasonInput.value = "";
      }

      if (otherReasonWrapper) {
        otherReasonWrapper.style.display =
          "none";
      }

      if (requestReasonError) {
        requestReasonError.textContent = "";
      }

      closeRequestIdModal();
    }
  );

  requestIdForm.addEventListener(
    "submit",
    async function (event) {
      event.preventDefault();

      if (requestReasonError) {
        requestReasonError.textContent = "";
      }

      const selectedReason =
        reasonSelect.value;

      if (!selectedReason) {
        if (requestReasonError) {
          requestReasonError.textContent =
            "Please select a reason.";
        }

        return;
      }

      let reason = "";
      let otherReason = null;

      if (selectedReason === "lost") {
        reason = "Lost";

      } else if (selectedReason === "damage") {
        reason = "Damage";

      } else if (selectedReason === "change") {
        reason = "Change Address";

      } else if (selectedReason === "other") {
        reason = "Other";

        otherReason =
          otherReasonInput
            ? otherReasonInput.value.trim()
            : "";

        if (!otherReason) {
          if (requestReasonError) {
            requestReasonError.textContent =
              "Please specify your reason.";
          }

          return;
        }
      }

      /*
      * Get the Application ID currently being tracked.
      */
      const verifiedApplicationId =
        document.getElementById(
          "verified-application-id"
        );

      const applicationId =
        (
          verifiedApplicationId?.textContent ||
          new URLSearchParams(
            window.location.search
          ).get("id") ||
          ""
        ).trim();

      if (!applicationId) {
        if (requestReasonError) {
          requestReasonError.textContent =
            "Unable to determine the Application ID.";
        }

        return;
      }

      /*
      * Get temporary form edits, if the applicant used
      * Edit Application on Step 3.
      */
      let applicationChanges = null;

      const savedApplicationId =
        sessionStorage.getItem(
          "pendingRequestApplicationId"
        );

      const savedChanges =
        sessionStorage.getItem(
          "pendingRequestApplicationChanges"
        );

      if (
        savedApplicationId === applicationId &&
        savedChanges
      ) {
        try {
          applicationChanges =
            JSON.parse(savedChanges);
        } catch (error) {
          console.error(
            "Unable to read temporary application changes:",
            error
          );

          if (requestReasonError) {
            requestReasonError.textContent =
              "Unable to read your edited application data. Please edit the application again.";
          }

          return;
        }
      }

      const submitRequestButton =
        requestIdForm.querySelector(
          'button[type="submit"]'
        );

      const originalText =
        submitRequestButton
          ? submitRequestButton.textContent
          : "Submit Request";

      if (submitRequestButton) {
        submitRequestButton.disabled = true;
        submitRequestButton.textContent =
          "Submitting...";
      }

      try {
        /*
        * Retrieve replacement files temporarily stored
        * when the applicant clicked OK on the edit page.
        */
        const temporaryFiles =
          await getRequestEditFiles(
            applicationId
          );

        const formData =
          new FormData();

        const requestPayload = {
          applicationChanges:
            applicationChanges,
          reason: reason,
          otherReason: otherReason
        };

        formData.append(
          "payload",
          JSON.stringify(requestPayload)
        );

        Object.entries(
          temporaryFiles
        ).forEach(function ([fileType, file]) {
          if (file) {
            formData.append(
              fileType,
              file
            );
          }
        });

        const response =
          await fetch(
            "https://osca-backend.onrender.com/api/applications/" +
            encodeURIComponent(applicationId) +
            "/id-request",
            {
              method: "POST",
              body: formData
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
            "Unable to submit ID request."
          );
        }

        /*
        * Only clear temporary edits AFTER the backend
        * confirms everything was saved successfully.
        */
        sessionStorage.removeItem(
          "pendingRequestApplicationId"
        );

        sessionStorage.removeItem(
          "pendingRequestApplicationChanges"
        );

        sessionStorage.removeItem(
          "pendingRequestReasonApplicationId"
        );

        sessionStorage.removeItem(
          "pendingRequestReason"
        );

        sessionStorage.removeItem(
          "pendingRequestOtherReason"
        );

        await clearRequestEditFiles(
          applicationId
        );

        showSuccessNotification(
          "Your ID request has been submitted successfully.\n\n" +
          "Reason: " +
          (
            reason === "Other"
              ? "Other: " + otherReason
              : reason
          ) +
          "\n\nOSCA will process your request.",
          function () {
            window.location.href =
              "trackstatus.html?id=" +
              encodeURIComponent(applicationId);
          }
        );

      } catch (error) {
        console.error(
          "ID request submission error:",
          error
        );

        if (requestReasonError) {
          requestReasonError.textContent =
            error.message ||
            "Unable to submit ID request.";
        }

      } finally {
        if (submitRequestButton) {
          submitRequestButton.disabled =
            false;

          submitRequestButton.textContent =
            originalText;
        }
      }
    }
  );
}

function showNotification(message, type = "success", onClose) {
  const overlay = document.getElementById("success-notification-overlay");
  const notification = document.getElementById("success-notification");
  const notificationMessage = document.getElementById("notification-message");
  const notificationTitle = document.getElementById("notification-title");
  const notificationIcon = document.getElementById("notification-icon");
  const closeButton = document.getElementById("notification-close-button");

  if (!overlay || !notification || !notificationMessage || !notificationTitle || !notificationIcon || !closeButton) {
    if (typeof onClose === 'function') {
      try { onClose(); } catch (e) { /* ignore */ }
    }
    return;
  }

  notificationIcon.classList.remove(
      "notification-icon-success",
      "notification-icon-error"
  );

  if (type === "error") {
      notificationTitle.textContent = "Submission Failed";
      notificationIcon.textContent = "⚠";
      notificationIcon.classList.add("notification-icon-error");
  }
  else {
      notificationTitle.textContent = "Submission Successful";
      notificationIcon.textContent = "✔";
      notificationIcon.classList.add("notification-icon-success");
  }

  notificationMessage.textContent = message;
  overlay.hidden = false;
  notification.hidden = false;

  const closeNotification = function () {
    overlay.hidden = true;
    notification.hidden = true;
    if (typeof onClose === 'function') {
      try { onClose(); } catch (e) { /* ignore */ }
    }
  };

  closeButton.addEventListener("click", closeNotification, { once: true });
  overlay.addEventListener("click", function (ev) {
    if (ev.target === overlay) {
      closeNotification();
    }
  }, { once: true });

}

function showSuccessNotification(message, onClose) {
    showNotification(message, "success", onClose);
}

function showErrorNotification(message, onClose) {
    showNotification(message, "error", onClose);
}

async function verifyDuplicateApplicant(sessionId) {
  const surname =
    document.getElementById("surname")?.value.trim() || "";

  const firstName =
    document.getElementById("firstname")?.value.trim() || "";

  const middleName =
    document.getElementById("middlename")?.value.trim() || "";

  const dateOfBirth =
    document.getElementById("dob")?.value || "";

  const response = await fetch(
    "https://osca-backend.onrender.com/api/applications/duplicate/verify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sessionId,
        surname,
        firstName,
        middleName,
        dateOfBirth
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message ||
      "Identity verification failed."
    );
  }

  return result;
}

function showDuplicateRecordModal(
  verificationSessions
) {
  const overlay =
    document.getElementById(
      "duplicate-record-overlay"
    );

  const modal =
    document.getElementById(
      "duplicate-record-modal"
    );
  
  const updateSessionId =
    verificationSessions?.updateExisting;

  const recoverSessionId =
    verificationSessions?.recoverApplicationId;

  if (
    !updateSessionId ||
    !recoverSessionId
  ) {
    showErrorNotification(
      "Unable to start secure verification. Please try again."
    );

    return;
  }

  const updateButton =
    document.getElementById(
      "duplicate-update-button"
    );

  const recoverButton =
    document.getElementById(
      "duplicate-recover-button"
    );

  const cancelButton =
    document.getElementById(
      "duplicate-cancel-button"
    );

  if (
    !overlay ||
    !modal ||
    !updateButton ||
    !recoverButton ||
    !cancelButton
  ) {
    return;
  }

  overlay.hidden = false;
  modal.hidden = false;

  cancelButton.onclick = async function () {

    await clearDuplicateUpdateDraft(
      updateSessionId
    );

    overlay.hidden = true;
    modal.hidden = true;
  };

  updateButton.onclick = async function () {
    const originalText =
      updateButton.textContent;

    try {
      updateButton.disabled = true;
      recoverButton.disabled = true;
      cancelButton.disabled = true;

      updateButton.textContent =
        "Verifying...";

      const result =
        await verifyDuplicateApplicant(
          updateSessionId
        );

      if (!result.verified) {
        throw new Error(
          "Identity verification failed."
        );
      }

      overlay.hidden = true;
      modal.hidden = true;

      sessionStorage.setItem(
        "duplicateUpdateSession",
        updateSessionId
      );

      window.location.href =
        "form.html?mode=duplicate-update&session=" +
        encodeURIComponent(updateSessionId);

    } catch (error) {
      showErrorNotification(
        error.message ||
        "Unable to verify your identity."
      );

    } finally {
      updateButton.disabled = false;
      recoverButton.disabled = false;
      cancelButton.disabled = false;

      updateButton.textContent =
        originalText;
    }
  };

  recoverButton.onclick = async function () {
    const originalText =
      recoverButton.textContent;

    try {
      updateButton.disabled = true;
      recoverButton.disabled = true;
      cancelButton.disabled = true;

      recoverButton.textContent =
        "Verifying...";

      const result =
        await verifyDuplicateApplicant(
          recoverSessionId
        );

      if (!result.verified) {
        throw new Error(
          "Identity verification failed."
        );
      }

      const recoveryResponse =
        await fetch(
          "https://osca-backend.onrender.com/api/applications/duplicate/recover/" +
          encodeURIComponent(
            recoverSessionId
          )
        );

      const recoveryResult =
        await recoveryResponse.json();

      if (!recoveryResponse.ok) {
        throw new Error(
          recoveryResult.message ||
          "Unable to recover your Application ID."
        );
      }

      const recoveredApplicationId =
        recoveryResult.applicationId;

      if (!recoveredApplicationId) {
        throw new Error(
          "Application ID was not returned."
        );
      }

      await clearDuplicateUpdateDraft(
        updateSessionId
      );

      overlay.hidden = true;
      modal.hidden = true;

      showSuccessNotification(
        "Identity verified successfully.\n\n" +

        "Your Application ID is:\n" +
        recoveredApplicationId +
        "\n\n" +

        "Please take note of this Application ID. You will need it to track the status of your application.",

        function () {
          window.location.href =
            "trackstatus.html?id=" +
            encodeURIComponent(
              recoveredApplicationId
            );
        }
      );

    } catch (error) {
      showErrorNotification(
        error.message ||
        "Unable to verify your identity."
      );

    } finally {
      updateButton.disabled = false;
      recoverButton.disabled = false;
      cancelButton.disabled = false;

      recoverButton.textContent =
        originalText;
    }
  };
}

document.addEventListener("DOMContentLoaded", function () {
  protectApplicationForm();
  setupFormMode();
  blockNonNumericInput();
  wireFamilyRowButton();
  setupSpecifyForCheckboxes();
  setupSpecifyForSelects();
  loadApplicationForEditing();
  setupUploadButtons();
  setupFaceCamera();
  setupApplicationDate();
  setupApplicantAge();
  setupFormCancelButton();
  setupDisclaimerPage();
  setupHomepageNavigation();
  setupVerificationPage();
  setupRequestIdModal();
  setupFormSubmitConfirmation();
});

function setupOscaChatbot() {

  const chatbot =
    document.getElementById(
      "osca-chatbot"
    );

  if (!chatbot) {
    return;
  }

  const toggle =
    document.getElementById(
      "chatbot-toggle"
    );

  const closeButton =
    document.getElementById(
      "chatbot-close"
    );

  const windowElement =
    document.getElementById(
      "chatbot-window"
    );

  const form =
    document.getElementById(
      "chatbot-form"
    );

  const input =
    document.getElementById(
      "chatbot-input"
    );

  const sendButton =
    document.getElementById(
      "chatbot-send"
    );

  const messages =
    document.getElementById(
      "chatbot-messages"
    );

  const typing =
    document.getElementById(
      "chatbot-typing"
    );

  const suggestions =
    document.getElementById(
      "chatbot-suggestions"
    );


  let previousInteractionId = null;


  function openChatbot() {
    windowElement.hidden = false;

    chatbot.classList.add(
      "chat-open"
    );

    toggle.setAttribute(
      "aria-expanded",
      "true"
    );

    setTimeout(function () {
      input.focus();
    }, 100);
  }


  function closeChatbot() {
    stopChatbotSpeech();
    windowElement.hidden = true;

    chatbot.classList.remove(
      "chat-open"
    );

    toggle.setAttribute(
      "aria-expanded",
      "false"
    );
  }

  let currentlySpeakingButton = null;

  function stopChatbotSpeech() {
    if (
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }

    if (currentlySpeakingButton) {
      const icon =
        currentlySpeakingButton.querySelector(
          ".material-symbols-outlined"
        );

      if (icon) {
        icon.textContent = "volume_up";
      }

      currentlySpeakingButton = null;
    }
  }


  function speakChatbotMessage(
    text,
    button
  ) {
    if (
      !("speechSynthesis" in window)
    ) {
      console.warn(
        "Text-to-speech is not supported by this browser."
      );

      return;
    }

    /*
    * Clicking the same button while it is
    * speaking stops the speech.
    */
    if (
      currentlySpeakingButton === button &&
      window.speechSynthesis.speaking
    ) {
      stopChatbotSpeech();
      return;
    }


    stopChatbotSpeech();


    const utterance =
      new SpeechSynthesisUtterance(
        text
      );


    /*
    * Basic Filipino detection.
    *
    * This lets us choose Filipino pronunciation
    * for common Filipino responses.
    */
    const filipinoPattern =
      /\b(ang|mga|po|opo|para|kung|kailangan|maaari|senior|pagkuha|walang|may|hindi|ako|kayo|inyong|lamang)\b/i;

    const isFilipino =
      filipinoPattern.test(text);


    utterance.lang =
      isFilipino
        ? "fil-PH"
        : "en-PH";


    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;


    const icon =
      button.querySelector(
        ".material-symbols-outlined"
      );


    utterance.onstart = function () {
      currentlySpeakingButton =
        button;

      if (icon) {
        icon.textContent =
          "stop_circle";
      }
    };


    utterance.onend = function () {
      if (
        currentlySpeakingButton ===
        button
      ) {
        currentlySpeakingButton =
          null;

        if (icon) {
          icon.textContent =
            "volume_up";
        }
      }
    };


    utterance.onerror = function (
      event
    ) {
      console.error(
        "Text-to-speech error:",
        event
      );

      if (
        currentlySpeakingButton ===
        button
      ) {
        currentlySpeakingButton =
          null;
      }

      if (icon) {
        icon.textContent =
          "volume_up";
      }
    };


    window.speechSynthesis.speak(
      utterance
    );
  }

  function addMessage(
    text,
    sender
  ) {

    const message =
      document.createElement("div");

    message.className =
      "chat-message " +
      (
        sender === "user"
          ? "user-message"
          : "bot-message"
      );


    if (sender !== "user") {

      const avatar =
        document.createElement("div");

      avatar.className =
        "chat-message-avatar";

      const icon =
        document.createElement("span");

      icon.className =
        "material-symbols-outlined";

      icon.textContent =
        "smart_toy";

      avatar.appendChild(icon);

      message.appendChild(
        avatar
      );
    }


    const content =
      document.createElement("div");

    content.className =
      "chat-message-content";


    const bubble =
      document.createElement("div");

    bubble.className =
      "chat-bubble";

    /*
     * textContent is intentional.
     * Do not use innerHTML with AI output.
     */
    bubble.textContent =
      text;


    content.appendChild(
      bubble
    );


    /*
    * Only Gemini/assistant responses
    * get a text-to-speech button.
    */
    if (sender !== "user") {

      const actions =
        document.createElement("div");

      actions.className =
        "chat-message-actions";


      const speakButton =
        document.createElement(
          "button"
        );

      speakButton.type =
        "button";

      speakButton.className =
        "chat-speak-button";

      speakButton.setAttribute(
        "aria-label",
        "Read response aloud"
      );

      speakButton.title =
        "Read aloud";


      const speakIcon =
        document.createElement(
          "span"
        );

      speakIcon.className =
        "material-symbols-outlined";

      speakIcon.textContent =
        "volume_up";


      speakButton.appendChild(
        speakIcon
      );


      speakButton.addEventListener(
        "click",
        function () {

          speakChatbotMessage(
            text,
            speakButton
          );

        }
      );


      actions.appendChild(
        speakButton
      );

      content.appendChild(
        actions
      );
    }


    message.appendChild(
      content
    );

    messages.appendChild(
      message
    );


    messages.scrollTop =
      messages.scrollHeight;
  }


  function setLoading(
    loading
  ) {

    typing.hidden =
      !loading;

    sendButton.disabled =
      loading;

    input.disabled =
      loading;

    if (loading) {
      messages.scrollTop =
        messages.scrollHeight;
    }
  }


  toggle.addEventListener(
    "click",
    function () {

      if (windowElement.hidden) {
        openChatbot();
      } else {
        closeChatbot();
      }
    }
  );


  closeButton.addEventListener(
    "click",
    closeChatbot
  );


  input.addEventListener(
    "input",
    function () {

      this.style.height =
        "auto";

      this.style.height =
        Math.min(
          this.scrollHeight,
          120
        ) + "px";
    }
  );


  input.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        form.requestSubmit();
      }
    }
  );


  async function sendChatbotMessage(
    message
  ) {

    const cleanMessage =
      String(message || "").trim();

    if (!cleanMessage) {
      return;
    }


    addMessage(
      cleanMessage,
      "user"
    );


    /*
    * Hide the initial suggestions once
    * the conversation begins.
    */
    if (suggestions) {
      suggestions.hidden = true;
    }


    setLoading(true);


    try {

      const response =
        await fetch(
          "https://osca-backend.onrender.com/api/chatbot/message",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              message:
                cleanMessage,

              previousInteractionId:
                previousInteractionId
            })
          }
        );


      const result =
        await response.json();


      if (!response.ok) {
        throw new Error(
          result.message ||
          "Unable to get a response."
        );
      }


      if (
        result.interactionId
      ) {
        previousInteractionId =
          result.interactionId;
      }


      addMessage(
        result.reply,
        "bot"
      );


    } catch (error) {

      console.error(
        "Chatbot error:",
        error
      );

      addMessage(
        "I'm sorry, I couldn't respond right now. Please try again.",
        "bot"
      );

    } finally {

      setLoading(false);

      input.focus();
    }
  }


  /*
  * Typed message
  */
  form.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      const message =
        input.value.trim();


      if (!message) {
        return;
      }


      input.value = "";

      input.style.height =
        "auto";


      await sendChatbotMessage(
        message
      );
    }
  );


  /*
  * Suggested questions
  */
  if (suggestions) {

    suggestions.addEventListener(
      "click",
      async function (event) {

        const button =
          event.target.closest(
            ".chatbot-suggestion"
          );


        if (!button) {
          return;
        }


        const question =
          button.dataset.question;


        if (!question) {
          return;
        }


        await sendChatbotMessage(
          question
        );
      }
    );

  }
}


document.addEventListener(
  "DOMContentLoaded",
  setupOscaChatbot
);