// ===============================
// ميزانيتي v2.0
// Mr.AI
// ===============================

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

recordBalanceSnapshot();

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

const AUTH_BASE_URL = "https://raspy-hall-5d31.ahmed253340.workers.dev";

let syncUploadTimer = null;

function gatherAllAppData(){

return {

transactions: transactions,

monthlyBudget: monthlyBudget,

periodStart: periodStart,

archivedReports: archivedReports,

goals: goals,

categoryBudgets: categoryBudgets,

customCategories: customCategories,

recurringTemplates: recurringTemplates,

balanceHistory: balanceHistory

};

}

function applyAllAppData(data){

if(!data) return;

transactions = data.transactions || [];

monthlyBudget = data.monthlyBudget || 0;

periodStart = data.periodStart || 0;

archivedReports = data.archivedReports || [];

goals = data.goals || [];

categoryBudgets = data.categoryBudgets || {};

customCategories = data.customCategories || [];

recurringTemplates = data.recurringTemplates || [];

balanceHistory = data.balanceHistory || [];

saveData();

localStorage.setItem("goals", JSON.stringify(goals));

localStorage.setItem("categoryBudgets", JSON.stringify(categoryBudgets));

localStorage.setItem("customCategories", JSON.stringify(customCategories));

localStorage.setItem("recurringTemplates", JSON.stringify(recurringTemplates));

localStorage.setItem("balanceHistory", JSON.stringify(balanceHistory));

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

transactions.forEach(item=>{

const amt = Number(item.amount);

if(item.type==="income"){

income += amt;

if(item.id>=periodStart){

periodIncome += amt;

}

}

else if(item.type==="expense"){

expense += amt;

}

else if(item.type==="investment"){

investment += amt;

}

else if(item.type==="investment_withdraw"){

investment -= amt;

}

else if(item.type==="commitment"){

commitment += amt;

}

else if(item.type==="commitment_pay"){

commitment -= amt;

}

else{

investment += amt;

}

});

return{

income,

expense,

investment,

commitment,

periodIncome,

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

if(!confirm("يبدو أنك أضفت عملية مشابهة قبل قليل (\""+description+"\" بمبلغ "+amount+"). هل تريد إضافتها مرة أخرى؟")){

return;

}

}

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

const share = Math.round((totalAmount/3) * 100) / 100;

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
// شاشة الترحيب الأولى
// -------------------------------

let onboardingCurrentStep = 1;

function initOnboarding(){

if(localStorage.getItem("onboardingDone")==="true") return;

document.getElementById("onboardingScreen").style.display = "flex";

}

function onboardingNext(){

if(onboardingCurrentStep < 3){

document.getElementById("onboardingStep"+onboardingCurrentStep).style.display = "none";

document.getElementById("dot"+onboardingCurrentStep).classList.remove("active");

onboardingCurrentStep++;

document.getElementById("onboardingStep"+onboardingCurrentStep).style.display = "block";

document.getElementById("dot"+onboardingCurrentStep).classList.add("active");

if(onboardingCurrentStep===3){

document.getElementById("onboardingBtn").textContent = "ابدأ الآن";

}

} else {

localStorage.setItem("onboardingDone","true");

document.getElementById("onboardingScreen").style.display = "none";

}

}

// -------------------------------
// قفل رمز PIN
// -------------------------------

function initPinLock(){

const pin = localStorage.getItem("appPin");

if(pin){

document.getElementById("pinLockScreen").style.display = "flex";

document.getElementById("pinInput").focus();

}

updatePinSettingsLabel();

}

function checkPin(){

const entered = document.getElementById("pinInput").value;

const saved = localStorage.getItem("appPin");

if(entered === saved){

document.getElementById("pinLockScreen").style.display = "none";

document.getElementById("pinInput").value = "";

document.getElementById("pinError").textContent = "";

} else {

document.getElementById("pinError").textContent = "رمز خاطئ، حاول مرة أخرى";

document.getElementById("pinInput").value = "";

}

}

function openPinSettings(){

const current = localStorage.getItem("appPin");

if(current){

if(confirm("هل تريد إلغاء قفل التطبيق؟")){

localStorage.removeItem("appPin");

updatePinSettingsLabel();

}

} else {

const newPin = prompt("اكتب رمز مكوّن من 4 أرقام:");

if(newPin && newPin.trim().length>=4){

localStorage.setItem("appPin", newPin.trim());

alert("تم تفعيل قفل التطبيق ✅");

updatePinSettingsLabel();

} else if(newPin!==null){

alert("الرمز يجب أن يكون 4 أرقام على الأقل");

}

}

}

function updatePinSettingsLabel(){

const label = document.getElementById("pinSettingsLabel");

if(!label) return;

const lang = localStorage.getItem("appLanguage") || "ar";

const hasPin = !!localStorage.getItem("appPin");

if(lang==="en"){

label.textContent = hasPin ? "Remove App Lock" : "Lock App";

}else{

label.textContent = hasPin ? "إلغاء قفل التطبيق" : "قفل التطبيق";

}

}

// -------------------------------
// دعم اللغة (عربي / إنجليزي)
// -------------------------------

const translations = {

appName:{ar:"💰 ميزانيتي",en:"💰 My Budget"},

appTagline:{ar:"إدارة أموالك بطريقة ذكية",en:"Manage your money smartly"},

currentBalance:{ar:"💵 الرصيد الحالي",en:"💵 Current Balance"},

expenses:{ar:"📉 المصروفات",en:"📉 Expenses"},

commitments:{ar:"📌 الالتزامات",en:"📌 Commitments"},

investments:{ar:"🌱 الاستثمارات",en:"🌱 Investments"},

quickActions:{ar:"⚡ إجراءات سريعة",en:"⚡ Quick Actions"},

addTransaction:{ar:"إضافة عملية",en:"Add Transaction"},

financialSummary:{ar:"الملخص المالي",en:"Financial Summary"},

statistics:{ar:"الإحصائيات",en:"Statistics"},

settings:{ar:"الإعدادات",en:"Settings"},

recentTransactions:{ar:"🕒 آخر العمليات",en:"🕒 Recent Transactions"},

noTransactionsYet:{ar:"لا توجد عمليات حتى الآن.",en:"No transactions yet."},

monthlyReport:{ar:"📅 التقرير الشهري",en:"📅 Monthly Report"},

income:{ar:"💰 الدخل:",en:"💰 Income:"},

expensesLabel:{ar:"💸 المصروفات:",en:"💸 Expenses:"},

investmentsLabel:{ar:"🌱 الاستثمارات:",en:"🌱 Investments:"},

commitmentsLabel:{ar:"📌 الالتزامات:",en:"📌 Commitments:"},

balanceLabel:{ar:"💼 الرصيد:",en:"💼 Balance:"},

transactionCountLabel:{ar:"📝 عدد العمليات:",en:"📝 Transaction Count:"},

saveReportBtn:{ar:"💾 حفظ التقرير وبدء شهر جديد",en:"💾 Save Report & Start New Month"},

navTransactions:{ar:"العمليات",en:"Transactions"},

navHome:{ar:"الرئيسية",en:"Home"},

navSummary:{ar:"الملخص",en:"Summary"},

financialSummary2:{ar:"💰 الملخص المالي",en:"💰 Financial Summary"},

summarySubtitle:{ar:"نظرة سريعة على وضعك المالي",en:"A quick look at your finances"},

statistics2:{ar:"📊 الإحصائيات",en:"📊 Statistics"},

manageTransactions:{ar:"📝 إدارة العمليات",en:"📝 Manage Transactions"},

manageTransSubtitle:{ar:"أضف وعدل واحذف عملياتك المالية",en:"Add, edit, and delete your transactions"},

descPlaceholder:{ar:"📝 اسم العملية",en:"📝 Transaction name"},

amountPlaceholder:{ar:"💰 المبلغ",en:"💰 Amount"},

typeExpense:{ar:"📈 مصروف",en:"📈 Expense"},

typeIncome:{ar:"📉 دخل",en:"📉 Income"},

typeCommitmentPay:{ar:"📌 سداد التزام",en:"📌 Pay Commitment"},

typeCommitment:{ar:"📌 إضافة التزام",en:"📌 Add Commitment"},

typeInvestment:{ar:"🌱 إيداع استثمار",en:"🌱 Investment Deposit"},

typeInvestmentWithdraw:{ar:"🌱 سحب استثمار",en:"🌱 Investment Withdraw"},

categoryLabel:{ar:"📂 التصنيف",en:"📂 Category"},

catFood:{ar:"🍔 طعام",en:"🍔 Food"},

catTransport:{ar:"🚗 مواصلات",en:"🚗 Transport"},

catHousing:{ar:"🏠 سكن",en:"🏠 Housing"},

catBills:{ar:"💡 فواتير",en:"💡 Bills"},

catShopping:{ar:"🛍️ تسوق",en:"🛍️ Shopping"},

catEntertainment:{ar:"🎮 ترفيه",en:"🎮 Entertainment"},

catInvestment:{ar:"📈 استثمار",en:"📈 Investment"},

catCommitments:{ar:"📌 التزامات",en:"📌 Commitments"},

catSalary:{ar:"💼 راتب",en:"💼 Salary"},

catOther:{ar:"✨ أخرى",en:"✨ Other"},

catAddCustom:{ar:"➕ إضافة تصنيف جديد",en:"➕ Add custom category"},

addBtn:{ar:"➕ إضافة العملية",en:"➕ Add Transaction"},

searchPlaceholder:{ar:"🔍 ابحث عن عملية...",en:"🔍 Search transactions..."},

filterAll:{ar:"📋 جميع العمليات",en:"📋 All Transactions"},

filterExpense:{ar:"📈 المصروفات",en:"📈 Expenses"},

filterIncome:{ar:"📉 الدخل",en:"📉 Income"},

filterInvestment:{ar:"🌱 الاستثمارات",en:"🌱 Investments"},

filterCommitment:{ar:"📌 الالتزامات",en:"📌 Commitments"},

transactionHistory:{ar:"📜 سجل العمليات",en:"📜 Transaction History"},

noTransactionsYet2:{ar:"لا توجد عمليات حتى الآن.",en:"No transactions yet."},

settingsTitle:{ar:"⚙️ الإعدادات",en:"⚙️ Settings"},

settingsSubtitle:{ar:"إعدادات التطبيق والأدوات",en:"App settings and tools"},

darkMode:{ar:"الوضع الليلي",en:"Dark Mode"},

backup:{ar:"نسخة احتياطية",en:"Backup"},

restore:{ar:"استعادة البيانات",en:"Restore Data"},

exportPdf:{ar:"تصدير PDF",en:"Export PDF"},

exportExcel:{ar:"تصدير Excel",en:"Export Excel"},

installApp:{ar:"تثبيت التطبيق",en:"Install App"},

langToggle:{ar:"English",en:"العربية"},

financialGoals:{ar:"🎯 الأهداف المالية",en:"🎯 Financial Goals"},

goalNamePlaceholder:{ar:"اسم الهدف",en:"Goal name"},

goalAmountPlaceholder:{ar:"قيمة الهدف",en:"Goal amount"},

addGoalBtn:{ar:"➕ إضافة هدف جديد",en:"➕ Add New Goal"},

appIdeaTitle:{ar:"💡 فكرة ميزانيتي",en:"💡 How It Works"},

appIdeaIntro:{ar:"كل دخل يدخل يُقسَّم تلقائياً 3 أقسام متساوية:",en:"Every income is automatically split into 3 equal parts:"},

appIdeaCommitment:{ar:"📌 <b>1/3 التزامات</b> — مصاريف ضرورية (إيجار، كهرباء، إنترنت)",en:"📌 <b>1/3 Commitments</b> — essential expenses (rent, electricity, internet)"},

appIdeaInvestment:{ar:"📈 <b>1/3 استثمار</b> — رأس مال يتجمّع لمشروعك",en:"📈 <b>1/3 Investment</b> — capital building up for your project"},

appIdeaBalance:{ar:"💰 <b>1/3 رصيد متاح</b> — مصروف حر (ترفيه، مطاعم، مواصلات)",en:"💰 <b>1/3 Available Balance</b> — free spending (fun, dining, transport)"},

appIdeaNote:{ar:"يمكنك إيقاف التقسيم التلقائي من الزر أعلاه في أي وقت.",en:"You can turn off auto-split from the button above anytime."}

};

function applyLanguage(){

const lang = "ar";

localStorage.setItem("appLanguage", "ar");

document.documentElement.lang = lang;

document.documentElement.dir = "rtl";

document.querySelectorAll("[data-i18n]").forEach(el=>{

const key = el.getAttribute("data-i18n");

if(translations[key]) el.textContent = translations[key][lang];

});

document.querySelectorAll("[data-i18n-html]").forEach(el=>{

const key = el.getAttribute("data-i18n-html");

if(translations[key]) el.innerHTML = translations[key][lang];

});

document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{

const key = el.getAttribute("data-i18n-placeholder");

if(translations[key]) el.placeholder = translations[key][lang];

});

}

