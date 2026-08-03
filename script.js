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

let editingId = null;

let goal = {

name:"",

amount:0

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

transactions.forEach(item=>{

if(item.type==="income"){

income += Number(item.amount);

}

else if(item.type==="expense"){

expense += Number(item.amount);

}

else{

investment += Number(item.amount);

}

});

return{

income,

expense,

investment,

balance:

income-expense-investment

};

}

// -------------------------------
// إضافة أو تعديل عملية
// -------------------------------

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

if(editingId===null){

transactions.push({

id:Date.now(),

description:description,

amount:amount,

type:type,

category:category,

date:new Date().toLocaleDateString("ar-SA"),

time:new Date().toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"})

});

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

function deleteTransaction(id){

if(!confirm("هل تريد حذف العملية؟")){

return;

}

transactions=transactions.filter(

item=>item.id!==id

);

saveData();

updateScreen();

}

// -------------------------------
// تنظيف الحقول
// -------------------------------

function clearForm(){

document.getElementById("description").value="";

document.getElementById("amount").value="";

document.getElementById("type").value="income";

document.getElementById("category").value="أخرى";
  
}

// -------------------------------
// تحديث الشاشة بالكامل
// -------------------------------

function updateScreen(){

updateHome();

updateSummary();

updateMonthlyReport();

updateBudget();

updateGoal();

updateAlerts();

updateHistory();

updateChart();
  
}

// -------------------------------
// تحديث الصفحة الرئيسية
// -------------------------------

function updateHome(){

const totals = getTotals();

document.getElementById("homeBalance").textContent =
totals.balance + " ريال";

document.getElementById("homeIncome").textContent =
totals.income + " ريال";

document.getElementById("homeExpense").textContent =
totals.expense + " ريال";

document.getElementById("homeInvest").textContent =
totals.investment + " ريال";

}

// -------------------------------
// تحديث الملخص المالي
// -------------------------------

function updateSummary(){

const totals = getTotals();

document.getElementById("incomeSummary").textContent =
totals.income + " ريال";

document.getElementById("expenseSummary").textContent =
totals.expense + " ريال";

document.getElementById("investSummary").textContent =
totals.investment + " ريال";

document.getElementById("remainSummary").textContent =
totals.balance + " ريال";

}

// -------------------------------
// التقرير الشهري
// -------------------------------

function updateMonthlyReport(){

const totals = getTotals();

document.getElementById("reportIncome").textContent =
totals.income + " ريال";

document.getElementById("reportExpense").textContent =
totals.expense + " ريال";

document.getElementById("reportInvestment").textContent =
totals.investment + " ريال";

document.getElementById("reportBalance").textContent =
totals.balance + " ريال";

document.getElementById("reportCount").textContent =
transactions.length;

}

// -------------------------------
// عرض العمليات
// -------------------------------

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

const div=document.createElement("div");

div.className="transaction-item";

div.innerHTML=`

<div>

<strong>${item.description}</strong><br>

<small>📂 ${item.category}</small><br>

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

list.appendChild(div);

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

"الاستثمارات"

],

datasets:[{

data:[

totals.income,

totals.expense,

totals.investment

],

backgroundColor:[

"#4CAF50",

"#F44336",

"#7C3AED"

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

const isType=

type==="all"||

text.includes(type==="income"?"دخل":

type==="expense"?"مصروف":"استثمار");

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

document.getElementById("budgetText").textContent=

`استهلكت ${Math.round(percent)}% من الميزانية`;

}

// ===============================
// الأهداف المالية
// ===============================

function saveGoal(){

goal.name=document.getElementById("goalName").value;

goal.amount=Number(

document.getElementById("goalAmount").value

);

localStorage.setItem(

"goal",

JSON.stringify(goal)

);

updateGoal();

}

function updateGoal(){

goal=JSON.parse(

localStorage.getItem("goal")

)||{

name:"",

amount:0

};

if(goal.amount<=0){

return;

}

const totals=getTotals();

const saved=Math.max(

totals.balance,

0

);

const percent=Math.min(

(saved/goal.amount)*100,

100

);

document.getElementById("goalBar").style.width=

percent+"%";

document.getElementById("goalText").textContent=

`${goal.name}
(${saved} / ${goal.amount} ريال)`;

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

const typeLabels = {income:"دخل", expense:"مصروف", investment:"استثمار"};

document.getElementById("pdfDate").textContent =

"تاريخ التقرير: " + new Date().toLocaleDateString("ar-SA");

document.getElementById("pdfSummary").innerHTML = `

💰 الدخل: ${totals.income} ريال<br>

💸 المصروفات: ${totals.expense} ريال<br>

🌱 الاستثمارات: ${totals.investment} ريال<br>

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

const typeLabels = {income:"دخل", expense:"مصروف", investment:"استثمار"};

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
// تشغيل التطبيق
// ===============================

window.onload=function(){

updateScreen();

if("serviceWorker" in navigator){

navigator.serviceWorker.register("./service-worker.js").catch(()=>{});

}

}

