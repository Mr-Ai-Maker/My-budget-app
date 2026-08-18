// ===============================
// ميزانيتي v2.0
// Mr.AI
// ===============================

const AUTH_BASE_URL = "https://raspy-hall-5d31.ahmed253340.workers.dev";

// -------------------------------
// البيانات
// -------------------------------

let transactions = [];

let monthlyBudget = 0;

let chart = null;

let monthlyTrendChartInstance = null;

let editingId = null;

let goals = JSON.parse(localStorage.getItem("goals") || "null") || (function(){

const oldGoal = JSON.parse(localStorage.getItem("goal") || "null");

if(oldGoal && oldGoal.amount>0){

return [{id:Date.now(), name:oldGoal.name||"هدف", amount:oldGoal.amount, saved:0}];

}

return [];

})();

let periodStart = 0;

let archivedReports = [];

let customCategories = JSON.parse(localStorage.getItem("customCategories") || "[]");

let recurringTemplates = JSON.parse(localStorage.getItem("recurringTemplates") || "[]");

const typeLabels = {

income:"دخل",

expense:"مصروف",

investment:"إيداع استثمار",

investment_withdraw:"سحب استثمار",

commitment:"إضافة التزام",

commitment_pay:"سداد التزام"

};


// -------------------------------
// تطبيق الوضع الليلي فوراً (لمنع اختفائه بعد تحديث الصفحة)
// -------------------------------

if(localStorage.getItem("darkMode")==="true"){

document.body.classList.add("dark");

}


// -------------------------------
// التحميل
// -------------------------------

loadData();

renderCustomCategoryOptions();

initPinLock();

initOnboarding();

updateAutoSplitLabel();

applyLanguage();

updateAccountUI();

processDueRecurringTransactions();

renderRecurringList();

checkInactivityReminder();

handleQuickActionShortcut();

checkBackupReminder();

document.addEventListener("DOMContentLoaded", function(){

const recurringCheckbox = document.getElementById("isRecurring");

if(recurringCheckbox){

recurringCheckbox.addEventListener("change", function(){

document.getElementById("recurringFrequency").style.display = this.checked ? "inline-block" : "none";

});

}

});

document.addEventListener("DOMContentLoaded", function(){

const pinInput = document.getElementById("pinInput");

if(pinInput){

pinInput.addEventListener("keypress", function(e){

if(e.key==="Enter") checkPin();

});

}

});


// -------------------------------
// نافذة تأكيد مخصصة (بديل عن confirm الأصلي)
// -------------------------------

function customConfirm(message, onYes){

const overlay = document.getElementById("customConfirmOverlay");

const textEl = document.getElementById("customConfirmText");

const yesBtn = document.getElementById("customConfirmYes");

const noBtn = document.getElementById("customConfirmNo");

if(!overlay || !textEl || !yesBtn || !noBtn){

if(onYes) onYes();

return;

}

textEl.textContent = message;

overlay.style.display = "flex";

const cleanup = () => {

overlay.style.display = "none";

yesBtn.onclick = null;

noBtn.onclick = null;

};

yesBtn.onclick = function(){

cleanup();

if(onYes) onYes();

};

noBtn.onclick = function(){

cleanup();

};

}

// -------------------------------
// حفظ البيانات
// -------------------------------

function saveData(){

localStorage.setItem(

"transactions",

JSON.stringify(transactions)

);

localStorage.setItem(

"monthlyBudget",

monthlyBudget

);

localStorage.setItem(

"periodStart",

periodStart

);

localStorage.setItem(

"archivedReports",

JSON.stringify(archivedReports)

);

queueSyncUpload();

}

// -------------------------------
// حسابات المستخدم والمزامنة السحابية
// -------------------------------

let syncUploadTimer = null;

function gatherAllAppData(){

return {

transactions: transactions,

monthlyBudget: monthlyBudget,

periodStart: periodStart,

archivedReports: archivedReports,

goals: goals,

customCategories: customCategories,

recurringTemplates: recurringTemplates

};

}