function toggleAutoSplit(){

const enabled = localStorage.getItem("autoSplitEnabled")!=="false";

localStorage.setItem("autoSplitEnabled", enabled ? "false" : "true");

updateAutoSplitLabel();

}

function updateAutoSplitLabel(){

const label = document.getElementById("autoSplitLabel");

if(!label) return;

const enabled = localStorage.getItem("autoSplitEnabled")!=="false";

const lang = localStorage.getItem("appLanguage") || "ar";

if(lang==="en"){

label.textContent = enabled ? "33% Income Split (On)" : "33% Income Split (Off)";

}else{

label.textContent = enabled ? "تقسيم الدخل 33٪ (مفعّل)" : "تقسيم الدخل 33٪ (متوقف)";

}

}

// -------------------------------
// تحديث الشاشة بالكامل
// -------------------------------

function updateScreen(){

updateHome();

updateSummary();

updateMonthlyReport();

updateBudget();

renderGoals();

updateAlerts();

updateHistory();

updateChart();

updateStatsPage();

}

// -------------------------------
// تحديث الصفحة الرئيسية
// -------------------------------

function updateHome(){

const totals = getTotals();

document.getElementById("homeBalance").textContent =
totals.balance + " ريال";

document.getElementById("homeExpense").textContent =
totals.expense + " ريال";

document.getElementById("homeInvest").textContent =
totals.investment + " ريال";

document.getElementById("homeCommitment").textContent =
totals.commitment + " ريال";

}

