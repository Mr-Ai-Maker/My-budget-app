// ===============================
// ميزانيتي - الجزء الأول
// المتغيرات الرئيسية
// ===============================

let income = Number(localStorage.getItem("income")) || 0;
let expense = Number(localStorage.getItem("expense")) || 0;
let invest = Number(localStorage.getItem("invest")) || 0;

let history = JSON.parse(localStorage.getItem("history")) || [];

let editingIndex = -1;

let financeChart = null;

let monthlyBudget = Number(localStorage.getItem("monthlyBudget")) || 0;

// ===============================
// تحديث الشاشة
// ===============================

function updateScreen() {

    document.getElementById("income").innerText = income + " ريال";
    document.getElementById("expense").innerText = expense + " ريال";
    document.getElementById("invest").innerText = invest + " ريال";

    document.getElementById("balance").innerText =
        (income - expense - invest) + " ريال";

    const list = document.getElementById("history");

    list.innerHTML = "";

    const searchElement = document.getElementById("search");
const filterElement = document.getElementById("filter");

const search = searchElement ? searchElement.value.toLowerCase() : "";
const filter = filterElement ? filterElement.value : "all";
    
history.forEach((item,index)=>{

if(
filter!=="all" &&
item.type!==filter
){
return;
}

const category = (item.category || "").toLowerCase();
const note = (item.note || "").toLowerCase();

if (
    !category.includes(search) &&
    !note.includes(search)
) {
    return;
}

        let emoji = "💵";

        if (item.type === "expense") emoji = "🛒";

        if (item.type === "invest") emoji = "🌱";

        const date = item.date || "بدون تاريخ";

        list.innerHTML += `
<li style="
background:#ffffff;
padding:18px;
margin-bottom:15px;
border-radius:18px;
box-shadow:0 3px 10px rgba(0,0,0,.12);
list-style:none;
">

<div style="font-size:22px;font-weight:bold;">
${item.category}
</div>

<div style="margin-top:10px;font-size:20px;">
${emoji} ${item.amount} ريال
</div>

<div style="margin-top:8px;color:#666;">
${item.note}
</div>

<div style="margin-top:8px;color:#999;font-size:14px;">
📅 ${date}
</div>

<div style="margin-top:15px;">

<button
onclick="editTransaction(${index})"
style="
background:#2196F3;
color:white;
border:none;
padding:10px 18px;
border-radius:10px;
font-size:16px;
cursor:pointer;
margin-left:8px;
">
✏️ تعديل
</button>

<button
onclick="deleteTransaction(${index})"
style="
background:#e53935;
color:white;
border:none;
padding:10px 18px;
border-radius:10px;
font-size:16px;
cursor:pointer;
">
🗑 حذف
</button>

</div>

</li>
`;

});

drawChart();

updateBudget();

}

// ===============================
// حفظ عملية جديدة أو تعديل عملية
// ===============================

function saveTransaction() {

    const type = document.getElementById("type").value;

    const category = document.getElementById("category").value;

    const amount = Number(document.getElementById("amount").value);

    const note = document.getElementById("note").value;

    if (amount <= 0) {
        alert("أدخل مبلغًا صحيحًا");
        return;
    }

    const today = new Date().toLocaleDateString("ar-SA");

    // عند التعديل نحذف القديمة أولاً
    if (editingIndex !== -1) {

        const old = history[editingIndex];

        if (old.type === "income") {
            income -= old.amount;
        } else if (old.type === "expense") {
            expense -= old.amount;
        } else {
            invest -= old.amount;
        }

        history.splice(editingIndex, 1);

        editingIndex = -1;
    }

    // إضافة المبلغ الجديد
    if (type === "income") {
        income += amount;
    } else if (type === "expense") {
        expense += amount;
    } else {
        invest += amount;
    }

    // حفظ العملية
    history.unshift({
        type: type,
        category: category,
        amount: amount,
        note: note,
        date: today
    });

    // تخزين البيانات
    localStorage.setItem("income", income);
    localStorage.setItem("expense", expense);
    localStorage.setItem("invest", invest);
    localStorage.setItem("history", JSON.stringify(history));

    // تنظيف الحقول
    document.getElementById("amount").value = "";
    document.getElementById("note").value = "";

    updateScreen();

}