function applyAllAppData(data){

if(!data) return;

transactions = data.transactions || [];

monthlyBudget = data.monthlyBudget || 0;

periodStart = data.periodStart || 0;

archivedReports = data.archivedReports || [];

goals = data.goals || [];

customCategories = data.customCategories || [];

recurringTemplates = data.recurringTemplates || [];

saveData();

localStorage.setItem("goals", JSON.stringify(goals));

localStorage.setItem("customCategories", JSON.stringify(customCategories));

localStorage.setItem("recurringTemplates", JSON.stringify(recurringTemplates));

updateScreen();

renderGoals();

renderRecurringList();

renderCustomCategoryOptions();

}

function getAuthToken(){

return localStorage.getItem("authToken");

}

function isLoggedIn(){

return !!getAuthToken();

}

async function registerAccount(){

const email = document.getElementById("authEmail").value.trim();

const password = document.getElementById("authPassword").value;

if(!email || !password){

showAuthMessage("اكتب البريد وكلمة المرور");

return;

}

try{

const res = await fetch(AUTH_BASE_URL + "/auth/register", {

method:"POST",

headers:{"Content-Type":"application/json"},

body: JSON.stringify({email, password})

});

const data = await res.json();

if(!res.ok){

showAuthMessage(data.error || "تعذر إنشاء الحساب");

return;

}

localStorage.setItem("authToken", data.token);

localStorage.setItem("authEmail", data.email);

await syncUploadNow();

updateAccountUI();

showAuthMessage("تم إنشاء الحساب وتفعيل المزامنة ✅");

}catch(e){

showAuthMessage("خطأ: " + e.message);

}

}

async function loginAccount(){

const email = document.getElementById("authEmail").value.trim();

const password = document.getElementById("authPassword").value;

if(!email || !password){

showAuthMessage("اكتب البريد وكلمة المرور");

return;

}

try{

const res = await fetch(AUTH_BASE_URL + "/auth/login", {

method:"POST",

headers:{"Content-Type":"application/json"},

body: JSON.stringify({email, password})

});

const data = await res.json();

if(!res.ok){

showAuthMessage(data.error || "تعذر تسجيل الدخول");

return;

}

localStorage.setItem("authToken", data.token);

localStorage.setItem("authEmail", data.email);

const dl = await fetch(AUTH_BASE_URL + "/sync/download", {

headers:{"Authorization":"Bearer "+data.token}

});

const dlData = await dl.json();

if(dlData.data){

if(confirm("وجدنا بيانات محفوظة لهذا الحساب. هل تريد استبدال بيانات هذا الجهاز بها؟ (إلغاء = الاحتفاظ ببيانات هذا الجهاز ورفعها للحساب بدلاً من ذلك)")){

applyAllAppData(dlData.data);

}else{

await syncUploadNow();

}

}else{

await syncUploadNow();

}

updateAccountUI();

showAuthMessage("تم تسجيل الدخول ✅");

}catch(e){

showAuthMessage("خطأ: " + e.message);

}

}

async function logoutAccount(){

if(!confirm("سيتم تسجيل خروجك، وستبقى بياناتك محفوظة على هذا الجهاز فقط بعد الخروج. متابعة؟")) return;

try{

await fetch(AUTH_BASE_URL + "/auth/logout", {

method:"POST",

headers:{"Authorization":"Bearer "+getAuthToken()}

});

}catch(e){}

localStorage.removeItem("authToken");

localStorage.removeItem("authEmail");

updateAccountUI();

}

async function syncUploadNow(){

if(!isLoggedIn()) return;

try{

await fetch(AUTH_BASE_URL + "/sync/upload", {

method:"POST",

headers:{

"Content-Type":"application/json",

"Authorization":"Bearer "+getAuthToken()

},

body: JSON.stringify({data: gatherAllAppData()})

});

}catch(e){

// فشل صامت، لا نريد تعطيل استخدام التطبيق بدون إنترنت

}

}

function queueSyncUpload(){

if(!isLoggedIn()) return;

if(syncUploadTimer) clearTimeout(syncUploadTimer);

syncUploadTimer = setTimeout(syncUploadNow, 2000);

}

function showAuthMessage(msg){

const el = document.getElementById("authMessage");

if(el) el.textContent = msg;

}