// -------------------------------
// تحديث الملخص المالي
// -------------------------------

function updateSummary(){

const totals = getTotals();

document.getElementById("incomeSummary").textContent =
totals.periodIncome + " ريال";

document.getElementById("expenseSummary").textContent =
totals.expense + " ريال";

document.getElementById("investSummary").textContent =
totals.investment + " ريال";

document.getElementById("commitmentSummary").textContent =
totals.commitment + " ريال";

document.getElementById("remainSummary").textContent =
totals.balance + " ريال";

}

// -------------------------------
// التقرير الشهري
// -------------------------------

function updateMonthlyReport(){

const totals = getTotals();

document.getElementById("reportIncome").textContent =
totals.periodIncome + " ريال";

document.getElementById("reportExpense").textContent =
totals.expense + " ريال";

document.getElementById("reportInvestment").textContent =
totals.investment + " ريال";

document.getElementById("reportCommitment").textContent =
totals.commitment + " ريال";

document.getElementById("reportBalance").textContent =
totals.balance + " ريال";

document.getElementById("reportCount").textContent =
transactions.length;

renderArchivedReports();

}

// -------------------------------
// أرشفة التقرير الشهري
// -------------------------------

function saveMonthlyReport(){

const totals = getTotals();

const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

const now = new Date();

const label = monthNames[now.getMonth()] + " " + now.getFullYear();

if(!confirm(`سيتم حفظ تقرير "${label}" وبدء تسجيل دخل جديد من الصفر. هل تريد المتابعة؟`)){

return;

}

archivedReports.push({

id: Date.now(),

label: label,

income: totals.periodIncome,

expense: totals.expense,

investment: totals.investment,

commitment: totals.commitment,

balance: totals.balance,

count: transactions.length

});

periodStart = Date.now();

saveData();

updateScreen();

}

function editArchivedReport(id){

const report = archivedReports.find(r=>r.id===id);

if(!report) return;

const newLabel = prompt("تعديل اسم الفترة:", report.label);

if(newLabel===null) return;

const newIncome = prompt("تعديل قيمة الدخل (ريال):", report.income);

if(newIncome===null) return;

const newExpense = prompt("تعديل قيمة المصروفات (ريال):", report.expense);

if(newExpense===null) return;

report.label = newLabel.trim() || report.label;

report.income = Number(newIncome) || 0;

report.expense = Number(newExpense) || 0;

saveData();

updateScreen();

}

function deleteArchivedReport(id){

if(!confirm("هل تريد حذف هذا التقرير المؤرشف نهائياً؟")){

return;

}

archivedReports = archivedReports.filter(r=>r.id!==id);

saveData();

updateScreen();

}

function renderArchivedReports(){

const container = document.getElementById("archivedReportsList");

if(!container) return;

if(archivedReports.length===0){

container.innerHTML = "";

return;

}

container.innerHTML = "";

archivedReports.slice().reverse().forEach(r=>{

const div = document.createElement("div");

div.className = "report-card archived-report";

div.innerHTML = `

<div class="archived-report-header">

<h2>📅 ${r.label}</h2>

<div>

<button onclick="editArchivedReport(${r.id})">✏️</button>

<button onclick="deleteArchivedReport(${r.id})">🗑️</button>

</div>

</div>

<p>💰 الدخل: ${r.income} ريال</p>

<p>💸 المصروفات: ${r.expense} ريال</p>

<p>🌱 الاستثمارات: ${r.investment} ريال</p>

<p>📌 الالتزامات: ${r.commitment} ريال</p>

<p>💼 الرصيد: ${r.balance} ريال</p>

<p>📝 عدد العمليات: ${r.count}</p>

`;

container.appendChild(div);

});

}

// -------------------------------
// عرض العمليات
// -------------------------------

// -------------------------------
// تنبيه النسخ الاحتياطي الدوري
// -------------------------------

function checkBackupReminder(){

if(transactions.length<5) return;

const lastBackup = localStorage.getItem("lastBackupDate");

const twoWeeks = 14*24*60*60*1000;

const now = Date.now();

if(lastBackup && (now-Number(lastBackup))<twoWeeks) return;

const dismissedToday = localStorage.getItem("backupReminderDismissedOn");

if(dismissedToday===new Date().toDateString()) return;

const banner = document.getElementById("backupReminderBanner");

if(banner) banner.style.display = "flex";

}

function dismissBackupReminder(){

localStorage.setItem("backupReminderDismissedOn", new Date().toDateString());

document.getElementById("backupReminderBanner").style.display = "none";

}

// -------------------------------
// اختصارات الأيقونة السريعة (PWA Shortcuts)
// -------------------------------

function handleQuickActionShortcut(){

const params = new URLSearchParams(window.location.search);

const quickAction = params.get("quickAction");

if(quickAction!=="income" && quickAction!=="expense") return;

showPage("transactions");

setTimeout(()=>{

const typeSelect = document.getElementById("type");

const descInput = document.getElementById("description");

if(typeSelect) typeSelect.value = quickAction;

if(descInput) descInput.focus();

}, 100);

}

// -------------------------------
// تذكير لطيف داخل التطبيق
// -------------------------------

