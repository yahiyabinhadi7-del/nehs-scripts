/* NEHS app logic - loaded after nehs-data.js (needs const NEHS_DATA). */
let currentPage = 1;
let itemsPerPage = 9;
let currentFilteredList = [];
let userCoords = null;
const ADMIN_WHATSAPP_NUMBER = "919177583840";
const telanganaDistricts = [
"Adilabad", "Bhadradri Kothagudem", "Hanamkonda", "Hyderabad", "Jagtial",
"Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar",
"Khammam", "Kumuram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial",
"Medak", "Medchal Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda",
"Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla",
"Ranga Reddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad",
"Wanaparthy", "Warangal Rural", "Yadadri Bhuvanagiri"
];
function processNehsData(rows) {
return rows.map(function (r) {
const specs = (r[4] || 'General & Multispecialty').split('|');
const contacts = [];
if (r[5] || r[6]) contacts.push({ role: 'Mitra', name: r[5] || '', phone: r[6] || '' });
if (r[7] || r[8]) contacts.push({ role: 'MEDCO', name: r[7] || '', phone: r[8] || '' });
return {
sno: r[0],
name: r[1],
district: r[2],
state: "Telangana",
type: r[3] ? "Government Hospital" : "Corporate Hospital",
specialty: specs[0],
specialties: specs,
contacts: contacts,
mitraName: r[5] || '',
phone: r[6] || r[8] || '',
cover: "Cashless",
address: r[9] || '',
lat: (typeof r[10] === 'number') ? r[10] : null,
lng: (typeof r[11] === 'number') ? r[11] : null
};
});
}
const NH_SOURCES = {
"NEHS Card": { label: "NEHS", data: NEHS_DATA, process: processNehsData }
};
// NEHS data is processed only the first time it is read (lazy), then cached.
const cardHospitalsMap = {};
Object.keys(NH_SOURCES).forEach(function (scheme) {
var cache = null;
Object.defineProperty(cardHospitalsMap, scheme, {
enumerable: true,
get: function () {
if (!cache) {
cache = NH_SOURCES[scheme].process(NH_SOURCES[scheme].data.rows);
cache.forEach(function (h) { nhNormalizeHospital(h, scheme); });
}
return cache;
}
});
});
const cardDetailsMap = {
"NEHS Card": {
rules: "Completely cashless medical treatment and digital pre-authorisation workflow via the Employees Health Care Trust and official portal (nehs.telangana.gov.in) for state government employees, pensioners, and dependent family members across empanelled hospitals.",
packages: "1,816 medical and surgical packages aligned with CGHS standards covering specialized treatments, IPD, and chronic care, plus outpatient chronic care at 37 designated Wellness Centres.",
corrections: "Serving employee details are updated through DDOs via the IFMIS-HRMS system. Pensioner updates are handled via Sub-Treasury Offices (STO), APPO, or MeeSeva applications submitted to the Aarogyasri Trust.",
documents: "1. Employee ID Card / Pensioner PPO Copy\n2. Aadhaar details via DDO/CFMS\n3. Passport-size photos\n4. Birth Certificate (for children under 5)\n5. Spouse ID (for dual-employee cases)",
}
};
function updateDistricts(skipRender) {
const districtSel = document.getElementById('districtSelect');
if(districtSel) {
let currentVal = districtSel.value || "Hyderabad";
let options = '<option value="">-- Select District --</option>';
telanganaDistricts.forEach(dist => {
options += `<option value="${dist}" ${dist === currentVal ? 'selected' : ''}>${dist}</option>`;
});
districtSel.innerHTML = options;
}
if (!skipRender) checkReadyState();
}
function checkReadyState() {
if(!document.getElementById('healthCardSelect')) return;
const card = document.getElementById('healthCardSelect').value;
const dist = document.getElementById('districtSelect').value;
const hospType = document.getElementById('hospitalTypeSelect').value;
if(card && dist && hospType) {
displayHubInfo();
}
}
function displayHubInfo() {
if(!document.getElementById('healthCardSelect')) return;
const card = document.getElementById('healthCardSelect').value;
const dist = document.getElementById('districtSelect').value || "Hyderabad";
const hospType = document.getElementById('hospitalTypeSelect').value || "All";
if(!card) {
nhToast("Please select a 'Health Card' from the dropdown first!");
document.getElementById('healthCardSelect').focus();
return;
}
document.getElementById('resHospitalTypeName').innerHTML = hospType === "All" ? "All Hospital Types" : hospType;
document.getElementById('resDistrictName').innerHTML = dist + " District";
document.getElementById('selectedCardBadge').innerHTML = card;
const details = cardDetailsMap[card] || cardDetailsMap["NEHS Card"];
document.getElementById('resCashlessRules').innerHTML = details.rules;
document.getElementById('resPackages').innerHTML = details.packages;
document.getElementById('resCorrections').innerHTML = details.corrections;
document.getElementById('resDocuments').innerHTML = details.documents.replace(/\n/g, '<br/>');
resetPageAndRender();
document.getElementById('resultCard').style.display = 'block';
document.getElementById('guidelinesSection').style.display = 'block';
}
function resetPageAndRender() {
currentPage = 1;
filterHospitals();
renderHospitalList();
}
function resetAllFilters() {
const cardSel = document.getElementById('healthCardSelect');
const typeSel = document.getElementById('hospitalTypeSelect');
const specSel = document.getElementById('specializationFilter');
const searchInput = document.getElementById('globalSearch');
if(cardSel) cardSel.value = "NEHS Card";
updateDistricts();
if(typeSel) typeSel.value = "";
if(specSel) specSel.value = "All";
if(searchInput) searchInput.value = "";
userCoords = null;
const resCard = document.getElementById('resultCard');
const guideSec = document.getElementById('guidelinesSection');
if(resCard) resCard.style.display = 'none';
if(guideSec) guideSec.style.display = 'none';
window.scrollTo({ top: 0, behavior: 'smooth' });
}
function calculateDistance(lat1, lon1, lat2, lon2) {
const R = 6371;
const dLat = (lat2 - lat1) * (Math.PI / 180);
const dLon = (lon2 - lon1) * (Math.PI / 180);
const a =
Math.sin(dLat / 2) * Math.sin(dLat / 2) +
Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
Math.sin(dLon / 2) * Math.sin(dLon / 2);
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
return R * c;
}
const NH_DISTRICT_CENTRE = {
"Adilabad":[19.67,78.53],"Bhadradri Kothagudem":[17.55,80.62],"Hanamkonda":[18.00,79.58],"Hyderabad":[17.385,78.487],
"Jagtial":[18.79,78.91],"Jangaon":[17.72,79.15],"Jayashankar Bhupalpally":[18.43,79.93],"Jogulamba Gadwal":[16.23,77.80],
"Kamareddy":[18.32,78.34],"Karimnagar":[18.44,79.13],"Khammam":[17.25,80.15],"Kumuram Bheem Asifabad":[19.36,79.28],
"Mahabubabad":[17.60,80.00],"Mahabubnagar":[16.74,77.99],"Mancherial":[18.87,79.46],"Medak":[18.05,78.26],
"Medchal Malkajgiri":[17.63,78.48],"Mulugu":[18.19,80.00],"Nagarkurnool":[16.48,78.32],"Nalgonda":[17.06,79.27],
"Narayanpet":[16.74,77.50],"Nirmal":[19.10,78.34],"Nizamabad":[18.67,78.09],"Peddapalli":[18.62,79.37],
"Rajanna Sircilla":[18.39,78.83],"Ranga Reddy":[17.25,78.20],"Sangareddy":[17.62,78.09],"Siddipet":[18.10,78.85],
"Suryapet":[17.14,79.62],"Vikarabad":[17.34,77.90],"Wanaparthy":[16.36,78.06],"Warangal Rural":[17.98,79.60],
"Yadadri Bhuvanagiri":[17.51,78.89]
};
function nhDistanceKm(h) {
if (!userCoords) return undefined;
if (h.lat != null && h.lng != null) return calculateDistance(userCoords.lat, userCoords.lng, h.lat, h.lng);
const c = NH_DISTRICT_CENTRE[h.district];
return c ? calculateDistance(userCoords.lat, userCoords.lng, c[0], c[1]) : undefined;
}
function findHospitalsNearMe() {
if (!navigator.geolocation) {
nhToast("Your browser does not support GPS / location.");
return;
}
if (window.isSecureContext === false) {
nhToast("GPS works only on a secure (https) page.");
return;
}
const cardSel = document.getElementById('healthCardSelect');
if (!cardSel.value) cardSel.value = "NEHS Card";
updateDistricts();
document.getElementById('hospitalTypeSelect').value = "All";
nhToast("Detecting your location...");
function done(position) {
userCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
const ds = document.getElementById('districtSelect');
if (ds) ds.value = "";
displayHubInfo();
const dn = document.getElementById('resDistrictName');
if (dn) dn.innerHTML = "Near You (All Districts)";
nhToast("Location found - hospitals sorted nearest first.");
}
function fail(error) {
userCoords = null;
let msg = "Could not get your location. Showing the normal list.";
if (error && error.code === 1) msg = "Location permission is blocked. Allow location for this site in your browser settings and tap GPS again.";
else if (error && error.code === 2) msg = "Location is unavailable. Turn on GPS / location services and try again.";
else if (error && error.code === 3) msg = "Location request timed out. Please try again.";
nhToast(msg);
displayHubInfo();
}
navigator.geolocation.getCurrentPosition(done, function (e1) {
if (e1 && e1.code === 1) { fail(e1); return; }
navigator.geolocation.getCurrentPosition(done, fail, { timeout: 20000, maximumAge: 0, enableHighAccuracy: true });
}, { timeout: 8000, maximumAge: 300000, enableHighAccuracy: false });
}
const NH_SPEC_ICON = {
'Eye': 'fa-eye',
'Dental': 'fa-tooth',
'Maternity & Pediatric': 'fa-baby',
'Oncology': 'fa-ribbon',
'Nephrology': 'fa-droplet',
'Cardiology': 'fa-heart-pulse',
'Orthopedics': 'fa-bone',
'General & Multispecialty': 'fa-stethoscope'
};
const NH_KIND_ICON = {
eye: 'fa-eye', dental: 'fa-tooth', mat: 'fa-baby', onc: 'fa-ribbon', neph: 'fa-droplet',
card: 'fa-heart-pulse', orth: 'fa-bone', gov: 'fa-building-columns', gen: 'fa-hospital'
};
const NH_LS = { fav: 'nehsSavedHospitals_v1', view: 'nehsViewMode_v1' };
var nhMem = {};
function nhEsc(v) {
return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
});
}
function nhDigits(p) { return String(p || '').replace(/\D/g, ''); }
function nhIsMobile(d) { return /^[6-9]\d{9}$/.test(d); }
function nhIsDialable(d) { return nhIsMobile(d) || /^0\d{9,11}$/.test(d); }
function nhPhoneText(p) {
const d = nhDigits(p);
return nhIsMobile(d) ? d.slice(0, 5) + ' ' + d.slice(5) : String(p || '').trim();
}
function nhHasUsefulAddress(a) { return /[A-Za-z]{4,}/.test(String(a || '')); }
function nhLoad(k, d) {
try {
const v = window.localStorage.getItem(k);
if (v != null) return JSON.parse(v);
} catch (e) { /* ignore */ }
return (k in nhMem) ? nhMem[k] : d;
}
function nhStore(k, v) {
nhMem[k] = v;
try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ }
}
var nhSaved = new Set((function () { const a = nhLoad(NH_LS.fav, []); return Array.isArray(a) ? a : []; })());
var nhState = { view: nhLoad(NH_LS.view, 'card') === 'list' ? 'list' : 'card', savedOnly: false };
itemsPerPage = nhState.view === 'list' ? 12 : 9;
function nhIsSaved(key) { return nhSaved.has(key); }
function nhSavedCount(scheme) {
const list = cardHospitalsMap[scheme] || [];
let n = 0;
for (let i = 0; i < list.length; i++) if (nhSaved.has(list[i].key)) n++;
return n;
}
function nhCurrentScheme() {
const el = document.getElementById('healthCardSelect');
return (el && el.value && cardHospitalsMap[el.value]) ? el.value : 'NEHS Card';
}
function nhFindByKey(key) {
const list = cardHospitalsMap[String(key).split('|')[0]] || [];
for (let i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
return null;
}
var nhToastTimer = null;
function nhToast(msg) {
let t = document.getElementById('nhToast');
if (!t) {
t = document.createElement('div');
t.id = 'nhToast';
t.className = 'nh-toast';
t.setAttribute('role', 'status');
t.setAttribute('aria-live', 'polite');
document.body.appendChild(t);
}
t.textContent = msg;
t.classList.add('is-on');
clearTimeout(nhToastTimer);
nhToastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2600);
}
function nhNormalizeHospital(h, scheme) {
if (!Array.isArray(h.contacts)) {
h.contacts = (h.mitraName || h.phone)
? [{ role: 'Mitra', name: h.mitraName || '', phone: h.phone || '' }]
: [];
}
if (!Array.isArray(h.specialties) || !h.specialties.length) h.specialties = [h.specialty || 'General & Multispecialty'];
if (h.specialties.indexOf('Eye & Dental') !== -1) {
var nhDentalRe = /dent|oral|orthodont|maxillo|smile|tooth/i, nhEyeRe = /eye|netra|nayan|ophthal|vision|lasik|retina|sight|drishti|optic|cornea|laser|kanti|chakshu/i;
var nhSplit = nhDentalRe.test(h.name || '') ? ['Dental'] : (nhEyeRe.test(h.name || '') ? ['Eye'] : ['Eye', 'Dental']);
var nhOut = [];
h.specialties.forEach(function (x) {
(x === 'Eye & Dental' ? nhSplit : [x]).forEach(function (y) { if (nhOut.indexOf(y) === -1) nhOut.push(y); });
});
h.specialties = nhOut;
}
h.specialty = h.specialties[0];
h.district = h.district || 'Hyderabad';
h.address = h.address || '';
h.lat = (typeof h.lat === 'number') ? h.lat : null;
h.lng = (typeof h.lng === 'number') ? h.lng : null;
h.scheme = scheme;
h.key = scheme + '|' + h.name + '|' + h.district + '|' + (h.sno != null ? h.sno : '');
h.searchText = [h.name, h.address, h.district, h.type, h.specialties.join(' '), (h.services || []).join(' ')]
.concat(h.contacts.map(function (c) { return (c.name || '') + ' ' + nhDigits(c.phone); }))
.join(' ').toLowerCase();
return h;
}
function nhKind(h) {
const s = h.specialty;
if (s === 'Dental') return 'dental';
if (s === 'Eye') return 'eye';
if (s === 'Maternity & Pediatric') return 'mat';
if (s === 'Oncology') return 'onc';
if (s === 'Nephrology') return 'neph';
if (s === 'Cardiology') return 'card';
if (s === 'Orthopedics') return 'orth';
return h.type === 'Government Hospital' ? 'gov' : 'gen';
}
function nhMergeContacts(list) {
const items = (list || []).filter(function (c) { return c && (c.name || c.phone); });
if (items.length === 2) {
const a = items[0], b = items[1];
const an = (a.name || '').trim().toLowerCase(), bn = (b.name || '').trim().toLowerCase();
if (nhDigits(a.phone) && nhDigits(a.phone) === nhDigits(b.phone) && (an === bn || !an || !bn)) {
return [{ role: a.role + ' & ' + b.role, name: a.name || b.name, phone: a.phone }];
}
}
return items;
}
function nhVCardText(h) {
const esc = function (s) {
return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
};
const list = nhMergeContacts(h.contacts).filter(function (c) { return nhIsDialable(nhDigits(c.phone)); });
if (!list.length) return '';
return list.map(function (c) {
const d = nhDigits(c.phone);
const tel = nhIsMobile(d) ? '+91' + d : d;
const person = (c.name || '').replace(/^Mr\/Ms\s+/i, '').trim();
const fn = (person ? person + ' - ' : '') + c.role + ', ' + h.name;
return ['BEGIN:VCARD', 'VERSION:3.0', 'N:;' + esc(fn) + ';;;', 'FN:' + esc(fn), 'ORG:' + esc(h.name),
'TITLE:' + esc(nhSchemeLabel(h) + ' ' + c.role), 'TEL;TYPE=' + (nhIsMobile(d) ? 'CELL' : 'WORK') + ',VOICE:' + tel,
'NOTE:' + esc('Empanelled hospital - ' + h.district + ', Telangana'), 'END:VCARD'].join('\r\n');
}).join('\r\n') + '\r\n';
}
function nhSaveContacts(h) {
const text = nhVCardText(h);
if (!text) { nhToast('No phone number available to save'); return; }
const name = nhSchemeLabel(h) + '-' + h.name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) + '.vcf';
try {
const blob = new Blob([text], { type: 'text/vcard;charset=utf-8' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url; a.download = name; a.style.display = 'none';
document.body.appendChild(a); a.click();
setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 1500);
nhToast('Contact file downloaded - open it to add to your phone contacts');
} catch (e) {
nhToast('Could not create the contact file on this browser');
}
}
function nhSchemeLabel() { return 'NEHS'; }
function nhContactHTML(c, h) {
const d = nhDigits(c.phone);
const isMedco = /medco/i.test(c.role) && !/mitra/i.test(c.role);
const who = c.name || c.role;
const tel = nhIsDialable(d) ? (nhIsMobile(d) ? 'tel:+91' + d : 'tel:' + d) : '';
const wa = nhIsMobile(d)
? 'https://wa.me/91' + d + '?text=' + encodeURIComponent('Namaste, I need help regarding ' + nhSchemeLabel(h) + ' cashless treatment at ' + h.name + '.')
: '';
let num = '';
if (tel) num = '<a class="nh-c-num" href="' + tel + '">' + nhEsc(nhPhoneText(c.phone)) + '</a>';
else if (d) num = '<span class="nh-c-num nh-c-num--plain" title="This number looks incomplete">' + nhEsc(c.phone) + '</span>';
else num = '<span class="nh-c-num nh-c-num--plain">Number not listed</span>';
let btns = '';
if (tel) {
btns = '<div class="nh-c-btns">' +
'<a class="nh-ibtn nh-ibtn--call" href="' + tel + '" aria-label="Call ' + nhEsc(who) + '"><i class="fa-solid fa-phone"></i><span>Call</span></a>' +
(wa ? '<a class="nh-ibtn nh-ibtn--wa" href="' + wa + '" target="_blank" rel="noopener" aria-label="WhatsApp ' + nhEsc(who) + '"><i class="fa-brands fa-whatsapp"></i><span>WhatsApp</span></a>' : '') +
'</div>';
}
return '<div class="nh-contact' + (isMedco ? ' nh-contact--medco' : '') + '">' +
'<div class="nh-c-body">' + (c.name ? '<div class="nh-c-name">' + nhEsc(c.name) + '</div>' : '') +
'<div class="nh-c-line"><span class="nh-c-role"><i class="fa-solid ' + (isMedco ? 'fa-user-doctor' : 'fa-headset') + '"></i>' + nhEsc(c.role) + '</span>' + num + '</div></div>' + btns + '</div>';
}
function nhFavHTML(h) {
const on = nhIsSaved(h.key);
return '<button type="button" class="nh-fav" data-nh-fav="' + nhEsc(h.key) + '" aria-pressed="' + on + '" aria-label="Save this hospital" title="Save hospital">' +
'<i class="fa-regular fa-heart nh-h-off"></i><i class="fa-solid fa-heart nh-h-on"></i></button>';
}
function nhBuild(h, avatarExtra) {
const gov = h.type === 'Government Hospital';
const kind = nhKind(h);
const geo = (h.lat != null && h.lng != null);
const addr = nhHasUsefulAddress(h.address) ? h.address : '';
const place = addr || (h.district + ', Telangana');
const mapUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(h.name + ' ' + place);
const nick = encodeURIComponent(h.name);
const uber = 'https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[nickname]=' + nick +
(geo ? '&dropoff[latitude]=' + h.lat + '&dropoff[longitude]=' + h.lng : '&dropoff[formatted_address]=' + encodeURIComponent(place));
const ola = geo
? 'https://book.olacabs.com/c/ola?lat=' + h.lat + '&lng=' + h.lng + '&category=cab&drop_name=' + nick
: 'https://book.olacabs.com/?drop_name=' + nick;
const contacts = nhMergeContacts(h.contacts);
const lines = ['*Hospital Details - Telangana Healthcare Hub*', '🏥 *Hospital:* ' + h.name, '📍 *Location:* ' + place];
contacts.forEach(function (c) {
lines.push('👤 *' + c.role + ':* ' + [c.name, nhPhoneText(c.phone)].filter(Boolean).join(' - '));
});
lines.push('🗺️ *Google Maps:* ' + mapUrl);
const shareUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(lines.join('\n'));
const specTags = (h.specialties || []).slice(0, 2).map(function (s, idx) {
const icon = (idx === 0 && (kind === 'dental' || kind === 'eye')) ? NH_KIND_ICON[kind] : (NH_SPEC_ICON[s] || 'fa-stethoscope');
return '<span class="nh-tag nh-tag--spec' + (idx ? ' nh-tag--spec2' : '') + '"><i class="fa-solid ' + icon + '"></i>' + nhEsc(s) + '</span>';
}).join('');
const typeTag = '<span class="nh-tag nh-tag--type"><i class="fa-solid ' + (gov ? 'fa-landmark' : 'fa-building') + '"></i>' + (gov ? 'Government' : 'Private') + '</span>';
const distTag = (h.distance !== undefined && isFinite(h.distance))
? '<span class="nh-tag nh-tag--dist"><i class="fa-solid fa-route"></i>~' + h.distance.toFixed(1) + ' km</span>' : '';
const cashTag = (h.cover && !/^cashless( treatment)?$/i.test(h.cover))
? '<span class="nh-tag nh-tag--cash"><i class="fa-solid fa-shield-halved"></i>' + nhEsc(h.cover) + '</span>' : '';
const validTag = h.validity ? '<span class="nh-tag nh-tag--valid"><i class="fa-solid fa-calendar-check"></i>Valid till ' + nhEsc(h.validity) + '</span>' : '';
const timeTag = h.availability ? '<span class="nh-tag nh-tag--time"><i class="fa-solid fa-clock"></i>' + nhEsc(h.availability) + '</span>' : '';
const contactsHTML = contacts.length
? '<div class="nh-contacts' + (contacts.length > 1 ? ' nh-contacts--2' : '') + '" role="group" aria-label="Helpdesk contacts">' +
contacts.map(function (c) { return nhContactHTML(c, h); }).join('') + '</div>'
: '<p class="nh-nocontact"><i class="fa-solid fa-circle-info"></i><span>Helpdesk contact for this hospital is not listed in the ' + nhSchemeLabel(h) + ' directory yet.</span></p>';
const canSave = nhVCardText(h) !== '';
const actionsHTML = '<div class="nh-actions">' +
'<a class="nh-act nh-act--map" href="' + mapUrl + '" target="_blank" rel="noopener" title="View on Google Maps"><i class="fa-solid fa-map-location-dot"></i><span>Map</span></a>' +
'<details class="nh-cab"><summary class="nh-act nh-act--cab" title="Book a cab"><i class="fa-solid fa-taxi"></i><span>Cab</span></summary>' +
'<div class="nh-cab-menu">' +
'<a href="' + uber + '" target="_blank" rel="noopener"><i class="fa-brands fa-uber"></i>Uber</a>' +
'<a href="' + ola + '" target="_blank" rel="noopener"><i class="fa-solid fa-car"></i>Ola</a>' +
'<a href="https://www.rapido.bike/" target="_blank" rel="noopener"><i class="fa-solid fa-motorcycle"></i>Rapido</a>' +
'</div></details>' +
(canSave ? '<button type="button" class="nh-act nh-act--sav" data-nh-vcard="' + nhEsc(h.key) + '" title="Save Mitra / MEDCO contacts to your phone"><i class="fa-solid fa-address-book"></i><span>Save</span></button>' : '') +
'<a class="nh-act nh-act--shr" href="' + shareUrl + '" target="_blank" rel="noopener" title="Share on WhatsApp"><i class="fa-brands fa-whatsapp"></i><span>Share</span></a>' +
'</div>';
const reportBtn = '<button type="button" class="nh-flag" data-nh-report="1" data-name="' + nhEsc(h.name) + '" data-addr="' + nhEsc(place) + '" title="Report incorrect info for this hospital" aria-label="Report incorrect information for ' + nhEsc(h.name) + '"><i class="fa-solid fa-flag"></i></button>';
const svcList = Array.isArray(h.services) ? h.services : [];
const svcHTML = svcList.length > 2
? '<details class="nh-svc"><summary><i class="fa-solid fa-list-check"></i>All services (' + svcList.length + ')</summary><div class="nh-svc-list">' +
svcList.map(function (s) { return '<span>' + nhEsc(s) + '</span>'; }).join('') + '</div></details>'
: '';
return {
svcHTML: svcHTML,
gov: gov, kind: kind, addr: addr, place: place, contacts: contacts,
avatar: '<span class="nh-avatar' + (avatarExtra || '') + '" aria-hidden="true"><i class="fa-solid ' + NH_KIND_ICON[kind] + '"></i></span>',
tagsHTML: '<div class="nh-tags">' + typeTag + specTags + cashTag + validTag + timeTag + distTag + '</div>',
addrHTML: addr ? '<p class="nh-addr"><i class="fa-solid fa-map-pin"></i><span>' + nhEsc(addr) + '</span></p>' : '',
contactsHTML: contactsHTML,
actionsHTML: actionsHTML,
reportBtn: reportBtn
};
}
function nhCardHTML(h) {
const b = nhBuild(h, '');
return '<div class="nh-cell"><article class="nh-card nh-card--' + (b.gov ? 'gov' : 'pvt') + ' nh-sp-' + b.kind + '">' +
'<header class="nh-head">' + b.avatar +
'<div class="nh-title"><div class="nh-head-actions">' + b.reportBtn + nhFavHTML(h) + '</div><h5 class="nh-name">' + nhEsc(h.name) + '</h5>' +
'<p class="nh-loc"><i class="fa-solid fa-location-dot"></i><span>' + nhEsc(h.district) + ', Telangana</span>' +
'</p></div>' +
'</header>' + b.tagsHTML + b.addrHTML + b.svcHTML + b.contactsHTML + b.actionsHTML + '</article></div>';
}
function nhRowHTML(h) {
const b = nhBuild(h, ' nh-avatar--sm');
const meta = [h.district, b.gov ? 'Govt' : 'Private', h.specialty].join(' · ');
return '<div class="nh-cell"><article class="nh-card nh-card--row nh-card--' + (b.gov ? 'gov' : 'pvt') + ' nh-sp-' + b.kind + '">' +
'<div class="nh-row-main">' +
'<div class="nh-row-toggle" data-nh-toggle="1" role="button" tabindex="0" aria-expanded="false">' +
b.avatar +
'<span class="nh-row-text">' +
'<span class="nh-row-name" title="' + nhEsc(h.name) + '">' + nhEsc(h.name) + '</span>' +
'</span>' +
'<span class="nh-row-icons">' + b.reportBtn + nhFavHTML(h) + '<i class="fa-solid fa-chevron-down nh-chev" aria-hidden="true"></i></span>' +
'</div>' +
'</div>' +
'<div class="nh-row-more" hidden>' + b.tagsHTML + b.addrHTML + b.svcHTML + b.contactsHTML + b.actionsHTML + '</div>' +
'</article></div>';
}
function nhSyncToolbar() {
const c = document.getElementById('nhViewCard'), l = document.getElementById('nhViewList'), s = document.getElementById('nhSavedBtn');
if (c) c.setAttribute('aria-pressed', String(nhState.view === 'card'));
if (l) l.setAttribute('aria-pressed', String(nhState.view === 'list'));
if (s) s.setAttribute('aria-pressed', String(nhState.savedOnly));
const n = document.getElementById('nhSavedCount');
if (n) n.textContent = String(nhSavedCount(nhCurrentScheme()));
}
function nhExitSavedMode() {
if (nhState.savedOnly) { nhState.savedOnly = false; nhSyncToolbar(); }
}
function nhSetView(v) {
if (v !== 'card' && v !== 'list') return;
nhState.view = v;
nhStore(NH_LS.view, v);
itemsPerPage = v === 'list' ? 12 : 9;
nhSyncToolbar();
resetPageAndRender();
}
function nhToggleSaved() {
nhState.savedOnly = !nhState.savedOnly;
nhSyncToolbar();
if (nhState.savedOnly) resetPageAndRender(); else displayHubInfo();
}
function nhToggleFav(key) {
if (nhSaved.has(key)) nhSaved.delete(key); else nhSaved.add(key);
nhStore(NH_LS.fav, Array.from(nhSaved));
const on = nhSaved.has(key);
document.querySelectorAll('[data-nh-fav]').forEach(function (b) {
if (b.getAttribute('data-nh-fav') === key) {
b.setAttribute('aria-pressed', String(on));
if (on) { b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop'); }
}
});
nhSyncToolbar();
if (on) nhToast('Saved - find it under "Saved"');
if (nhState.savedOnly) { filterHospitals(); renderHospitalList(); }
}
(function () {
document.addEventListener('click', function (e) {
const t = e.target && e.target.closest ? e.target : null;
if (!t) return;
let el;
if ((el = t.closest('[data-nh-report]'))) {
if (typeof openReportModal === 'function') openReportModal(el.getAttribute('data-name') || '', el.getAttribute('data-addr') || '');
return;
}
if ((el = t.closest('[data-nh-fav]'))) { nhToggleFav(el.getAttribute('data-nh-fav')); return; }
if ((el = t.closest('[data-nh-vcard]'))) {
const h = nhFindByKey(el.getAttribute('data-nh-vcard'));
if (h) nhSaveContacts(h);
return;
}
if ((el = t.closest('[data-nh-toggle]'))) {
const row = el.closest('.nh-card--row');
if (row) {
const more = row.querySelector('.nh-row-more');
const open = !row.classList.contains('is-open');
row.classList.toggle('is-open', open);
el.setAttribute('aria-expanded', String(open));
if (more) { if (open) more.removeAttribute('hidden'); else more.setAttribute('hidden', ''); }
}
return;
}
if ((el = t.closest('[data-nh-view]'))) { nhSetView(el.getAttribute('data-nh-view')); return; }
if (t.closest('[data-nh-saved-toggle]')) { nhToggleSaved(); return; }
document.querySelectorAll('.nh-cab[open]').forEach(function (d) { if (!d.contains(t)) d.removeAttribute('open'); });
});
document.addEventListener('keydown', function (e) {
if (e.key === 'Escape') document.querySelectorAll('.nh-cab[open]').forEach(function (d) { d.removeAttribute('open'); });
if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('[data-nh-toggle]')) {
e.preventDefault();
e.target.click();
}
});
function leaveSaved(e) {
const id = e.target && e.target.id;
if (id === 'districtSelect' || id === 'hospitalTypeSelect' || id === 'specializationFilter' || id === 'healthCardSelect' || id === 'globalSearch') nhExitSavedMode();
}
document.addEventListener('change', leaveSaved, true);
document.addEventListener('input', leaveSaved, true);
document.addEventListener('DOMContentLoaded', nhSyncToolbar);
})();
var NH_CARD_LABEL={'NEHS Card':'EHS / NEHS'};
function nhUpdateHeading(){
var el=document.getElementById('nhResultHeadingText');
var hero=document.getElementById('nhHeroTitle');
if(!el&&!hero)return;
var cs=document.getElementById('healthCardSelect'),ds=document.getElementById('districtSelect');
var card=(cs&&cs.value)||'NEHS Card';
var label=NH_CARD_LABEL[card]||card;
var dist=ds?ds.value:'';
var saved=(typeof nhState!=='undefined'&&nhState.savedOnly);
var place;
if(!dist||dist==='All'){place=(typeof userCoords!=='undefined'&&userCoords&&userCoords.lat)?'Near You':'Telangana';}
else{place=dist;}
if(hero&&!saved){var ht='NEHS / EHS Empanelled Hospitals '+(place==='Near You'?'Near You':'in '+place);if(hero.textContent!==ht)hero.textContent=ht;}
if(!el)return;
if(saved){el.innerHTML='<b>My Saved Hospitals</b>';return;}
var safe=String(place).replace(/&/g,'&amp;').replace(/</g,'&lt;');
el.innerHTML=label+' Empanelled Hospitals '+(place==='Near You'?'<b>Near You</b>':'in <b>'+safe+'</b>');
}
document.addEventListener('change',function(e){var id=e.target&&e.target.id;if(id==='districtSelect'||id==='healthCardSelect'||id==='hospitalTypeSelect')setTimeout(nhUpdateHeading,0);});
function filterHospitals() {
if (!document.getElementById('healthCardSelect')) return;
const card = document.getElementById('healthCardSelect').value || "NEHS Card";
const selectedDistrict = document.getElementById('districtSelect') ? document.getElementById('districtSelect').value : "Hyderabad";
const hospType = document.getElementById('hospitalTypeSelect').value || "All";
const selectedSpecialty = document.getElementById('specializationFilter').value || "All";
const searchQuery = document.getElementById('globalSearch') ? document.getElementById('globalSearch').value.toLowerCase().trim() : "";
const hospitals = cardHospitalsMap[card] || cardHospitalsMap["NEHS Card"];
if (nhState.savedOnly) {
currentFilteredList = hospitals.filter(function (h) { return nhSaved.has(h.key); });
} else {
currentFilteredList = hospitals.filter(function (h) {
const matchesDistrict = !selectedDistrict || selectedDistrict === 'All' || h.district.toLowerCase() === selectedDistrict.toLowerCase();
const matchesType = !hospType || hospType === 'All' || h.type === hospType;
const matchesSpec = selectedSpecialty === 'All' || (h.specialties || [h.specialty]).indexOf(selectedSpecialty) !== -1;
const matchesSearch = !searchQuery || (h.searchText || (h.name + ' ' + h.address).toLowerCase()).indexOf(searchQuery) !== -1;
return matchesDistrict && matchesType && matchesSpec && matchesSearch;
});
}
if (userCoords && userCoords.lat && userCoords.lng) {
currentFilteredList.forEach(function (h) {
h.distance = nhDistanceKm(h);
});
currentFilteredList.sort(function (a, b) {
const A = a.distance === undefined ? Infinity : a.distance;
const B = b.distance === undefined ? Infinity : b.distance;
return A === B ? 0 : A - B;
});
} else {
currentFilteredList.forEach(function (h) { delete h.distance; });
}
}
function renderHospitalList() {
const hospListContainer = document.getElementById('regionHospitalsList');
if (!hospListContainer) return;
const pagination = document.getElementById('paginationContainer');
const isList = nhState.view === 'list';
hospListContainer.className = 'nh-grid' + (isList ? ' nh-grid--list' : '');
nhSyncToolbar();
nhUpdateHeading();
const rc = document.getElementById('nhResultCount');
if (rc) {
const n = currentFilteredList.length;
rc.textContent = n + ' Hospital' + (n === 1 ? '' : 's') + ' found';
}
if (nhState.savedOnly) {
const dn = document.getElementById('resDistrictName'), tn = document.getElementById('resHospitalTypeName');
if (dn) dn.innerHTML = 'My Saved Hospitals';
if (tn) tn.innerHTML = 'All districts';
}
if (currentFilteredList.length === 0) {
hospListContainer.innerHTML = nhState.savedOnly
? '<div class="nh-empty"><i class="fa-regular fa-heart"></i>No saved hospitals yet.<br/>Tap the heart on any hospital to keep it here.</div>'
: '<div class="nh-empty"><i class="fa-solid fa-magnifying-glass"></i>No hospitals found for the selected district / filters.<br/>Try another district, hospital type or specialty.</div>';
if (pagination) pagination.style.display = 'none';
return;
}
if (pagination) pagination.style.display = 'flex';
const totalPages = Math.ceil(currentFilteredList.length / itemsPerPage);
if (currentPage > totalPages) currentPage = totalPages;
if (currentPage < 1) currentPage = 1;
const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = Math.min(startIndex + itemsPerPage, currentFilteredList.length);
hospListContainer.innerHTML = currentFilteredList.slice(startIndex, endIndex).map(isList ? nhRowHTML : nhCardHTML).join('');
const pageInfo = document.getElementById('pageInfo');
const pageBadge = document.getElementById('currentPageBadge');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const cardSel = document.getElementById('healthCardSelect');
const isNehs = !cardSel || !cardSel.value || cardSel.value === 'NEHS Card';
if (pageInfo) pageInfo.innerHTML = 'Showing ' + (startIndex + 1) + ' to ' + endIndex + ' of ' + currentFilteredList.length + ' results' +
(!nhState.savedOnly ? (function () { const src = NH_SOURCES[isNehs ? 'NEHS Card' : cardSel.value]; return src ? ' &#183; ' + src.label + ' list updated ' + src.data.updated : ''; })() : '');
if (pageBadge) pageBadge.innerHTML = 'Page ' + currentPage + ' of ' + totalPages;
if (prevBtn) prevBtn.disabled = currentPage === 1;
if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}
function nhInitVoiceSearch() {
const btn = document.getElementById('nhVoiceBtn');
const input = document.getElementById('globalSearch');
if (!btn || !input) return;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) {
btn.addEventListener('click', function () {
nhToast('Voice search isn\'t supported in this browser. Try Chrome or Edge.');
});
return;
}
let rec = null, listening = false;
function stopUI() {
listening = false;
btn.classList.remove('is-listening');
btn.setAttribute('aria-pressed', 'false');
}
btn.addEventListener('click', function () {
if (listening) { if (rec) rec.stop(); return; }
rec = new SR();
rec.lang = 'en-IN';
rec.interimResults = false;
rec.maxAlternatives = 1;
rec.addEventListener('start', function () {
listening = true;
btn.classList.add('is-listening');
btn.setAttribute('aria-pressed', 'true');
nhToast('Listening... say a hospital name or area');
});
rec.addEventListener('result', function (e) {
const text = (e.results && e.results[0] && e.results[0][0]) ? e.results[0][0].transcript : '';
if (text) {
input.value = text;
input.dispatchEvent(new Event('input', { bubbles: true }));
input.focus();
}
});
rec.addEventListener('error', function (e) {
stopUI();
if (e.error === 'not-allowed' || e.error === 'permission-denied') {
nhToast('Microphone access was blocked. Allow it in your browser settings to use voice search.');
} else if (e.error === 'no-speech') {
nhToast('Didn\'t catch that - please try again.');
}
});
rec.addEventListener('end', stopUI);
try { rec.start(); } catch (e) { stopUI(); }
});
}
document.addEventListener('DOMContentLoaded', nhInitVoiceSearch);
function changePage(direction) {
const totalPages = Math.ceil(currentFilteredList.length / itemsPerPage);
currentPage += direction;
if (currentPage < 1) currentPage = 1;
if (currentPage > totalPages) currentPage = totalPages;
renderHospitalList();
const resCard = document.getElementById('resultCard');
if(resCard) resCard.scrollIntoView({ behavior: 'smooth' });
}
function searchHub() {
resetPageAndRender();
}
function setupAutocomplete() {
const searchInput = document.getElementById('globalSearch');
if (!searchInput) return;
let suggBox = document.getElementById('searchSuggestionsBox');
if (!suggBox) {
suggBox = document.createElement('div');
suggBox.id = 'searchSuggestionsBox';
suggBox.className = 'absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto hidden z-50 text-left';
if (searchInput.parentElement) {
searchInput.parentElement.style.position = 'relative';
searchInput.parentElement.appendChild(suggBox);
}
}
function runSearch() {
const query = searchInput.value.toLowerCase().trim();
const resCard = document.getElementById('resultCard');
if (resCard && query.length > 0) {
const cardSel = document.getElementById('healthCardSelect');
if (cardSel && !cardSel.value) {
cardSel.value = "NEHS Card";
}
resCard.style.display = 'block';
}
resetPageAndRender();
if (query.length === 0) {
suggBox.style.display = 'none';
return;
}
let matches = [];
for (const cardName in cardHospitalsMap) {
const list = cardHospitalsMap[cardName];
for (let i = 0; i < list.length && matches.length < 10; i++) {
const h = list[i];
if ((h._s || (h._s = (h.name + ' ' + h.address + ' ' + h.district).toLowerCase())).indexOf(query) !== -1) {
matches.push({ name: h.name, district: h.district, cardName: cardName });
}
}
if (matches.length >= 10) break;
}
if (matches.length === 0) {
suggBox.innerHTML = `<div class='p-3 text-xs text-slate-500 text-center'>No matching hospitals found</div>`;
suggBox.style.display = 'block';
return;
}
let html = '';
matches.forEach((h) => {
html += `
<div data-hosp="${nhEsc(h.name)}" data-card="${nhEsc(h.cardName)}" class='p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition'>
<div class='font-bold text-slate-900 text-xs sm:text-sm leading-snug'>${nhEsc(h.name)}</div>
<div class='text-[11px] text-slate-500 mt-0.5'>${nhEsc(h.district)} | ${nhEsc(h.cardName)}</div>
</div>
`;
});
suggBox.innerHTML = html;
suggBox.style.display = 'block';
}
let searchTimer = null;
searchInput.addEventListener('input', function() {
clearTimeout(searchTimer);
if (!this.value.trim()) suggBox.style.display = 'none';
searchTimer = setTimeout(runSearch, 200);
});
suggBox.addEventListener('click', function(e) {
const item = e.target.closest ? e.target.closest('[data-hosp]') : null;
if (item) selectAutocompleteHospital(item.getAttribute('data-hosp'), item.getAttribute('data-card'));
});
document.addEventListener('click', function(e) {
if (!searchInput.contains(e.target) && !suggBox.contains(e.target)) {
suggBox.style.display = 'none';
}
});
}
function selectAutocompleteHospital(hospName, cardName) {
const searchInput = document.getElementById('globalSearch');
const cardSel = document.getElementById('healthCardSelect');
const suggBox = document.getElementById('searchSuggestionsBox');
if (cardSel) cardSel.value = cardName;
if (searchInput) searchInput.value = hospName;
if (suggBox) suggBox.style.display = 'none';
updateDistricts();
if (typeof cardHospitalsMap !== 'undefined' && cardHospitalsMap[cardName]) {
let found = cardHospitalsMap[cardName].find(h => h.name === hospName);
if (found && document.getElementById('districtSelect')) {
document.getElementById('districtSelect').value = found.district;
}
}
displayHubInfo();
}
document.addEventListener('DOMContentLoaded', function() {
const cardSel = document.getElementById('healthCardSelect');
const typeSel = document.getElementById('hospitalTypeSelect');
if (cardSel && !cardSel.value) {
cardSel.value = "NEHS Card";
}
if (typeSel && !typeSel.value) {
typeSel.value = "All";
}
updateDistricts(true);
setupAutocomplete();
const resCard = document.getElementById('resultCard');
const guideSec = document.getElementById('guidelinesSection');
if (resCard) {
resCard.style.display = 'block';
}
if (guideSec) {
guideSec.style.display = 'block';
}
if (typeof displayHubInfo === 'function' && !window.nhDP && !/[?&](card|district)=[^&]/.test(location.search)) {
displayHubInfo();
}
});