function updateAccountUI(){

const loggedInBox = document.getElementById("accountLoggedIn");

const loggedOutBox = document.getElementById("accountLoggedOut");

const emailLabel = document.getElementById("accountEmailLabel");

if(!loggedInBox || !loggedOutBox) return;

if(isLoggedIn()){

loggedInBox.style.display = "block";

loggedOutBox.style.display = "none";

if(emailLabel) emailLabel.textContent = localStorage.getItem("authEmail") || "";

}else{

loggedInBox.style.display = "none";

loggedOutBox.style.display = "block";

}

}


// -------------------------------
// تحميل البيانات
// -------------------------------

function loadData(){

transactions = JSON.parse(

localStorage.getItem("transactions")

) || [];

monthlyBudget = Number(

localStorage.getItem("monthlyBudget")

) || 0;

periodStart = Number(

localStorage.getItem("periodStart")

) || 0;

archivedReports = JSON.parse(

localStorage.getItem("archivedReports")

) || [];

  transactions.forEach(item=>{

if(!item.category){

item.category="أخرى";

}

});
  
updateScreen();

}

// -------------------------------
// حساب الإجماليات
// -------------------------------

function getTotals(){

let income = 0;

let expense = 0;

let investment = 0;

let commitment = 0;

let periodIncome = 0;

let periodExpense = 0;

let periodInvestment = 0;

let periodCommitment = 0;

transactions.forEach(item=>{

const amt = Number(item.amount);

const inPeriod = item.id>=periodStart;

if(item.type==="income"){

income += amt;

if(inPeriod){

periodIncome += amt;

}

}

else if(item.type==="expense"){

expense += amt;

if(inPeriod){ periodExpense += amt; }

}

else if(item.type==="investment"){

investment += amt;

if(inPeriod){ periodInvestment += amt; }

}

else if(item.type==="investment_withdraw"){

investment -= amt;

if(inPeriod){ periodInvestment -= amt; }

}

else if(item.type==="commitment"){

commitment += amt;

if(inPeriod){ periodCommitment += amt; }

}

else if(item.type==="commitment_pay"){

commitment -= amt;

if(inPeriod){ periodCommitment -= amt; }

}

else{

investment += amt;

if(inPeriod){ periodInvestment += amt; }

}

});

return{

income,

expense,

investment,

commitment,

periodIncome,

periodExpense,

periodInvestment,

periodCommitment,

balance:

income-expense-investment-commitment

};

}

// -------------------------------
// إضافة أو تعديل عملية
// -------------------------------

// -------------------------------
// اختيار التصنيف تلقائياً حسب اسم العملية
// -------------------------------

const categoryKeywords = {

"طعام":["طعام","اكل","أكل","مطعم","غداء","غدا","عشاء","فطور","فطار","وجبة","برجر","بيتزا","كيك","حلا","حلى","قهوة","كافيه","مقهى","بوفيه"],

"مواصلات":["مواصلات","بنزين","وقود","تاكسي","تكسي","اوبر","أوبر","كريم","سيارة","تكس","مشوار","صيانة سيارة","تكسي"],

"سكن":["سكن","ايجار","إيجار","شقة","بيت","كهرباء","ماء","صيانة منزل"],

"فواتير":["فاتورة","فواتير","اشتراك","انترنت","إنترنت","جوال","اتصالات","stc","موبايلي","زين"],

"تسوق":["تسوق","ملابس","بقالة","سوبرماركت","بقاله","سوق","مشتريات","امازون","أمازون","نون"],

"ترفيه":["ترفيه","سينما","لعبة","العاب","ألعاب","اشتراك ترفيه","نتفلكس","شاهد"],

"راتب":["راتب","معاش","دخل شهري"],

"استثمار":["استثمار","اسهم","أسهم","صندوق","محفظة","تداول"],

"التزامات":["التزام","التزامات","قسط","سداد","دين","قرض"]

};

function autoSelectCategory(){

const text = document.getElementById("description").value.trim().toLowerCase();

if(!text) return;

const categorySelect = document.getElementById("category");

for(const category in categoryKeywords){

const keywords = categoryKeywords[category];

for(const keyword of keywords){

if(text.includes(keyword.toLowerCase())){

categorySelect.value = category;

return;

}

}

}

}

// -------------------------------
// الإدخال الصوتي
// -------------------------------