function checkInactivityReminder(){

if(transactions.length===0) return;

const lastTx = transactions[transactions.length-1];

const lastTime = lastTx.id;

const daysSince = Math.floor((Date.now()-lastTime)/(1000*60*60*24));

if(daysSince<2) return;

const todayKey = new Date().toDateString();

if(localStorage.getItem("reminderDismissedOn")===todayKey) return;

const banner = document.getElementById("reminderBanner");

const text = document.getElementById("reminderText");

if(!banner || !text) return;

text.textContent = `👋 لم تسجل أي عملية منذ ${daysSince} يوم/أيام، لا تنسَ تحديث ميزانيتك!`;

banner.style.display = "flex";

}

function dismissReminder(){

localStorage.setItem("reminderDismissedOn", new Date().toDateString());

document.getElementById("reminderBanner").style.display = "none";

}

// -------------------------------
// إيماءات السحب على العمليات
// -------------------------------

function attachSwipeHandlers(el, id){

let startX = 0;

let currentX = 0;

let dragging = false;

el.addEventListener("touchstart", function(e){

startX = e.touches[0].clientX;

dragging = true;

el.style.transition = "none";

}, {passive:true});

el.addEventListener("touchmove", function(e){

if(!dragging) return;

currentX = e.touches[0].clientX - startX;

if(currentX>0) currentX = 0;

if(currentX<-90) currentX = -90;

el.style.transform = `translateX(${currentX}px)`;

}, {passive:true});

el.addEventListener("touchend", function(){

dragging = false;

el.style.transition = "transform 0.2s ease";

if(currentX < -60){

el.style.transform = "translateX(-100%)";

setTimeout(()=>deleteTransaction(id), 150);

}else{

el.style.transform = "translateX(0)";

}

currentX = 0;

});

}

function updateHistory(){

const list = document.getElementById("historyList");

const recent = document.getElementById("recentTransactions");

list.innerHTML = "";

recent.innerHTML = "";

if(transactions.length===0){

list.innerHTML="<p class='empty'>لا توجد عمليات.</p>";

recent.innerHTML="<p class='empty'>لا توجد عمليات.</p>";

return;

}

transactions.slice().reverse().forEach(item=>{

const wrapper=document.createElement("div");

wrapper.className="swipe-wrapper";

wrapper.style.position="relative";

wrapper.style.overflow="hidden";

wrapper.style.borderRadius="14px";

wrapper.style.marginBottom="10px";

const deleteAction=document.createElement("div");

deleteAction.className="swipe-action swipe-delete";

deleteAction.textContent="🗑️ حذف";

deleteAction.style.cssText="position:absolute;top:0;bottom:0;width:90px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;color:white;z-index:1;left:0;background:#E53935;";

wrapper.appendChild(deleteAction);

const div=document.createElement("div");

div.className="transaction-item";

div.dataset.type=item.type;

div.style.position="relative";

div.style.zIndex="2";

div.style.width="100%";

div.style.boxSizing="border-box";

div.style.background = document.body.classList.contains("dark") ? "#1E1E1E" : "white";

div.innerHTML=`

<div>

<strong>${item.description}</strong><br>

<small>📂 ${item.category} — ${typeLabels[item.type]||item.type}</small><br>

<small>📅 ${item.date}${item.time ? " 🕒 " + item.time : ""}</small>

</div>

<div>

<strong>${item.amount} ريال</strong>

</div>

<div>

<button onclick="editTransaction(${item.id})">✏️</button>

<button onclick="deleteTransaction(${item.id})">🗑️</button>

</div>

`;

wrapper.appendChild(div);

list.appendChild(wrapper);

attachSwipeHandlers(div, item.id);

});

transactions.slice(-5).reverse().forEach(item=>{

const div=document.createElement("div");

div.className="recent-item";

div.innerHTML=`

<div>

<strong>${item.description}</strong><br>

<small>📅 ${item.date}${item.time ? " 🕒 " + item.time : ""}</small>

</div>

<span>${item.amount} ريال</span>

`;

recent.appendChild(div);

});

document.getElementById("transactionCount").textContent=
transactions.length;


// أعلى فئة صرف

const expenseCategories = {};

transactions.forEach(item=>{

if(item.type==="expense"){

const category=item.category || "أخرى";

expenseCategories[category]=

(expenseCategories[category]||0)+Number(item.amount);

}

});

let topCategory="لا توجد بيانات";

let maxAmount=0;

for(const category in expenseCategories){

if(expenseCategories[category]>maxAmount){

maxAmount=expenseCategories[category];

topCategory=category;

}

}

const topCategoryElement=document.getElementById("topCategory");

if(topCategoryElement){

if(maxAmount>0){

topCategoryElement.textContent=

`${topCategory} (${maxAmount} ريال)`;

}else{

topCategoryElement.textContent="لا توجد بيانات";

}

}

}

// -------------------------------
// الرسم البياني
// -------------------------------

function updateChart(){

const totals = getTotals();

const ctx = document.getElementById("financeChart");

if(!ctx) return;

if(chart){

chart.destroy();

}

chart = new Chart(ctx,{

type:"doughnut",

data:{

labels:[

"الدخل",

"المصروفات",

"الاستثمارات",

"الالتزامات"

],

datasets:[{

data:[

totals.income,

totals.expense,

Math.max(totals.investment,0),

Math.max(totals.commitment,0)

],

backgroundColor:[

"#4CAF50",

"#F44336",

"#7C3AED",

"#FF9800"

],

borderWidth:2

}]

},

options:{

responsive:true,

plugins:{

legend:{

position:"bottom"

}

}

}

});

}

// -------------------------------
// لوحة الإحصائيات الاحترافية
// -------------------------------

