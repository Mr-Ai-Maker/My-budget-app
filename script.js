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

    history.forEach((item, index) => {

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