function startVoiceInput(){

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if(!SpeechRecognition){

alert("متصفحك لا يدعم الإدخال الصوتي، جرب متصفح كروم على الأندرويد.");

return;

}

const recognition = new SpeechRecognition();

recognition.lang = "ar-SA";

recognition.interimResults = false;

recognition.maxAlternatives = 1;

const btn = document.getElementById("voiceInputBtn");

btn.classList.add("listening");

btn.textContent = "🔴";

recognition.onresult = function(event){

const transcript = event.results[0][0].transcript;

const descInput = document.getElementById("description");

descInput.value = transcript;

autoSelectCategory();

};

recognition.onerror = function(){

alert("تعذر التعرف على الصوت، حاول مرة أخرى.");

};

recognition.onend = function(){

btn.classList.remove("listening");

btn.textContent = "🎤";

};

recognition.start();

}

// -------------------------------
// كشف العمليات المكررة
// -------------------------------

function isProbableDuplicate(description, amount, type){

const twoMinutes = 2*60*1000;

const now = Date.now();

return transactions.some(item=>

item.description===description &&

item.amount===amount &&

item.type===type &&

!item.autoSplit &&

(now - item.id) < twoMinutes

);

}

function addTransaction(){

const description = document
.getElementById("description")
.value.trim();

const amount = Number(
document.getElementById("amount").value
);

const type =
document.getElementById("type").value;

const category =
document.getElementById("category").value;
  
if(description===""){

alert("اكتب اسم العملية");

return;

}

if(amount<=0){

alert("أدخل مبلغًا صحيحًا");

return;

}

if(editingId===null && isProbableDuplicate(description, amount, type)){

customConfirm(

"يبدو أنك أضفت عملية مشابهة قبل قليل (\""+description+"\" بمبلغ "+amount+"). هل تريد إضافتها مرة أخرى؟",

function(){ proceedAddTransaction(description, amount, type, category); }

);

return;

}

proceedAddTransaction(description, amount, type, category);

}

function proceedAddTransaction(description, amount, type, category){

if(editingId===null){

const newId = Date.now();

transactions.push({

id:newId,

description:description,

amount:amount,

type:type,

category:category,

date:new Date().toLocaleDateString("ar-SA"),

time:new Date().toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"})

});

if(type==="income" && localStorage.getItem("autoSplitEnabled")!=="false"){

applyIncomeSplit(newId, description, amount);

}

const recurringCheckbox = document.getElementById("isRecurring");

if(recurringCheckbox && recurringCheckbox.checked){

saveRecurringTemplate(description, amount, type, category);

recurringCheckbox.checked = false;

document.getElementById("recurringFrequency").style.display = "none";

}

}else{

const index = transactions.findIndex(

item=>item.id===editingId

);

transactions[index]={

...transactions[index],

description:description,

amount:amount,

type:type,

category:category

};

editingId=null;

document.getElementById("addBtn").innerText="➕ إضافة العملية";

}

saveData();

updateScreen();

clearForm();

}

// -------------------------------
// تقسيم الدخل التلقائي 33/33/33
// -------------------------------

function applyIncomeSplit(baseId, sourceDescription, totalAmount){

const share = Math.round(totalAmount/3/10) * 10;

const now = new Date();

const dateStr = now.toLocaleDateString("ar-SA");

const timeStr = now.toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"});

transactions.push({

id: baseId+1,

description: "تقسيم تلقائي — التزامات (من: "+sourceDescription+")",

amount: share,

type: "commitment",

category: "التزامات",

date: dateStr,

time: timeStr,

autoSplit: true,

splitFrom: baseId

});

transactions.push({

id: baseId+2,

description: "تقسيم تلقائي — استثمار (من: "+sourceDescription+")",

amount: share,

type: "investment",

category: "استثمار",

date: dateStr,

time: timeStr,

autoSplit: true,

splitFrom: baseId

});

const remaining = Math.round((totalAmount - share*2) * 100) / 100;

showSplitToast(share, share, remaining);

}