function updateStatsPage(){

const totals = getTotals();

const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

const now = new Date();

const monthLabelEl = document.getElementById("statsMonthLabel");

if(monthLabelEl){

monthLabelEl.textContent = monthNames[now.getMonth()] + " " + now.getFullYear();

}

const statsIncomeEl = document.getElementById("statsIncome");

const statsExpenseEl = document.getElementById("statsExpense");

const statsInvestmentEl = document.getElementById("statsInvestment");

if(statsIncomeEl) statsIncomeEl.textContent = totals.periodIncome + " ريال";

if(statsExpenseEl) statsExpenseEl.textContent = totals.expense + " ريال";

if(statsInvestmentEl) statsInvestmentEl.textContent = totals.investment + " ريال";

// تفصيل المصروفات حسب التصنيف (أين ذهبت أموالي)

const expenseByCategory = {};

let totalExpense = 0;

transactions.forEach(item=>{

if(item.type==="expense"){

const cat = item.category || "أخرى";

expenseByCategory[cat] = (expenseByCategory[cat]||0) + Number(item.amount);

totalExpense += Number(item.amount);

}

});

const breakdownContainer = document.getElementById("categoryBreakdownList");

if(breakdownContainer){

if(totalExpense===0){

breakdownContainer.innerHTML = "<p class='empty'>لا توجد بيانات كافية بعد</p>";

}else{

const sorted = Object.entries(expenseByCategory).sort((a,b)=>b[1]-a[1]);

breakdownContainer.innerHTML = sorted.map(([cat, amt])=>{

const percent = Math.round((amt/totalExpense)*100);

return `

<div class="breakdown-item">

<div class="breakdown-item-top">

<span>${cat}</span>

<span>${percent}% — ${amt} ريال</span>

</div>

<div class="breakdown-bar-bg">

<div class="breakdown-bar-fill" style="width:${percent}%;"></div>

</div>

</div>

`;

}).join("");

}

}

renderCategoryBudgets(expenseByCategory);

renderBalanceHistoryChart();

// مقارنة الأشهر (رسم بياني) باستخدام الأرشيف + الفترة الحالية

const trendCanvas = document.getElementById("monthlyTrendChart");

const trendEmptyMsg = document.getElementById("trendEmptyMsg");

if(trendCanvas){

if(archivedReports.length===0){

if(trendEmptyMsg) trendEmptyMsg.style.display = "block";

trendCanvas.style.display = "none";

}else{

if(trendEmptyMsg) trendEmptyMsg.style.display = "none";

trendCanvas.style.display = "block";

const lastReports = archivedReports.slice(-5);

const trendLabels = lastReports.map(r=>r.label).concat(["الحالي"]);

const trendExpenseData = lastReports.map(r=>r.expense).concat([totals.expense]);

const trendIncomeData = lastReports.map(r=>r.income).concat([totals.periodIncome]);

if(monthlyTrendChartInstance){

monthlyTrendChartInstance.destroy();

}

monthlyTrendChartInstance = new Chart(trendCanvas, {

type:"bar",

data:{

labels: trendLabels,

datasets:[

{

label:"الدخل",

data: trendIncomeData,

backgroundColor:"#4CAF50"

},

{

label:"المصروفات",

data: trendExpenseData,

backgroundColor:"#F44336"

}

]

},

options:{

responsive:true,

plugins:{

legend:{

position:"bottom"

}

}

}

});

}

}

// مقارنة بالشهر السابق (آخر تقرير مؤرشف)

const comparisonBox = document.getElementById("monthComparisonBox");

if(comparisonBox){

if(archivedReports.length===0){

comparisonBox.style.display = "none";

}else{

const lastReport = archivedReports[archivedReports.length-1];

const diff = lastReport.expense - totals.expense;

comparisonBox.style.display = "block";

if(diff>0){

comparisonBox.className = "comparison-box positive";

comparisonBox.innerHTML = `🎉 صرفت هذا الشهر أقل بـ ${diff} ريال مقارنة بـ "${lastReport.label}"`;

}else if(diff<0){

comparisonBox.className = "comparison-box negative";

comparisonBox.innerHTML = `⚠️ صرفت هذا الشهر أكثر بـ ${Math.abs(diff)} ريال مقارنة بـ "${lastReport.label}"`;

}else{

comparisonBox.className = "comparison-box";

comparisonBox.innerHTML = `➖ مصروفاتك هذا الشهر مطابقة تماماً لـ "${lastReport.label}"`;

}

}

}

// تحليل مالي ذكي (نصيحة مبنية على أعلى فئة صرف)

const insightBox = document.getElementById("financialInsightBox");

if(insightBox){

if(totalExpense===0){

insightBox.style.display = "none";

}else{

const sorted = Object.entries(expenseByCategory).sort((a,b)=>b[1]-a[1]);

const [topCat, topAmt] = sorted[0];

const topPercent = Math.round((topAmt/totalExpense)*100);

const potentialSaving = Math.round(topAmt*0.1);

insightBox.style.display = "block";

insightBox.innerHTML = `💡 مصروفات "${topCat}" تمثل ${topPercent}% من إجمالي مصروفاتك. إذا خفضتها بنسبة 10% يمكنك توفير حوالي ${potentialSaving} ريال.`;

}

}

}

// -------------------------------
// تطور الرصيد عبر الزمن
// -------------------------------

let balanceHistory = JSON.parse(localStorage.getItem("balanceHistory") || "[]");

let balanceHistoryChartInstance = null;

function recordBalanceSnapshot(){

const todayStr = new Date().toLocaleDateString("ar-SA");

const totals = getTotals();

const last = balanceHistory[balanceHistory.length-1];

if(last && last.date===todayStr){

last.balance = totals.balance;

}else{

balanceHistory.push({date: todayStr, balance: totals.balance});

}

if(balanceHistory.length>90){

balanceHistory = balanceHistory.slice(-90);

}

localStorage.setItem("balanceHistory", JSON.stringify(balanceHistory));

}

function renderBalanceHistoryChart(){

const canvas = document.getElementById("balanceHistoryChart");

const emptyMsg = document.getElementById("balanceHistoryEmptyMsg");

if(!canvas) return;

if(balanceHistory.length<2){

if(emptyMsg) emptyMsg.style.display = "block";

canvas.style.display = "none";

return;

}

if(emptyMsg) emptyMsg.style.display = "none";

canvas.style.display = "block";

if(balanceHistoryChartInstance) balanceHistoryChartInstance.destroy();

balanceHistoryChartInstance = new Chart(canvas.getContext("2d"), {

type:"line",

data:{

labels: balanceHistory.map(h=>h.date),

datasets:[{

label:"الرصيد",

data: balanceHistory.map(h=>h.balance),

borderColor:"#7C4DFF",

backgroundColor:"rgba(124,77,255,0.15)",

tension:0.3,

fill:true

}]

},

options:{

responsive:true,

plugins:{legend:{display:false}},

scales:{y:{beginAtZero:true}}

}

});

}

// -------------------------------
// معاملات متكررة
// -------------------------------

let recurringTemplates = JSON.parse(localStorage.getItem("recurringTemplates") || "[]");

function saveRecurringTemplate(description, amount, type, category){

const frequency = document.getElementById("recurringFrequency").value;

const nextDue = computeNextDue(new Date(), frequency);

recurringTemplates.push({

id: Date.now(),

description: description,

amount: amount,

type: type,

category: category,

frequency: frequency,

nextDue: nextDue.getTime()

});

localStorage.setItem("recurringTemplates", JSON.stringify(recurringTemplates));

queueSyncUpload();

renderRecurringList();

}

function computeNextDue(fromDate, frequency){

const d = new Date(fromDate);

if(frequency==="weekly"){

d.setDate(d.getDate()+7);

}else{

d.setMonth(d.getMonth()+1);

}

return d;

}

