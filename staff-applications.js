/* Staff Applications workspace. Requires the staff applications API and authorized staff session. */
(function () {
  "use strict";
  const API_BASE = (window.OSCA_API_BASE || "https://osca-backend.onrender.com/api").replace(/\/$/, "");
  const API = API_BASE + "/applications";
  const statuses = ["Pending", "Under Review", "In Process", "Ready for Release", "Completed", "Rejected"];
  const STAFF_MODE = true;
  const authTypes = [
    { key: "valid_id", label: "Valid government ID" },
    { key: "birth_certificate", label: "Birth certificate" },
    { key: "community_tax_certificate", label: "Community tax certificate" }
  ];
  const state = { applications: [], selectedId: null, detail: null, dirty: false, loading: false };
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const normalize = (value) => String(value || "").trim().toLowerCase();
  const statusClass = (value) => normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const fullName = (app) => [app.first_name, app.middle_name, app.surname].filter(Boolean).join(" ").trim() || "Unnamed applicant";
  const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part.charAt(0)).join("").toUpperCase() || "SC";
  const asDate = (value) => {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" });
  };
  const appStatus = (app) => app.status || app.application_status || "Pending";
  function notify(message, error) {
    let toast = $("toast");
    if (!toast) { toast = document.createElement("div"); toast.id = "toast"; toast.className = "toast"; toast.setAttribute("role", "status"); document.body.appendChild(toast); }
    toast.textContent = message;
    toast.className = error ? "toast error" : "toast";
    toast.hidden = false;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => { toast.hidden = true; }, 4500);
  }
  function notice(message, kind) {
    const n = $("notice");
    n.textContent = message;
    n.className = "notice" + (kind ? " " + kind : "");
    n.hidden = false;
  }
  async function request(url, options) {
    const response = await fetch(url, Object.assign({ headers: { "Accept": "application/json" }, credentials: "include" }, options || {}));
    const type = response.headers.get("content-type") || "";
    let body = {};
    if (type.includes("application/json")) body = await response.json();
    else if (!response.ok) throw new Error("Request failed (" + response.status + "). Check the staff API deployment.");
    if (!response.ok || body.success === false) throw new Error(body.message || "The request could not be completed.");
    return body;
  }
  async function loadApplications() {
    if (state.loading) return;
    state.loading = true;
    $("applicationRows").innerHTML = '<tr><td colspan="6" class="table-message"><span class="loading-spinner"></span>Loading applications…</td></tr>';
    try {
      const body = await request(API + "/staff");
      state.applications = Array.isArray(body.data) ? body.data : (Array.isArray(body.applications) ? body.applications : []);
      renderRows();
      renderStats();
      $("lastUpdated").textContent = "Updated " + new Date().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
      $("notice").hidden = true;
    } catch (error) {
      $("applicationRows").innerHTML = '<tr><td colspan="6" class="table-message">Unable to load applications. ' + escapeHtml(error.message) + '</td></tr>';
      $("resultCount").textContent = "No data loaded";
      notice(error.message + " Confirm the staff API is deployed and your staff session has access.", "error");
    } finally { state.loading = false; }
  }
  function renderStats() {
    const apps = state.applications;
    $("totalCount").textContent = apps.length.toLocaleString("en-PH");
    $("pendingCount").textContent = apps.filter(a => normalize(appStatus(a)) === "pending").length.toLocaleString("en-PH");
    $("reviewCount").textContent = apps.filter(a => normalize(appStatus(a)) === "under review").length.toLocaleString("en-PH");
    $("completedCount").textContent = apps.filter(a => normalize(appStatus(a)) === "completed").length.toLocaleString("en-PH");
  }
  function docSummary(app) {
    const docs = Number(app.authenticated_documents || app.authenticatedDocuments || 0);
    const total = Number(app.required_documents || 3);
    const pending = Number(app.pending_documents == null ? Math.max(total - docs, 0) : app.pending_documents);
    return { docs, total, pending };
  }
  function filteredApps() {
    const q = normalize($("searchInput").value);
    const status = normalize($("statusFilter").value);
    const sort = $("sortFilter").value;
    let result = state.applications.filter(app => {
      const name = fullName(app).toLowerCase();
      const id = String(app.application_id || "").toLowerCase();
      return (!q || name.includes(q) || id.includes(q)) && (!status || normalize(appStatus(app)) === status);
    });
    if (sort === "oldest") result.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    else if (sort === "name") result.sort((a,b) => fullName(a).localeCompare(fullName(b)));
    else result.sort((a,b) => new Date(b.created_at || b.application_date || 0) - new Date(a.created_at || a.application_date || 0));
    return result;
  }
  function renderRows() {
    const apps = filteredApps();
    $("resultCount").textContent = "Showing " + apps.length + " of " + state.applications.length + " applications";
    if (!apps.length) {
      $("applicationRows").innerHTML = '<tr><td colspan="6" class="table-message">No applications match these filters.</td></tr>';
      return;
    }
    $("applicationRows").innerHTML = apps.map(app => {
      const name = fullName(app), s = appStatus(app), docs = docSummary(app);
      const when = app.created_at || app.application_date || app.date_submitted;
      const checkClass = docs.pending ? "check-count needs" : "check-count";
      return '<tr><td><div class="applicant-cell"><div class="avatar">' + escapeHtml(initials(name)) + '</div><div><div class="applicant-name">' + escapeHtml(name) + '</div><div class="applicant-meta">' + escapeHtml(app.sex || app.gender || "Applicant") + (app.barangay_district ? " · " + escapeHtml(app.barangay_district) : "") + '</div></div></div></td><td class="id-cell">' + escapeHtml(app.application_id || "—") + '</td><td><span class="date-cell">' + escapeHtml(asDate(when)) + '</span></td><td><span class="' + checkClass + '">' + docs.docs + " / " + docs.total + '</span><span class="applicant-meta"> verified</span></td><td><span class="status ' + statusClass(s) + '">' + escapeHtml(s) + '</span></td><td><button type="button" class="review-link" data-review="' + escapeHtml(app.application_id) + '">Review →</button></td></tr>';
    }).join("");
  }
  async function openDetail(id) {
    if (!id) return;
    state.selectedId = id;
    state.dirty = false;
    $("detailTitle").textContent = "Loading application…";
    $("detailSubtitle").textContent = id;
    $("detailLoading").hidden = false;
    $("detailLoading").textContent = "Loading full application record…";
    $("detailContent").hidden = true;
    $("drawerBackdrop").hidden = false;
    $("detailDrawer").classList.add("open");
    $("detailDrawer").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    try {
      const body = await request(API + "/staff/" + encodeURIComponent(id));
      state.detail = body.data || body.application || body;
      renderDetail();
    } catch (error) {
      $("detailLoading").textContent = error.message;
      notify("Unable to open application details: " + error.message, true);
    }
  }
  function detailApp() { return state.detail && (state.detail.application || state.detail.applicant || state.detail); }
  function renderDetail() {
    const d = state.detail || {}, a = detailApp() || {};
    const name = fullName(a);
    $("detailTitle").textContent = name;
    $("detailSubtitle").textContent = "Application ID · " + (a.application_id || state.selectedId);
    const fields = [
      ["Application ID", a.application_id], ["Current status", appStatus(a)], ["First name", a.first_name],
      ["Middle name", a.middle_name], ["Surname", a.surname], ["Date of birth", asDate(a.date_of_birth)],
      ["Sex", a.sex || a.gender], ["Civil status", a.civil_status], ["Contact number", a.contact_number || a.phone_number],
      ["Email", a.email], ["Barangay / district", a.barangay_district], ["Address", [a.house_number, a.street, a.barangay_district, a.municipality, a.province].filter(Boolean).join(", ")],
      ["Date submitted", asDate(a.created_at || a.application_date)]
    ];
    $("overviewGrid").innerHTML = fields.filter(pair => pair[1]).map(pair => '<div class="detail-value"><span>' + escapeHtml(pair[0]) + '</span><strong>' + escapeHtml(pair[1]) + '</strong></div>').join("");
    $("newStatus").value = statuses.find(s => normalize(s) === normalize(appStatus(a))) || "Pending";
    renderDocuments(d);
    renderAuthentication(d.documentAuthentications || d.document_authentications || []);
    $("detailLoading").hidden = true;
    $("detailContent").hidden = false;
  }
  function filesRecord(d) { return d.applicationFiles || d.application_files || d.files || {}; }
  function renderDocuments(d) {
    const f = filesRecord(d);
    const items = [
      ["valid_id", "Valid government ID (front)", f.valid_id_signed_url || f.valid_id_url || f.valid_id_url_signed],
      ["valid_id_back", "Valid government ID (back)", f.valid_id_back_signed_url || f.valid_id_back_url],
      ["latest_photo", "Latest photo", f.latest_photo_signed_url || f.latest_photo_url],
      ["birth_certificate", "Birth certificate", f.birth_certificate_signed_url || f.birth_certificate_url],
      ["community_tax_certificate", "Community tax certificate", f.community_tax_certificate_signed_url || f.community_tax_certificate_url],
      ["signature", "Signature", f.signature_signed_url || f.signature_url]
    ];
    $("documentsList").innerHTML = items.map(item => '<div class="document-row"><div><div class="document-title">' + escapeHtml(item[1]) + '</div><span class="document-subtitle">' + (item[2] ? "Uploaded document available" : "No file attached") + '</span></div><div class="document-actions">' + (item[2] ? '<button class="small-button" type="button" data-file-url="' + escapeHtml(item[2]) + '" data-file-name="' + escapeHtml(item[1]) + '">Open file ↗</button>' : '<span class="muted-small">Unavailable</span>') + '</div></div>').join("");
  }
  function renderAuthentication(records) {
    const rows = authTypes.map(type => {
      const rec = records.find(row => row.document_type === type.key) || {};
      const status = rec.authentication_status || "pending";
      return '<div class="auth-item" data-auth-type="' + type.key + '"><div class="auth-head"><strong>' + escapeHtml(type.label) + '</strong><span class="status ' + statusClass(status === "authenticated" ? "Completed" : status === "failed" ? "Rejected" : status === "needs_review" ? "Under Review" : "Pending") + '">' + escapeHtml(status.replace(/_/g, " ")) + '</span></div><div class="auth-controls"><select class="auth-status" aria-label="' + escapeHtml(type.label) + ' authentication status"><option value="pending"' + (status === "pending" ? " selected" : "") + '>Pending</option><option value="authenticated"' + (status === "authenticated" ? " selected" : "") + '>Authenticated</option><option value="needs_review"' + (status === "needs_review" ? " selected" : "") + '>Needs review</option><option value="failed"' + (status === "failed" ? " selected" : "") + '>Failed</option></select><input class="auth-method" maxlength="120" aria-label="Verification method" placeholder="Verification method" value="' + escapeHtml(rec.authentication_method || "") + '"><input class="remarks" maxlength="1000" aria-label="Authentication remarks" placeholder="Remarks (optional)" value="' + escapeHtml(rec.authentication_remarks || "") + '"><button type="button" class="small-button save-auth">Save document result</button></div></div>';
    }).join("");
    $("authenticationList").innerHTML = rows;
  }
  async function saveAuth(button) {
    const row = button.closest(".auth-item");
    const status = row.querySelector(".auth-status").value;
    const method = row.querySelector(".auth-method").value.trim();
    const remarks = row.querySelector(".remarks").value.trim();
    button.disabled = true;
    try {
      await request(API + "/" + encodeURIComponent(state.selectedId) + "/document-authentication", {
        method: "PATCH", headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ documentType: row.dataset.authType, authenticationStatus: status, authenticationMethod: method || null, authenticationRemarks: remarks || null })
      });
      notify("Document authentication saved.");
      await openDetail(state.selectedId);
      await loadApplications();
    } catch (error) { notify(error.message, true); }
    finally { button.disabled = false; }
  }
  async function saveStatus(event) {
    event.preventDefault();
    if (!state.selectedId) return;
    const status = $("newStatus").value, remarks = $("statusRemarks").value.trim(), button = $("saveStatus");
    button.disabled = true; button.textContent = "Saving…";
    try {
      await request(API + "/staff/" + encodeURIComponent(state.selectedId) + "/status", {
        method: "PATCH", headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ status })
      });
      notify("Application status updated.");
      $("statusRemarks").value = "";
      await loadApplications();
      await openDetail(state.selectedId);
    } catch (error) { notify("Unable to update status: " + error.message, true); }
    finally { button.disabled = false; button.textContent = "Save status update"; }
  }
  function closeDetail(force) {
    if (!force && state.dirty) {
      const dialog = $("confirmDialog");
      if (dialog && typeof dialog.showModal === "function") {
        dialog.showModal();
        dialog.addEventListener("close", function once() { dialog.removeEventListener("close", once); if (dialog.returnValue === "close") closeDetail(true); });
        return;
      }
    }
    $("detailDrawer").classList.remove("open");
    $("detailDrawer").setAttribute("aria-hidden", "true");
    $("drawerBackdrop").hidden = true;
    document.body.style.overflow = "";
    state.selectedId = null; state.detail = null; state.dirty = false;
  }
  $("applicationRows").addEventListener("click", (event) => {
    const button = event.target.closest("[data-review]");
    if (button) openDetail(button.dataset.review);
  });
  $("searchInput").addEventListener("input", renderRows);
  $("statusFilter").addEventListener("change", renderRows);
  $("sortFilter").addEventListener("change", renderRows);
  $("refreshButton").addEventListener("click", loadApplications);
  $("refreshTop").addEventListener("click", loadApplications);
  $("closeDrawer").addEventListener("click", () => closeDetail(false));
  $("drawerBackdrop").addEventListener("click", () => closeDetail(false));
  $("statusForm").addEventListener("submit", saveStatus);
  $("authenticationList").addEventListener("click", (event) => {
    const button = event.target.closest(".save-auth");
    if (button) saveAuth(button);
  });
  $("detailContent").addEventListener("click", (event) => {
    const button = event.target.closest("[data-file-url]");
    if (!button) return;
    const url = button.dataset.fileUrl;
    try { const parsed = new URL(url, window.location.href); if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid document URL"); window.open(parsed.href, "_blank", "noopener,noreferrer"); }
    catch (_) { notify("This document link is invalid.", true); }
  });
  $("detailContent").addEventListener("change", (event) => {
    if (event.target.matches(".auth-status,.auth-method,.remarks,#newStatus,#statusRemarks")) state.dirty = true;
  });
  $("confirmDialog").addEventListener("close", () => { if ($("confirmDialog").returnValue === "close") closeDetail(true); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && $("detailDrawer").classList.contains("open")) closeDetail(false); });
  loadApplications();
})();