function showSplitToast(commitmentShare, investmentShare, balanceShare){

let toast = document.getElementById("splitToast");

if(!toast){

toast = document.createElement("div");

toast.id = "splitToast";

toast.className = "split-toast";

document.body.appendChild(toast);

}

toast.innerHTML = `

<div class="split-toast-title">💡 تم تقسيم الدخل تلقائياً</div>

<div class="split-toast-row">📌 التزامات: ${commitmentShare.toLocaleString()} </div>

<div class="split-toast-row">📈 استثمار: ${investmentShare.toLocaleString()} </div>

<div class="split-toast-row">💰 رصيد متاح: ${balanceShare.toLocaleString()} </div>

`;

toast.classList.add("show");

setTimeout(()=>{

toast.classList.remove("show");

}, 4500);

}

// -------------------------------
// تعديل عملية
// -------------------------------

function editTransaction(id){

const item = transactions.find(

t=>t.id===id

);

if(!item)return;

document.getElementById("description").value=item.description;

document.getElementById("amount").value=item.amount;

document.getElementById("type").value=item.type;

  document.getElementById("category").value=item.category;
editingId=id;

document.getElementById("addBtn").innerText="💾 حفظ التعديل";

showPage("transactions");

}

// -------------------------------
// حذف عملية
// -------------------------------

let lastDeletedTransaction = null;

let lastDeletedIndex = null;

let undoTimeoutId = null;

function deleteTransaction(id){

const index = transactions.findIndex(item=>item.id===id);

if(index===-1) return;

lastDeletedTransaction = transactions[index];

lastDeletedIndex = index;

transactions = transactions.filter(item=>item.id!==id);

saveData();

updateScreen();

showUndoToast();

}

function showUndoToast(){

let toast = document.getElementById("undoToast");

if(!toast){

toast = document.createElement("div");

toast.id = "undoToast";

toast.className = "undo-toast";

document.body.appendChild(toast);

}

toast.innerHTML = `

<span>🗑️ تم حذف العملية</span>

<button onclick="undoDelete()">تراجع</button>

`;

toast.classList.add("show");

if(undoTimeoutId) clearTimeout(undoTimeoutId);

undoTimeoutId = setTimeout(()=>{

toast.classList.remove("show");

lastDeletedTransaction = null;

lastDeletedIndex = null;

}, 5000);

}

function undoDelete(){

if(lastDeletedTransaction===null) return;

const insertAt = Math.min(lastDeletedIndex, transactions.length);

transactions.splice(insertAt, 0, lastDeletedTransaction);

lastDeletedTransaction = null;

lastDeletedIndex = null;

if(undoTimeoutId) clearTimeout(undoTimeoutId);

const toast = document.getElementById("undoToast");

if(toast) toast.classList.remove("show");

saveData();

updateScreen();

}

// -------------------------------
// تنظيف الحقول
// -------------------------------

function clearForm(){

document.getElementById("description").value="";

document.getElementById("amount").value="";

document.getElementById("type").value="expense";

document.getElementById("category").value="أخرى";
  
}

// -------------------------------
// تصنيفات مخصصة
// -------------------------------

function handleCategoryChange(){

const select = document.getElementById("category");

if(select.value === "__add_custom__"){

const name = prompt("اكتب اسم التصنيف الجديد:");

if(name && name.trim()!==""){

addCustomCategory(name.trim());

select.value = name.trim();

} else {

select.value = "أخرى";

}

}

}

function addCustomCategory(name){

if(customCategories.includes(name)) return;

customCategories.push(name);

localStorage.setItem("customCategories", JSON.stringify(customCategories));

queueSyncUpload();

renderCustomCategoryOptions();

}

function renderCustomCategoryOptions(){

const select = document.getElementById("category");

if(!select) return;

const addOption = select.querySelector('option[value="__add_custom__"]');

customCategories.forEach(cat=>{

if(!select.querySelector(`option[value="${cat}"]`)){

const opt = document.createElement("option");

opt.value = cat;

opt.textContent = "🏷️ " + cat;

select.insertBefore(opt, addOption);

}

});

}

// -------------------------------
// شاشة الترحيب الأولى - تم إصلاحها
// -------------------------------

let onboardingCurrentStep = 1;

function initOnboarding(){

if(localStorage.getItem("onboardingDone")==="true") return;

document.getElementById("onboardingScreen").style.display = "flex";

}

function onboardingNext(){

try{

if(onboardingCurrentStep === 1){

// انتقل للخطوة 2
document.getElementById("onboardingStep1").style.display = "none";
document.get
  