function processDueRecurringTransactions(){

if(recurringTemplates.length===0) return;

let changed = false;

const now = Date.now();

recurringTemplates.forEach(tpl=>{

let safetyCounter = 0;

while(tpl.nextDue <= now && safetyCounter<12){

const newId = Date.now()+Math.floor(Math.random()*1000);

transactions.push({

id: newId,

description: tpl.description + " (متكرر)",

amount: tpl.amount,

type: tpl.type,

category: tpl.category,

date: new Date(tpl.nextDue).toLocaleDateString("ar-SA"),

time: new Date(tpl.nextDue).toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"})

});

if(tpl.type==="income" && localStorage.getItem("autoSplitEnabled")!=="false"){

applyIncomeSplit(newId, tpl.description, tpl.amount);

}

tpl.nextDue = computeNextDue(new Date(tpl.nextDue), tpl.frequency).getTime();

changed = true;

safetyCounter++;

}

});

if(changed){

saveData();

localStorage.setItem("recurringTemplates", JSON.stringify(recurringTemplates));

queueSyncUpload();

}

}

function deleteRecurringTemplate(id){

if(!confirm("هل تريد إيقاف هذه العملية المتكررة؟")) return;

recurringTemplates = recurringTemplates.filter(t=>t.id!==id);

localStorage.setItem("recurringTemplates", JSON.stringify(recurringTemplates));

queueSyncUpload();

renderRecurringList();

}

function renderRecurringList(){

const container = document.getElementById("recurringList");

if(!container) return;

if(recurringTemplates.length===0){

container.innerHTML = "";

return;

}

const freqLabel = {monthly:"شهرياً", weekly:"أسبوعياً"};

container.innerHTML = "<h3>🔁 العمليات المتكررة</h3>" + recurringTemplates.map(t=>{

return `

<div class="recurring-item">

<span>${t.description} — ${t.amount} ريال (${freqLabel[t.frequency]})</span>

<button class="goal-delete-btn" onclick="deleteRecurringTemplate(${t.id})">🗑️</button>

</div>

`;

}).join("");

}

// -------------------------------
// ميزانية لكل تصنيف
// -------------------------------

let categoryBudgets = JSON.parse(localStorage.getItem("categoryBudgets") || "{}");

function saveCategoryBudget(){

const select = document.getElementById("budgetCategorySelect");

const input = document.getElementById("budgetCategoryAmount");

const cat = select.value;

const amount = Number(input.value);

if(!cat || amount<=0){

alert("اختر تصنيف واكتب مبلغ صحيح");

return;

}

categoryBudgets[cat] = amount;

localStorage.setItem("categoryBudgets", JSON.stringify(categoryBudgets));

queueSyncUpload();

input.value = "";

updateStatsPage();

}

function removeCategoryBudget(cat){

delete categoryBudgets[cat];

localStorage.setItem("categoryBudgets", JSON.stringify(categoryBudgets));

queueSyncUpload();

updateStatsPage();

}

function renderCategoryBudgets(expenseByCategory){

const container = document.getElementById("categoryBudgetsList");

if(!container) return;

const cats = Object.keys(categoryBudgets);

if(cats.length===0){

container.innerHTML = "<p class='empty'>لم تحدد أي ميزانية لتصنيف بعد</p>";

return;

}

container.innerHTML = cats.map(cat=>{

const spent = expenseByCategory[cat] || 0;

const limit = categoryBudgets[cat];

const percent = Math.min((spent/limit)*100, 100);

const over = spent > limit;

return `

<div class="cat-budget-item">

<div class="breakdown-item-top">

<span>${cat}</span>

<span>${spent.toLocaleString()} / ${limit.toLocaleString()} ريال</span>

<button class="goal-delete-btn" onclick="removeCategoryBudget('${cat}')">🗑️</button>

</div>

<div class="breakdown-bar-bg">

<div class="breakdown-bar-fill ${over ? 'over-budget' : ''}" style="width:${percent}%;"></div>

</div>

${over ? `<p class="over-budget-text">⚠️ تجاوزت ميزانية هذا التصنيف</p>` : ""}

</div>

`;

}).join("");

}

// -------------------------------
// التنقل بين الصفحات
// -------------------------------

function showPage(pageId){

document.querySelectorAll(".page").forEach(page=>{

page.classList.remove("active");

});

const page=document.getElementById(pageId);

if(page){

page.classList.add("active");

}

}

// -------------------------------
// البحث والفلترة
// -------------------------------

function filterTransactions(){

const keyword=document.getElementById("searchInput").value.toLowerCase();

const type=document.getElementById("filterType").value;

const items=document.querySelectorAll("#historyList .transaction-item");

items.forEach(item=>{

const text=item.innerText.toLowerCase();

const itemType=item.dataset.type;

const isType=

type==="all"||

(type==="investment"&&(itemType==="investment"||itemType==="investment_withdraw"))||

(type==="commitment"&&(itemType==="commitment"||itemType==="commitment_pay"))||

itemType===type;

const isSearch=text.includes(keyword);

item.style.display=

isType&&isSearch?

"flex":"none";

});

}

// -------------------------------
// حفظ الميزانية
// -------------------------------

function saveBudget(){

const value=Number(

document.getElementById("budgetInput").value

);

if(value<=0){

alert("أدخل ميزانية صحيحة");

return;

}

monthlyBudget=value;

saveData();

updateBudget();

}

// -------------------------------
// تحديث الميزانية
// -------------------------------

function updateBudget(){

const totals=getTotals();

if(monthlyBudget<=0){

return;

}

const percent=Math.min(

(totals.expense/monthlyBudget)*100,

100

);

document.getElementById("budgetBar").style.width=

percent+"%";

const budgetBarEl = document.getElementById("budgetBar");

if(percent>=80){

budgetBarEl.style.background = "linear-gradient(90deg,#F44336,#EF5350)";

}else if(percent>=50){

budgetBarEl.style.background = "linear-gradient(90deg,#FF9800,#FFC107)";

}else{

budgetBarEl.style.background = "";

}

document.getElementById("budgetText").textContent=

`استهلكت ${Math.round(percent)}% من الميزانية` + (percent>=80 ? " ⚠️" : "");

}

// ===============================
// الأهداف المالية
// ===============================

function saveGoal(){

const name = document.getElementById("goalName").value.trim();

const amount = Number(document.getElementById("goalAmount").value);

if(!name || amount<=0){

alert("اكتب اسم الهدف وقيمة صحيحة");

return;

}

goals.push({

id: Date.now(),

name: name,

amount: amount,

saved: 0

});

localStorage.setItem("goals", JSON.stringify(goals));

queueSyncUpload();

document.getElementById("goalName").value = "";

document.getElementById("goalAmount").value = "";

renderGoals();

}