// ===============================
// تعديل عملية
// ===============================

function editTransaction(index) {

    editingIndex = index;

    const item = history[index];

    document.getElementById("type").value = item.type;

    document.getElementById("category").value = item.category;

    document.getElementById("amount").value = item.amount;

    document.getElementById("note").value = item.note;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}

// ===============================
// حذف عملية
// ===============================

function deleteTransaction(index) {

    if (!confirm("هل تريد حذف هذه العملية؟")) {
        return;
    }

    const item = history[index];

    if (item.type === "income") {
        income -= item.amount;
    } else if (item.type === "expense") {
        expense -= item.amount;
    } else {
        invest -= item.amount;
    }

    history.splice(index, 1);

    localStorage.setItem("income", income);
    localStorage.setItem("expense", expense);
    localStorage.setItem("invest", invest);
    localStorage.setItem("history", JSON.stringify(history));

    updateScreen();

}

function drawChart() {

    const ctx = document.getElementById("financeChart");

    if (!ctx) return;

    if (financeChart) {
        financeChart.destroy();
    }

    financeChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: [
                "💰 الدخل",
                "🛒 المصروفات",
                "🌱 الاستثمارات"
            ],
            datasets: [{
                data: [
                    income,
                    expense,
                    invest
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });

}

function saveBudget() {

    const value = Number(document.getElementById("budgetInput").value);

    if (value <= 0) {
        alert("أدخل ميزانية صحيحة");
        return;
    }

    monthlyBudget = value;

    localStorage.setItem("monthlyBudget", monthlyBudget);

    updateBudget();

}

function updateBudget() {

    const remaining = monthlyBudget - expense;

    const percent = monthlyBudget > 0
        ? Math.min((expense / monthlyBudget) * 100, 100)
        : 0;

    document.getElementById("budgetRemaining").innerText =
        "المتبقي: " + remaining + " ريال";

    const bar = document.getElementById("budgetBar");

    bar.style.width = percent + "%";

    const status = document.getElementById("budgetStatus");

    if (percent < 80) {

        bar.style.background = "#4CAF50";
        status.innerText = "🟢 ضمن الميزانية";

    } else if (percent < 100) {

        bar.style.background = "#FF9800";
        status.innerText = "🟠 اقتربت من الحد";

    } else {

        bar.style.background = "#F44336";
        status.innerText = "🔴 تجاوزت الميزانية";

    }

}

// ===============================
// تشغيل التطبيق عند فتح الصفحة
// ===============================

window.onload = function () {
    updateScreen();

    document.getElementById("budgetInput").value = monthlyBudget;
    
    const search = document.getElementById("search");
    const filter = document.getElementById("filter");

    if (search) {
        search.addEventListener("input", updateScreen);
    }

    if (filter) {
        filter.addEventListener("change", updateScreen);
    }
};

/* ========================= */
/* الميزانية الشهرية */
/* ========================= */

.budget-box{

background:#ffffff;

margin-top:25px;

padding:20px;

border-radius:18px;

box-shadow:0 3px 10px rgba(0,0,0,.12);

}

.budget-box input{

width:100%;

padding:12px;

font-size:18px;

margin:15px 0;

border-radius:12px;

border:1px solid #ddd;

box-sizing:border-box;

}

.budget-box button{

width:100%;

padding:14px;

font-size:18px;

border:none;

border-radius:12px;

background:#4CAF50;

color:white;

cursor:pointer;

}

.progress{

margin-top:20px;

height:22px;

background:#eeeeee;

border-radius:20px;

overflow:hidden;

}

#budgetBar{

width:0%;

height:100%;

background:#4CAF50;

transition:0.4s;

}

#budgetStatus{

font-size:20px;

font-weight:bold;

margin-top:15px;

text-align:center;

    }
