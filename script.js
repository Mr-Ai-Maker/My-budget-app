// ===============================
// ميزانيتي - الجزء الأول
// المتغيرات الرئيسية
// ===============================

let income = Number(localStorage.getItem("income")) || 0;
let expense = Number(localStorage.getItem("expense")) || 0;
let invest = Number(localStorage.getItem("invest")) || 0;

let history = JSON.parse(localStorage.getItem("history")) || [];

let editingIndex = -1;

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

    const search = document.getElementById("search").value.toLowerCase();

const filter = document.getElementById("filter").value;

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

// ===============================
// تشغيل التطبيق عند فتح الصفحة
// ===============================

window.onload = function () {

    updateScreen();

};

.search-box{
display:flex;
gap:10px;
margin-bottom:15px;
}

.search-box input,
.search-box select{

flex:1;

padding:12px;

font-size:16px;

border-radius:10px;

border:1px solid #ddd;

}