function addGoalSaving(id){

const goalItem = goals.find(g=>g.id===id);

if(!goalItem) return;

const amountStr = prompt("كم تريد إضافته لهذا الهدف؟");

const amount = Number(amountStr);

if(!amountStr || isNaN(amount) || amount<=0) return;

goalItem.saved += amount;

localStorage.setItem("goals", JSON.stringify(goals));

queueSyncUpload();

renderGoals();

}

function deleteGoal(id){

if(!confirm("هل تريد حذف هذا الهدف؟")) return;

goals = goals.filter(g=>g.id!==id);

localStorage.setItem("goals", JSON.stringify(goals));

queueSyncUpload();

renderGoals();

}

function renderGoals(){

const list = document.getElementById("goalsList");

if(!list) return;

if(goals.length===0){

list.innerHTML = `<p class="no-goals-text">لا توجد أهداف حالياً</p>`;

return;

}

list.innerHTML = goals.map(g=>{

const percent = Math.min((g.saved/g.amount)*100, 100);

return `

<div class="goal-item">

<div class="goal-item-header">

<span>${g.name}</span>

<button class="goal-delete-btn" onclick="deleteGoal(${g.id})">🗑️</button>

</div>

<div class="progress-container">

<div class="progress-bar" style="width:${percent}%"></div>

</div>

<div class="goal-item-footer">

<span>${g.saved.toLocaleString()} / ${g.amount.toLocaleString()} ريال (${Math.round(percent)}%)</span>

<button class="goal-add-btn" onclick="addGoalSaving(${g.id})">➕ إضافة مبلغ</button>

</div>

</div>

`;

}).join("");

}

  // -------------------------------
// التنبيهات الذكية
// -------------------------------

function updateAlerts(){

const alertBox=document.getElementById("alertBox");

const alertText=document.getElementById("alertText");

if(monthlyBudget<=0){

alertBox.style.display="none";

return;

}

const totals=getTotals();

const percent=(totals.expense/monthlyBudget)*100;

alertBox.className="alert-box";

if(percent>=100){

alertBox.style.display="block";

alertBox.classList.add("alert-danger");

alertText.textContent="🚨 لقد تجاوزت الميزانية الشهرية!";

}

else if(percent>=80){

alertBox.style.display="block";

alertBox.classList.add("alert-warning");

alertText.textContent="⚠️ لقد استهلكت أكثر من 80% من الميزانية.";

}

else{

alertBox.style.display="block";

alertBox.classList.add("alert-success");

alertText.textContent="✅ إنفاقك ضمن الميزانية.";

}

}
  
// ===============================
// الوضع الليلي
// ===============================

function toggleDarkMode(){

document.body.classList.toggle("dark");

localStorage.setItem(

"darkMode",

document.body.classList.contains("dark")

);

}


// ===============================
// النسخة الاحتياطية
// ===============================

function backupData(){

const data={

transactions,

monthlyBudget

};

const text=JSON.stringify(data,null,2);

const blob=new Blob([text],{

type:"application/json"

});

const link=document.createElement("a");

link.href=URL.createObjectURL(blob);

link.download="ميزانيتي_backup.json";

link.click();

localStorage.setItem("lastBackupDate", String(Date.now()));

const reminderBanner = document.getElementById("backupReminderBanner");

if(reminderBanner) reminderBanner.style.display = "none";

}


// ===============================
// استعادة النسخة الاحتياطية
// ===============================

function restoreData(){

document.getElementById("restoreFileInput").click();

}

function handleRestoreFile(event){

const file = event.target.files[0];

if(!file) return;

const reader = new FileReader();

reader.onload = function(e){

try{

const data = JSON.parse(e.target.result);

if(!data || !Array.isArray(data.transactions)){

alert("⚠️ الملف غير صالح، تأكد أنه ملف نسخة احتياطية صحيح");

return;

}

if(!confirm("سيتم استبدال بياناتك الحالية بالبيانات المستعادة من الملف. هل تريد المتابعة؟")){

return;

}

transactions = data.transactions;

monthlyBudget = Number(data.monthlyBudget) || 0;

saveData();

updateScreen();

alert("✅ تم استعادة البيانات بنجاح");

}catch(err){

alert("⚠️ تعذر قراءة الملف، تأكد أنه ملف JSON صحيح");

}

};

reader.readAsText(file);

event.target.value = "";

}


// ===============================
// تصدير PDF
// ===============================

function exportPDF(){

if(transactions.length===0){

alert("لا توجد عمليات لتصديرها");

return;

}

const totals = getTotals();

document.getElementById("pdfDate").textContent =

"تاريخ التقرير: " + new Date().toLocaleDateString("ar-SA");

document.getElementById("pdfSummary").innerHTML = `

💰 الدخل: ${totals.income} ريال<br>

💸 المصروفات: ${totals.expense} ريال<br>

🌱 الاستثمارات: ${totals.investment} ريال<br>

📌 الالتزامات: ${totals.commitment} ريال<br>

💼 الرصيد: ${totals.balance} ريال<br>

📝 عدد العمليات: ${transactions.length}

`;

const tbody = document.getElementById("pdfTableBody");

tbody.innerHTML = "";

transactions.slice().reverse().forEach(item=>{

const tr = document.createElement("tr");

tr.innerHTML = `

<td style="padding:8px;border:1px solid #ddd;">${item.date}</td>

<td style="padding:8px;border:1px solid #ddd;">${typeLabels[item.type]||item.type}</td>

<td style="padding:8px;border:1px solid #ddd;">${item.category}</td>

<td style="padding:8px;border:1px solid #ddd;">${item.description}</td>

<td style="padding:8px;border:1px solid #ddd;">${item.amount} ريال</td>

`;

tbody.appendChild(tr);

});

const template = document.getElementById("pdfTemplate");

template.style.display = "block";

html2canvas(template, {scale:2}).then(canvas=>{

template.style.display = "none";

const imgData = canvas.toDataURL("image/png");

const { jsPDF } = window.jspdf;

const pdf = new jsPDF("p","mm","a4");

const pageWidth = pdf.internal.pageSize.getWidth();

const pageHeight = pdf.internal.pageSize.getHeight();

const imgWidth = pageWidth;

const imgHeight = canvas.height * imgWidth / canvas.width;

let heightLeft = imgHeight;

let position = 0;

pdf.addImage(imgData,"PNG",0,position,imgWidth,imgHeight);

heightLeft -= pageHeight;

while(heightLeft > 0){

position = heightLeft - imgHeight;

pdf.addPage();

pdf.addImage(imgData,"PNG",0,position,imgWidth,imgHeight);

heightLeft -= pageHeight;

}

pdf.save("ميزانيتي_تقرير.pdf");

}).catch(()=>{

template.style.display = "none";

alert("⚠️ حدث خطأ أثناء إنشاء ملف PDF");

});

}


