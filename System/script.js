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
    <td><input type="text" aria-label="Family occupation" /></td>
    <td><input type="number" min="0" aria-label="Family income" /></td>
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
        const specifyInput = label.parentElement ? label.parentElement.nextElementSibling : null;
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

  const collectFamilyRows = function (applicationId) {
    const familyBody = document.getElementById('family-body');
    if (!familyBody) {
      return [];
    }

    return Array.from(familyBody.querySelectorAll('tr')).map(function (row) {
      return {
        application_id: applicationId,
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

  const collectAllPayloads = function (applicationId) {
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
      application_status: 'Pending'
    };

    const membershipsData = {
      application_id: applicationId,
      association_name: toNull(getInputValue('assoc-name')),
      association_address: toNull(getInputValue('assoc-address')),
      association_date: toNull(getInputValue('assoc-date')),
      position: toNull(getInputValue('assoc-position'))
    };

    const personalBackgroundData = {
      application_id: applicationId,
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
      application_id: applicationId,

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
      application_id: applicationId,
      valid_id_url: toNull(document.getElementById('upload-valid-id')?.files?.[0]?.name || ''),
      latest_photo_url: toNull(document.getElementById('upload-latest-photo')?.files?.[0]?.name || ''),
      birth_certificate_url: toNull(document.getElementById('upload-birth-certificate')?.files?.[0]?.name || ''),
      community_tax_certificate_url: toNull(document.getElementById('upload-cedula')?.files?.[0]?.name || ''),
      signature_url: toNull(document.getElementById('upload-signature')?.files?.[0]?.name || ''),
      application_date: toNull(getInputValue('date-application'))
    };

    const confirmationsData = {
      application_id: applicationId,
      info_true: Boolean(document.getElementById('consent-1')?.checked),
      full_knowledge: Boolean(document.getElementById('consent-2')?.checked),
      personal_consent: Boolean(document.getElementById('consent-3')?.checked),
      understand_storage: Boolean(document.getElementById('consent-4')?.checked),
      agree_all: Boolean(document.getElementById('consent-5')?.checked),
      assisted_by: toNull(getInputValue('assisted-by')),
      relation: toNull(getInputValue('relation-registrant'))
    };

    const statusHistoryData = {
      application_id: applicationId,
      status: 'Pending',
      remarks: 'Application submitted from online form.'
    };

    return {
      applicationsData: applicationsData,
      familyRowsData: collectFamilyRows(applicationId),
      membershipsData: membershipsData,
      personalBackgroundData: personalBackgroundData,
      problemsNeedsData: problemsNeedsData,
      applicationFilesData: applicationFilesData,
      confirmationsData: confirmationsData,
      statusHistoryData: statusHistoryData
    };
  };

  const saveApplication = async function (supabaseClient) {
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

  submitButton.addEventListener('click', function () {
    if (!validateRequiredFields()) {
      return;
    }

    showConfirmationModal(
      'Submit Application?',
      'Are you sure you want to submit this application? Please confirm that all information is correct before submitting.',
      async function () {
        const supabaseClient = getSupabaseClient();
        if (!supabaseClient) {
          showSuccessNotification('Submission failed: database connection is not available.');
          return;
        }

        submitButton.disabled = true;
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Submitting...';

        try {
          await saveApplication(supabaseClient);

          // Show styled notification, then redirect when closed
          showSuccessNotification('Your application has been submitted successfully.', function () {
            window.location.href = 'index.html';
          });
        } catch (error) {
          const message = error && error.message ? error.message : 'Unknown error';
          showSuccessNotification('Submission failed: ' + message);
        } finally {
          submitButton.disabled = false;
          submitButton.textContent = originalText;
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
    hideDisclaimerError();
    updateContinueState();
  };

  window.handleRecaptchaExpired = function () {
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
  const closeButtons = [
    document.getElementById("close-verification-page-entry"),
    document.getElementById("close-verification-page-entry-secondary"),
    document.getElementById("close-verification-page-status"),
    document.getElementById("close-verification-page-status-secondary")
  ].filter(Boolean);

  if (!entryStep || !statusStep || !entryForm || !inputField || !verifiedId || !verifiedApplicant || !verificationNote) {
    return;
  }

  const getSupabaseClient = function () {
    return window.supabaseClient || window.supabase || null;
  };

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

    return 'Your application status has been updated.';
  };

  const fetchVerificationRecord = async function (applicationId) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      throw new Error('Database connection is not available.');
    }

    const { data: applicationRow, error: applicationError } = await supabaseClient
      .from('applications')
      .select('application_id, first_name, middle_name, surname, application_status')
      .eq('application_id', applicationId)
      .maybeSingle();

    if (applicationError) {
      throw applicationError;
    }

    if (!applicationRow) {
      return null;
    }

    const { data: statusHistoryRows, error: statusHistoryError } = await supabaseClient
      .from('application_status_history')
      .select('status, remarks, updated_at')
      .eq('application_id', applicationId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (statusHistoryError) {
      throw statusHistoryError;
    }

    const latestStatus = statusHistoryRows && statusHistoryRows.length > 0 ? statusHistoryRows[0] : null;
    const statusText = (latestStatus && latestStatus.status) || applicationRow.application_status || 'Pending';
    const status = toTimelineStatus(statusText);
    const applicant = [applicationRow.first_name, applicationRow.middle_name, applicationRow.surname]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Applicant';

    return {
      applicant: applicant,
      status: status,
      note: (latestStatus && latestStatus.remarks) || getDefaultNoteByStatus(statusText)
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

function showSuccessNotification(message, onClose) {
  const overlay = document.getElementById("success-notification-overlay");
  const notification = document.getElementById("success-notification");
  const notificationMessage = document.getElementById("notification-message");
  const closeButton = document.getElementById("notification-close-button");

  if (!overlay || !notification || !notificationMessage || !closeButton) {
    if (typeof onClose === 'function') {
      try { onClose(); } catch (e) { /* ignore */ }
    }
    return;
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

  window.setTimeout(function () {
    if (!notification.hidden) {
      closeNotification();
    }
  }, 4500);
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
  setupDisclaimerPage();
  setupHomepageNavigation();
  setupVerificationPage();
  setupRequestIdModal();
  setupFormSubmitConfirmation();
});
