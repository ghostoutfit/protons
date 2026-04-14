// ============================================================
//  NOTEPAD API  —  v2/sheets-api.js
//
//  CORS strategy:
//    ALL requests → GET to Apps Script doGet with URL params
//    Apps Script 302-redirects POST→GET dropping the body, so everything uses GET.
//    GET requests survive the redirect with params intact; CORS headers are included.
//
//  Apps Script actions (all handled by doGet):
//    appendNote  — write one row to NotepadRawData tab
//    getNotes    — return all rows as JSON
//    updateNote  — patch fields on an existing row by id
//
//  Notes tab column order (must match Apps Script appendRow order):
//    0  id
//    1  student_id
//    2  timestamp
//    3  sim_version
//    4  sim_state        (JSON string)
//    5  screenshot_b64   (base64 PNG, small thumbnail)
//    6  text
//    7  is_public        (TRUE / FALSE)
//    8  promoted         (TRUE / FALSE, teacher-set)
//
//  updateNote snippet — add this to your doPost:
//  ─────────────────────────────────────────────
//  if (data.action === 'updateNote') {
//    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('NotepadRawData');
//    const ids = sh.getRange('A:A').getValues().flat();
//    const row = ids.indexOf(data.id) + 1;          // 1-indexed
//    if (row < 2) return ContentService.createTextOutput('not found');
//    if (data.text      !== undefined) sh.getRange(row, 7).setValue(data.text);
//    if (data.isPublic  !== undefined) sh.getRange(row, 8).setValue(data.isPublic);
//    if (data.promoted  !== undefined) sh.getRange(row, 9).setValue(data.promoted);
//    return ContentService.createTextOutput('ok');
//  }
// ============================================================

'use strict';

const SHEETS = (() => {

  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx876hooVliEwFIO0wNO3qZ5FyN0UVUgt1iexEVl8O0vQhem6qPU7WG1LqPpqvf8BU/exec';
  const SHEET_ID   = '1fCuMnkMkP8dTd4URBqla0-yv_xk9MbeNs2gFbvs1urk';

  // ── gviz read (GET, no auth, works for any publicly viewable sheet) ──
  async function _gvizRows(sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}` +
                `/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sheet read error: ${res.status}`);
    const text = await res.text();
    // Strip JSONP wrapper: /*O_o*/\ngoogle.visualization.Query.setResponse({…});
    const json = JSON.parse(text.replace(/^[^{]*/, '').replace(/\);\s*$/, ''));
    return (json.table.rows || []).map(r =>
      (r.c || []).map(c => (c && c.v != null) ? String(c.v) : '')
    );
  }

  // ── Apps Script GET (works for both reads and writes) ───────
  //  POST redirects (302) silently drop the body — the browser changes
  //  POST→GET on redirect and Apps Script never sees postData.contents.
  //  GET requests survive the redirect with URL params intact.
  async function _scriptGet(params) {
    const url = `${SCRIPT_URL}?${new URLSearchParams(params)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Script error: ${res.status}`);
    const text = await res.text();
    if (text === 'ok') return { ok: true };
    try { return JSON.parse(text); } catch { return text; }
  }

  // ── Screenshot helper ────────────────────────────────────────
  //  Downscale a canvas to ≤320px wide before base64-encoding.
  //  Full-res PNG as base64 can exceed Google Sheets' 50,000-char cell limit.
  function canvasToSmallBase64(sourceCanvas, maxWidth = 320) {
    const scale = Math.min(1, maxWidth / sourceCanvas.width);
    const w = Math.round(sourceCanvas.width  * scale);
    const h = Math.round(sourceCanvas.height * scale);
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    tmp.getContext('2d').drawImage(sourceCanvas, 0, 0, w, h);
    return tmp.toDataURL('image/jpeg', 0.75);  // JPEG at 75% quality ≈ much smaller
  }

  // ── parseConfig ──────────────────────────────────────────────
  //  Returns { classCode, className, roster: [{id, name}, …] }
  async function parseConfig() {
    const rows = await _gvizRows('Config');
    const kv = {};
    let rosterStart = -1;
    for (let i = 0; i < rows.length; i++) {
      const [key, val] = rows[i];
      if (key === 'StudentCode') { rosterStart = i + 1; break; }
      if (key) kv[key] = val || '';
    }
    const roster = [];
    for (let i = rosterStart; i < rows.length && rosterStart >= 0; i++) {
      const [id, name] = rows[i];
      if (id && name) roster.push({ id, name });
    }
    return {
      classCode: kv['ClassCode']        || '',
      className: kv['ClassDisplayName'] || '',
      roster,
    };
  }

  // ── getAllNotes ───────────────────────────────────────────────
  async function getAllNotes() {
    const rows = await _gvizRows('NotepadRawData');
    // Skip header row (detected by first cell being the literal string 'id')
    const data = (rows.length > 0 && rows[0][0] === 'id') ? rows.slice(1) : rows;
    return data
      .filter(r => r[0])  // skip blank rows
      .map(r => ({
        id:             r[0] || '',
        student_id:     r[1] || '',
        timestamp:      r[2] || '',
        sim_version:    r[3] || '',
        sim_state:      r[4] || '',
        screenshot_b64: r[5] || '',
        text:           r[6] || '',
        is_public:      r[7] === 'TRUE',
        promoted:       r[8] === 'TRUE',
      }));
  }

  // ── readStudentNotes ─────────────────────────────────────────
  async function readStudentNotes(studentId) {
    const all = await getAllNotes();
    return all
      .filter(n => n.student_id === studentId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  // ── readPublicNotes ──────────────────────────────────────────
  async function readPublicNotes({ promotedOnly = false } = {}) {
    const all = await getAllNotes();
    return all
      .filter(n => n.is_public && (!promotedOnly || n.promoted))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  // ── appendNote ───────────────────────────────────────────────
  //  Screenshots stay local only — base64 is too large for URL params.
  function appendNote(note) {
    return _scriptGet({
      action:     'appendNote',
      id:         note.id,
      studentId:  note.student_id,
      timestamp:  note.timestamp,
      simVersion: note.sim_version || '',
      simState:   note.sim_state   || '',
      text:       note.text        || '',
      isPublic:   !!note.is_public,
    });
  }

  // ── updateNote ───────────────────────────────────────────────
  function updateNote(noteId, updates) {
    const params = { action: 'updateNote', id: noteId };
    if (updates.text      !== undefined) params.text     = updates.text;
    if (updates.is_public !== undefined) params.isPublic = updates.is_public;
    if (updates.promoted  !== undefined) params.promoted = updates.promoted;
    return _scriptGet(params);
  }

  // ── generateId ───────────────────────────────────────────────
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  return {
    parseConfig,
    getAllNotes,
    readStudentNotes,
    readPublicNotes,
    appendNote,
    updateNote,
    canvasToSmallBase64,
    generateId,
    SCRIPT_URL,
    SHEET_ID,
  };

})();

if (typeof module !== 'undefined') module.exports = SHEETS;