// ===============================
// تصدير Excel
// ===============================

function exportExcel(){

if(transactions.length===0){

alert("لا توجد عمليات لتصديرها");

return;

}

const totals = getTotals();

const rows = transactions.map(item=>({

"التاريخ": item.date,

"الوصف": item.description,

"النوع": typeLabels[item.type]||item.type,

"التصنيف": item.category,

"المبلغ": item.amount

}));

rows.push({"التاريخ":"", "الوصف":"", "النوع":"", "التصنيف":"", "المبلغ":""});

rows.push({"التاريخ":"", "الوصف":"إجمالي الدخل", "النوع":"", "التصنيف":"", "المبلغ": totals.income});

rows.push({"التاريخ":"", "الوصف":"إجمالي المصروفات", "النوع":"", "التصنيف":"", "المبلغ": totals.expense});

rows.push({"التاريخ":"", "الوصف":"إجمالي الاستثمارات", "النوع":"", "التصنيف":"", "المبلغ": totals.investment});

rows.push({"التاريخ":"", "الوصف":"إجمالي الالتزامات", "النوع":"", "التصنيف":"", "المبلغ": totals.commitment});

rows.push({"التاريخ":"", "الوصف":"الرصيد", "النوع":"", "التصنيف":"", "المبلغ": totals.balance});

const ws = XLSX.utils.json_to_sheet(rows);

ws["!cols"] = [{wch:14},{wch:26},{wch:12},{wch:14},{wch:12}];

const wb = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(wb, ws, "العمليات");

XLSX.writeFile(wb, "ميزانيتي.xlsx");

}


// ===============================
// تثبيت التطبيق (PWA)
// ===============================

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (event)=>{

event.preventDefault();

deferredInstallPrompt = event;

const btn = document.getElementById("installAppBtn");

if(btn) btn.style.display = "block";

});

function installApp(){

if(!deferredInstallPrompt){

alert("📱 لتثبيت التطبيق: افتح قائمة المتصفح (⋮) ثم اختر \"إضافة إلى الشاشة الرئيسية\" أو \"تثبيت التطبيق\".");

return;

}

deferredInstallPrompt.prompt();

deferredInstallPrompt.userChoice.then(()=>{

deferredInstallPrompt = null;

const btn = document.getElementById("installAppBtn");

if(btn) btn.style.display = "none";

});

}

window.addEventListener("appinstalled", ()=>{

const btn = document.getElementById("installAppBtn");

if(btn) btn.style.display = "none";

});


// ===============================
// منح Ai Accountant صلاحية التحكم الفعلي
// ===============================

window.getTotals = getTotals;

window.getRecentTransactionsForAI = function(n){

return transactions.slice(-n).map(t=>({

id: t.id,

description: t.description,

amount: t.amount,

type: t.type,

category: t.category,

date: t.date,

time: t.time

}));

};

window.aiExecuteAction = function(actionObj){

try{

if(!actionObj || !actionObj.action){

return "⚠️ أمر غير معروف.";

}

if(actionObj.action === "add_transaction"){

const validTypes = ["income","expense","investment","investment_withdraw","commitment","commitment_pay"];

const type = validTypes.includes(actionObj.type) ? actionObj.type : "expense";

const amount = Number(actionObj.amount);

if(!amount || amount<=0){

return "⚠️ لم أتمكن من إضافة العملية: المبلغ غير صالح.";

}

const description = (actionObj.description || "عملية من Ai Accountant").trim();

let category = (actionObj.category || "").trim();

if(!category){

category = detectCategoryFromDescription(description);

}

transactions.push({

id: Date.now(),

description: description,

amount: amount,

type: type,

category: category,

date: new Date().toLocaleDateString("ar-SA"),

time: new Date().toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"})

});

saveData();

updateScreen();

return `✅ تم تنفيذ الإضافة فعلياً: "${description}" بمبلغ ${amount} ريال (${category}).`;

}

if(actionObj.action === "delete_last_transaction"){

if(transactions.length===0){

return "⚠️ لا توجد عمليات لحذفها.";

}

const last = transactions.pop();

saveData();

updateScreen();

return `🗑️ تم حذف آخر عملية فعلياً: "${last.description}" بمبلغ ${last.amount} ريال.`;

}

if(actionObj.action === "delete_transaction_by_id"){

const before = transactions.length;

transactions = transactions.filter(t=>t.id!==actionObj.id);

if(transactions.length===before){

return "⚠️ لم يتم إيجاد عملية بهذا المعرّف.";

}

saveData();

updateScreen();

return "🗑️ تم حذف العملية المطلوبة فعلياً.";

}

if(actionObj.action === "edit_transaction_by_id"){

const target = transactions.find(t=>t.id===actionObj.id);

if(!target){

return "⚠️ لم يتم إيجاد عملية بهذا المعرّف للتعديل عليها.";

}

const validTypes = ["income","expense","investment","investment_withdraw","commitment","commitment_pay"];

if(actionObj.description!==undefined && actionObj.description!==null){

target.description = String(actionObj.description).trim() || target.description;

}

if(actionObj.amount!==undefined && actionObj.amount!==null){

const newAmount = Number(actionObj.amount);

if(newAmount>0){

target.amount = newAmount;

}

}

if(actionObj.type!==undefined && validTypes.includes(actionObj.type)){

target.type = actionObj.type;

}

if(actionObj.category!==undefined && actionObj.category!==null){

target.category = String(actionObj.category).trim() || target.category;

}

saveData();

updateScreen();

return `✏️ تم تعديل العملية فعلياً: "${target.description}" الآن بمبلغ ${target.amount} ريال (${target.category}).`;

}

return "⚠️ أمر غير مدعوم حالياً.";

}catch(err){

return "⚠️ حدث خطأ أثناء تنفيذ الأمر.";

}

};

function detectCategoryFromDescription(text){

const lower = text.toLowerCase();

for(const category in categoryKeywords){

const keywords = categoryKeywords[category];

for(const keyword of keywords){

if(lower.includes(keyword.toLowerCase())){

return category;

}

}

}

return "أخرى";

}


// ===============================
// تشغيل التطبيق
// ===============================

window.onload=function(){

updateScreen();

if("serviceWorker" in navigator){

navigator.serviceWorker.register("./service-worker.js").catch(()=>{});

}

}