/* ---- part 2 ---- */
try {
(function () {
var PFX = {'NEHS Card':'ehs'};
var BYPFX = {'ehs':'NEHS Card'};
var LBL = {'NEHS Card':'EHS / NEHS'};
var HOME = {'NEHS Card':'/'};
var ACC = {'NEHS Card':'#2563eb'};
var HOW = {'NEHS Card':'NEHS gives Telangana government employees, pensioners and eligible family members cashless treatment at empanelled hospitals through the Employees Health Care Trust.'};
function $(id){return document.getElementById(id);}
function slug(d){return String(d).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function isoDate(t){var d=new Date(t);return isNaN(d)?'':d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
var m = location.pathname.toLowerCase().match(/^\/p\/(ehs)-hospitals-([a-z0-9-]+)\.html$/);
if (!m || typeof telanganaDistricts === 'undefined') return;
var dist = null;
telanganaDistricts.forEach(function (d) { if (slug(d) === m[2]) dist = d; });
if (!dist) return;
window.nhDP = { card: BYPFX[m[1]], district: dist };
document.documentElement.className += ' nh-dpage';
var cacheKey = '', districtCache = {};
function rowsFor(card) { return (typeof NH_SOURCES !== 'undefined' && NH_SOURCES[card]) ? NH_SOURCES[card].data.rows : []; }
function countByDistrict(card) {
if (districtCache[card]) return districtCache[card];
var c = {};
rowsFor(card).forEach(function (r) { c[r[2]] = (c[r[2]] || 0) + 1; });
return (districtCache[card] = c);
}
function stats(card, d) {
var all = (typeof cardHospitalsMap !== 'undefined' && cardHospitalsMap[card]) ? cardHospitalsMap[card] : [];
var rows = all.filter(function (h) { return !d || String(h.district).toLowerCase() === d.toLowerCase(); });
var g = 0, spec = {};
rows.forEach(function (h) {
if (h.type === 'Government Hospital') g++;
(h.specialties || []).forEach(function (x) { spec[x] = (spec[x] || 0) + 1; });
});
var sp = Object.keys(spec).sort(function (a, b) { return spec[b] - spec[a]; });
return { n: rows.length, g: g, p: rows.length - g, spec: spec, sp: sp };
}
function setLD(id, data) {
var s = $(id);
if (!s) { s = document.createElement('script'); s.type = 'application/ld+json'; s.id = id; document.head.appendChild(s); }
s.textContent = JSON.stringify(data);
}
function intro() {
var cs = $('healthCardSelect'), ds = $('districtSelect');
var card = (cs && cs.value) || window.nhDP.card, d = ds ? ds.value : window.nhDP.district;
var key = card + '|' + d;
if (key === cacheKey && $('nhDistrictContent')) return;
var box = cs && cs.closest ? cs.closest('.bg-white') : null;
if (!box || !box.parentNode) return;
cacheKey = key;
box.classList.add('nh-dp-hidebox');
var label = LBL[card] || card, place = d || 'Telangana';
var st = stats(card, d);
var upd = (NH_SOURCES[card] && NH_SOURCES[card].data.updated) || '';
var lead;
if (!st.n) {
lead = 'No ' + label + ' empanelled hospitals are listed for ' + place + ' yet. Please try another district from the list below.';
} else {
lead = 'This page lists ' + st.n + ' ' + label + ' empanelled hospitals in ' + place + (d ? ' district' : '') + ', Telangana' + (st.g && st.p ? ', including ' + st.g + ' government and ' + st.p + ' private / corporate hospitals' : (st.p ? ', all private / corporate hospitals' : (st.g ? ', all government hospitals' : ''))) + '. ' +
(st.sp.length ? 'Most covered specialties: ' + st.sp.slice(0, 4).join(', ') + '. ' : '') + HOW[card] + (upd ? ' Hospital data was last updated on ' + upd + '.' : '');
}
var head = '<nav aria-label="Breadcrumb" class="nh-dp-crumb"><a href="/">Home</a><span>/</span><a href="' + HOME[card] + '">' + esc(label) + ' Hospitals</a><span>/</span><b>' + esc(place) + '</b></nav>' +
'<h1>' + esc(label) + ' Empanelled Hospitals in ' + esc(place) + '</h1>';
var subParts = st.n ? [st.n + ' hospitals'].concat(st.g ? [st.g + ' government'] : [], st.p ? [st.p + ' private / corporate'] : []) : ['No hospitals listed yet'];
if (upd) subParts.push('Updated ' + upd);
head += '<p class="nh-dp-sub">' + subParts.map(esc).join(' <span>&middot;</span> ') + '</p>';
var html = '<h2 class="nh-dp-h nh-dp-h--first">About ' + esc(label) + ' hospitals in ' + esc(place) + '</h2><p class="nh-dp-lead">' + esc(lead) + '</p>';
var sel = $('specializationFilter'), opts = {};
if (sel) for (var i = 0; i < sel.options.length; i++) opts[sel.options[i].value] = 1;
var chips = st.sp.filter(function (x) { return opts[x]; }).slice(0, 8);
var spSumDp = 0; chips.forEach(function (x) { spSumDp += st.spec[x]; });
if (chips.length) {
html += '<h2 class="nh-dp-h">Browse by specialty <span class="nh-dp-uniq">(Total Unique: ' + st.n + ' Hospital' + (st.n === 1 ? '' : 's') + ')</span></h2><div class="nh-dp-chips">' + chips.map(function (x) { return '<button class="nh-dp-chip" data-spec="' + esc(x) + '" type="button">' + esc(x) + ' <i>(' + st.spec[x] + ')</i></button>'; }).join('') + '</div>' + (spSumDp > st.n ? '<p class="nh-dp-note">One hospital can offer more than one specialty, so these numbers add up to ' + spSumDp + ', more than the ' + st.n + ' unique hospitals.</p>' : '');
}
var moreHtml = '';
var cnt = countByDistrict(card), ods = telanganaDistricts.filter(function (x) { return x !== d && cnt[x]; });
if (ods.length) {
moreHtml = '<h2 class="nh-dp-h">Other districts</h2><details><summary>' + esc(label) + ' hospitals in ' + ods.length + ' more districts</summary><div class="nh-dp-links">' + ods.map(function (x) {
return '<a href="/p/' + PFX[card] + '-hospitals-' + slug(x) + '.html">' + esc(x) + ' <span>(' + cnt[x] + ')</span></a>';
}).join('') + '</div></details>';
}
var det = (typeof cardDetailsMap !== 'undefined' && cardDetailsMap[card]) ? cardDetailsMap[card] : null;
var faq = [
['How many ' + label + ' hospitals are in ' + place + '?', 'There are ' + st.n + ' ' + label + ' empanelled hospitals listed for ' + place + ' on this directory' + (upd ? ', last updated on ' + upd : '') + '. Please confirm with the hospital before admission.']
];
if (st.n) faq.push(['Does ' + label + ' include government and private hospitals in ' + place + '?', (st.g && st.p) ? (st.g + ' government and ' + st.p + ' private / corporate hospitals are listed for ' + place + '.') : (st.p ? ('Only private / corporate hospitals (' + st.p + ') are listed for ' + place + '.') : ('Only government hospitals (' + st.g + ') are listed for ' + place + '.'))]);
if (det && det.rules) faq.push(['How does cashless treatment work under ' + label + '?', det.rules]);
html += '<h2 class="nh-dp-h">Frequently asked questions</h2>' + faq.map(function (f) { return '<details><summary>' + esc(f[0]) + '</summary><p>' + esc(f[1]) + '</p></details>'; }).join('') + moreHtml;
var top = $('nhDistrictIntro');
if (!top) { top = document.createElement('section'); top.id = 'nhDistrictIntro'; top.className = 'nh-dp nh-dp-head'; box.parentNode.insertBefore(top, box); }
var sec = $('nhDistrictContent');
if (!sec) {
sec = document.createElement('section'); sec.id = 'nhDistrictContent'; sec.className = 'nh-dp';
var rcx = $('resultCard');
if (rcx && rcx.parentNode) rcx.parentNode.insertBefore(sec, rcx.nextSibling); else box.parentNode.appendChild(sec);
sec.addEventListener('click', function (e) {
var b = e.target && e.target.closest ? e.target.closest('[data-spec]') : null;
if (!b) return;
var f = $('specializationFilter');
if (f) { f.value = b.getAttribute('data-spec'); if (typeof resetPageAndRender === 'function') resetPageAndRender(); var rc = $('resultCard'); if (rc && rc.scrollIntoView) rc.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
});
}
top.style.setProperty('--nh-acc', ACC[card] || '#2563eb');
top.innerHTML = head;
sec.style.setProperty('--nh-acc', ACC[card] || '#2563eb');
sec.innerHTML = html;
var base = location.origin + location.pathname;
setLD('nhDpFaq', { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(function (f) { return { '@type': 'Question', name: f[0], acceptedAnswer: { '@type': 'Answer', text: f[1] } }; }) });
setLD('nhDpPage', { '@context': 'https://schema.org', '@type': ['CollectionPage', 'MedicalWebPage'], '@id': base + '#webpage', url: base, name: label + ' Empanelled Hospitals in ' + place, description: lead, inLanguage: 'en-IN', isPartOf: { '@id': location.origin + '/#website' }, publisher: { '@id': location.origin + '/#organization' }, about: { '@type': 'Thing', name: label + ' cashless treatment scheme, Telangana' }, spatialCoverage: { '@type': 'AdministrativeArea', name: place + ', Telangana, India' }, breadcrumb: { '@id': base + '#breadcrumb' }, mainEntity: { '@id': base + '#hospitals' }, dateModified: isoDate(upd) || undefined, speakable: { '@type': 'SpeakableSpecification', cssSelector: ['#nhDistrictIntro h1', '.nh-dp-lead'] } });
setLD('nhDpCrumb', { '@context': 'https://schema.org', '@type': 'BreadcrumbList', '@id': base + '#breadcrumb', itemListElement: [
{ '@type': 'ListItem', position: 1, name: 'Home', item: location.origin + '/' },
{ '@type': 'ListItem', position: 2, name: label + ' Hospitals', item: location.origin + HOME[card] },
{ '@type': 'ListItem', position: 3, name: place, item: base }
] });
}
if (typeof renderHospitalList === 'function') {
var _r = renderHospitalList;
renderHospitalList = function () { var r = _r.apply(this, arguments); try { intro(); } catch (e) {} return r; };
}
})();
} catch (err) { console.error('NEHS script part 2 failed', err); }

/* ---- part 3 ---- */
try {
(function () {
var LBL = {'NEHS Card':'EHS / NEHS'};
var KEY = {'NEHS Card':'nehs'};
var ALIAS = {nehs:'NEHS Card',ehs:'NEHS Card'};
function $(id){return document.getElementById(id);}
function setMeta(sel,val){var m=document.querySelector(sel);if(m)m.setAttribute('content',val);}
function seoSync(updateUrl){
var cs=$('healthCardSelect'),ds=$('districtSelect');
if(!cs||!ds||!cs.value)return;
var card=cs.value,label=LBL[card]||card,d=ds.value,place=d||'Telangana';
var title=label+' Empanelled Hospitals in '+place+' - Cashless List '+new Date().getFullYear();
var desc='Check '+label+' empanelled hospitals in '+place+', Telangana: hospital names, addresses, specialties and Mitra/Medco contact details for cashless treatment.';
document.title=title;
setMeta('meta[name="description"]',desc);
setMeta('meta[property="og:title"]',title);setMeta('meta[property="og:description"]',desc);
setMeta('meta[property="twitter:title"]',title);setMeta('meta[property="twitter:description"]',desc);
if(updateUrl&&!window.nhDP&&window.history&&history.replaceState){
try{history.replaceState(null,'',location.pathname+'?card='+KEY[card]+(d?'&district='+encodeURIComponent(d):''));}catch(e){}
}
}
function itemList(){
try{
var list=(typeof currentFilteredList!=='undefined')?currentFilteredList:[];
if(!list.length)return;
var cs=$('healthCardSelect'),ds=$('districtSelect');
var card=(cs&&cs.value)||'NEHS Card',place=(ds&&ds.value)||'Telangana';
var SPEC={'Cardiology':'Cardiovascular','Oncology':'Oncologic','Nephrology':'Renal','Orthopedics':'Musculoskeletal','Eye':'Optometric','Dental':'Dentistry','Maternity & Pediatric':['Obstetric','Pediatric']};
var items=list.slice(0,10).map(function(h,i){
var n={'@type':'Hospital',name:h.name,address:{'@type':'PostalAddress',streetAddress:h.address||'',addressLocality:h.district||place,addressRegion:'Telangana',addressCountry:'IN'}};
var sp=[];(h.specialties||[]).forEach(function(x){if(SPEC[x])sp=sp.concat(SPEC[x]);});
if(sp.length)n.medicalSpecialty=sp;
if(typeof h.lat==='number'&&typeof h.lng==='number')n.geo={'@type':'GeoCoordinates',latitude:h.lat,longitude:h.lng};
return {'@type':'ListItem',position:i+1,item:n};
});
var data={'@context':'https://schema.org','@type':'ItemList','@id':location.origin+location.pathname+'#hospitals',name:(LBL[card]||card)+' Empanelled Hospitals in '+place,numberOfItems:list.length,itemListElement:items};
var s=$('nhItemListLD');
if(!s){s=document.createElement('script');s.type='application/ld+json';s.id='nhItemListLD';document.head.appendChild(s);}
s.textContent=JSON.stringify(data);
}catch(e){}
}
if(typeof renderHospitalList==='function'){
var _render=renderHospitalList;
renderHospitalList=function(){var r=_render.apply(this,arguments);itemList();return r;};
}
document.addEventListener('change',function(e){
var id=e.target&&e.target.id;
if(id==='districtSelect'||id==='healthCardSelect')setTimeout(function(){seoSync(true);},0);
});
function apply(card,district,skipSeo){
var cs=$('healthCardSelect'),ds=$('districtSelect');
if(!cs||!ds)return;
if(card){cs.value=card;updateDistricts(true);}
if(district){for(var i=0;i<ds.options.length;i++){if(ds.options[i].value.toLowerCase()===String(district).toLowerCase()){ds.value=ds.options[i].value;break;}}}
displayHubInfo();if(!skipSeo)seoSync(true);
}
function fillCounts(){
var rows=(typeof cardHospitalsMap!=='undefined')?cardHospitalsMap['NEHS Card']:null;
if(!rows||!rows.length)return;
var counts={},nd=0;
rows.forEach(function(h){if(!counts[h.district])nd++;counts[h.district]=(counts[h.district]||0)+1;});
var links=document.querySelectorAll('#nhDistrictLinks a[data-d]');
for(var i=0;i<links.length;i++){var n=counts[links[i].getAttribute('data-d')];if(n&&!links[i].querySelector('span')){var sp=document.createElement('span');sp.textContent='('+n+')';links[i].appendChild(document.createTextNode(' '));links[i].appendChild(sp);}}
var upd=(typeof NH_SOURCES!=='undefined'&&NH_SOURCES['NEHS Card'])?NH_SOURCES['NEHS Card'].data.updated:'';
var ld=$('nhHomeLD');
if(ld&&upd){try{var iso=new Date(upd);if(!isNaN(iso)){iso=iso.getFullYear()+'-'+('0'+(iso.getMonth()+1)).slice(-2)+'-'+('0'+iso.getDate()).slice(-2);var j=JSON.parse(ld.textContent);j['@graph'].forEach(function(n){if(n['@type']==='Dataset')n.dateModified=iso;});ld.textContent=JSON.stringify(j);}}catch(e){}}
var g=$('nhGlanceCount');
if(g){g.textContent=rows.length+' NEHS hospitals across '+nd+' districts'+(upd?' (data updated '+upd+')':'');}
}
document.addEventListener('DOMContentLoaded',function(){
var p=new URLSearchParams(location.search),c=p.get('card'),d=p.get('district');
if(window.nhDP){apply(window.nhDP.card,window.nhDP.district,true);}else if(c||d){apply(c?ALIAS[c.toLowerCase()]:null,d);}
fillCounts();
});
})();
} catch (err) { console.error('NEHS script part 3 failed', err); }

/* ---- part 4 ---- */
try {
(function () {
var Q = { key: 'all', counts: {}, sc: {} };
var FAC = {
all:      ['All', '#ffffff'],
hospital: ['Hospitals', '#e11d48'],
govt:     ['Govt Hospitals', '#059669'],
eye:      ['Eye Centres', '#2563eb'],
dental:   ['Dentals', '#16a34a'],
wellness: ['Wellness Centres', '#0d9488']
};
var SPEC = {
'General & Multispecialty': { icon: 'fa-stethoscope', def: 'General medicine, general surgery, ENT, gynaecology, ICU and emergency care under one roof.' },
'Cardiology':               { icon: 'fa-heart-pulse', def: 'Heart and blood-vessel care: angiography, angioplasty (stent), bypass surgery, pacemaker, cardiac ICU.' },
'Oncology':                 { icon: 'fa-ribbon',      def: 'Cancer care: diagnosis, chemotherapy, radiotherapy and surgical oncology.' },
'Nephrology':               { icon: 'fa-droplet',     def: 'Kidney and urinary care: dialysis, kidney stones, urology surgery and transplant support.' },
'Orthopedics':              { icon: 'fa-bone',        def: 'Bones, joints and trauma: fractures, joint replacement, spine, accident and poly-trauma care.' },
'Maternity & Pediatric':    { icon: 'fa-baby',        def: 'Pregnancy, delivery, gynaecology surgery, newborn (NICU) and child care.' },
'Eye':                      { icon: 'fa-eye',         def: 'Eye care: cataract, retina, glaucoma, LASIK and other ophthalmology services.' },
'Dental':                   { icon: 'fa-tooth',       def: 'Dental care: root canal, extractions, implants, orthodontics and jaw surgery.' }
};
var ALL_SPECS = ['General & Multispecialty','Cardiology','Oncology','Nephrology','Orthopedics','Maternity & Pediatric','Eye','Dental'];
var CFG = {
'NEHS Card': {
fac: ['all','hospital','govt','eye','dental','wellness'],
labels: { hospital: 'Private Hospitals' },
specs: ALL_SPECS,
note: 'NEHS specialties come from the empanelment list of the Employees Health Care Trust. Dental units and Wellness Centres are listed separately in the facility chips.',
desc: {}
}
};
function curCard() {
var el = document.getElementById('healthCardSelect');
return (el && el.value && CFG[el.value]) ? el.value : 'NEHS Card';
}
function specDef(card, s) {
var c = CFG[card] || CFG['NEHS Card'];
return c.desc[s] || (SPEC[s] ? SPEC[s].def : '');
}
function cat(h) { return h._nc || (h._nc = catCalc(h)); }
function catCalc(h) {
var n = h.name || '';
if (/wellness\s*cent/i.test(n)) return 'wellness';
if (/^\s*(u|m)?phc\b/i.test(n)) return 'phc';
if (/^\s*(u)?chc\b|community\s*health\s*cent|tvvp\s*community/i.test(n)) return 'chc';
if (/dental|\bdent\b|dentist|dento|orthodont|tooth|smile|\boral\b/i.test(n)) return 'dental';
if (/diagnos|\bscans?\b|\blabs?\b|imaging|radiolog|pathology/i.test(n)) return 'diag';
if (/eye|netra|vision|retina|sight|ophthal|lasik/i.test(n)) return 'eye';
if ((h.specialties || []).length === 1 && h.specialty === 'Eye') return 'eye';
return h.type === 'Government Hospital' ? 'govt' : 'hospital';
}
function inKey(h, k) { return k === 'all' || cat(h) === k; }
function mount() {
var heroes = document.querySelectorAll('.nehs-hero');
for (var i = 0; i < heroes.length; i++) {
if (heroes[i].querySelector('.nhq-box')) continue;
var p = heroes[i].querySelector('p');
var box = document.createElement('div');
box.className = 'nhq-box';
if (p && p.parentNode) p.parentNode.insertBefore(box, p.nextSibling); else heroes[i].appendChild(box);
}
}
function paint() {
mount();
var card = curCard(), cfg = CFG[card];
var sel = document.getElementById('specializationFilter');
var spec = sel ? sel.value : 'All';
var fac = '<div class="nhq-row" role="group" aria-label="Filter by facility type"><span class="nhq-lbl">Type</span>';
cfg.fac.forEach(function (k) {
var n = Q.counts[k] || 0;
var label = cfg.labels[k] || FAC[k][0];
fac += '<button type="button" class="nhq-chip' + (Q.key === k ? ' is-on' : '') + (n === 0 && k !== 'all' ? ' is-zero' : '') +
'" data-nhq="' + k + '" aria-pressed="' + (Q.key === k) + '"><span class="nhq-dot" style="background:' + FAC[k][1] + '"></span>' +
label + ' &#183; ' + n + '</button>';
});
fac += '</div>';
var sp = '<div class="nhq-row" role="group" aria-label="Filter by specialization"><span class="nhq-lbl">Specialty</span>';
sp += '<button type="button" class="nhq-chip' + (spec === 'All' ? ' is-on' : '') + '" data-nhs="All" aria-pressed="' + (spec === 'All') +
'"><i class="fa-solid fa-layer-group"></i>All &#183; ' + (Q.sc.All || 0) + '</button>';
cfg.specs.forEach(function (s) {
var n = Q.sc[s] || 0;
sp += '<button type="button" class="nhq-chip' + (spec === s ? ' is-on' : '') + (n === 0 ? ' is-zero' : '') +
'" data-nhs="' + s.replace(/"/g, '&quot;') + '" aria-pressed="' + (spec === s) + '" title="' + specDef(card, s).replace(/"/g, '&quot;') + '">' +
'<i class="fa-solid ' + SPEC[s].icon + '"></i>' + s + ' &#183; ' + n + '</button>';
});
sp += '</div>';
var def = (spec !== 'All' && SPEC[spec])
? '<p class="nhq-def"><b>' + spec + ':</b> ' + specDef(card, spec) + '</p>'
: '<p class="nhq-def nhq-note">' + cfg.note + '</p>';
var spSum = 0; cfg.specs.forEach(function (s) { spSum += Q.sc[s] || 0; });
var uniq = Q.sc.All || 0;
var ovl = spSum > uniq ? '<p class="nhq-ovl">Unique hospitals: <b>' + uniq + '</b>. One hospital can offer more than one specialty, so the specialty counts add up to ' + spSum + '.</p>' : '';
var html = fac + sp + ovl + def;
var boxes = document.querySelectorAll('.nhq-box');
for (var j = 0; j < boxes.length; j++) boxes[j].innerHTML = html;
}
var origFilter = filterHospitals;
filterHospitals = function () {
var sel = document.getElementById('specializationFilter');
var spec = sel ? sel.value : 'All';
if (sel) sel.value = 'All';
try { origFilter(); } finally { if (sel) sel.value = spec; }
var base = currentFilteredList.slice();
var fc = { all: 0 }, sc = { All: 0 };
base.forEach(function (h) {
var k = cat(h);
var hs = h.specialties || [h.specialty];
var specOk = spec === 'All' || hs.indexOf(spec) !== -1;
var facOk = inKey(h, Q.key);
if (specOk) { fc[k] = (fc[k] || 0) + 1; fc.all++; }
if (facOk) { hs.forEach(function (s) { sc[s] = (sc[s] || 0) + 1; }); sc.All++; }
});
Q.counts = fc; Q.sc = sc;
currentFilteredList = base.filter(function (h) {
var hs = h.specialties || [h.specialty];
return (spec === 'All' || hs.indexOf(spec) !== -1) && inKey(h, Q.key);
});
};
var origRender = renderHospitalList;
renderHospitalList = function () { origRender(); paint(); };
document.addEventListener('click', function (e) {
var t = e.target && e.target.closest ? e.target : null;
if (!t) return;
var b = t.closest('[data-nhq]');
if (b) {
var k = b.getAttribute('data-nhq');
Q.key = k;
resetPageAndRender();
return;
}
var s = t.closest('[data-nhs]');
if (s) {
var sel = document.getElementById('specializationFilter');
if (!sel) return;
var v = s.getAttribute('data-nhs');
sel.value = (sel.value === v) ? 'All' : v;
resetPageAndRender();
}
});
document.addEventListener('change', function (e) {
if (e.target && e.target.id === 'healthCardSelect') {
Q.key = 'all';
var sel = document.getElementById('specializationFilter');
if (sel) sel.value = 'All';
}
}, true);
mount(); paint();
})();
} catch (err) { console.error('NEHS script part 4 failed', err); }

/* ---- part 5 ---- */
function openReportModal(hospitalName) {
document.getElementById('reportHospitalName').value = hospitalName;
document.getElementById('reportTypeSelect').value = '';
document.getElementById('reportDetails').value = '';
document.getElementById('reportIssueModal').classList.remove('hidden');
document.body.style.overflow = 'hidden';
}
function closeReportModal() {
document.getElementById('reportIssueModal').classList.add('hidden');
document.body.style.overflow = 'auto';
}
function submitReportIssue(event) {
event.preventDefault();
const hospital = document.getElementById('reportHospitalName').value;
const issueType = document.getElementById('reportTypeSelect').value;
const details = document.getElementById('reportDetails').value;
const message = `*Hospital Info Correction Report*%0A%0A*Hospital:* ${encodeURIComponent(hospital)}%0A*Issue:* ${encodeURIComponent(issueType)}%0A*Correct Info/Details:* ${encodeURIComponent(details)}`;
const targetNumber = typeof ADMIN_WHATSAPP_NUMBER !== 'undefined' ? ADMIN_WHATSAPP_NUMBER : "919177583840";
const waUrl = `https://wa.me/${targetNumber}?text=${message}`;
nhToast('Thank you! Redirecting to send updated info to website admin...');
closeReportModal();
window.open(waUrl, '_blank');
}
