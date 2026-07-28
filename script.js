let income = Number(localStorage.getItem("income")) || 0;
let expense = Number(localStorage.getItem("expense")) || 0;
let invest = Number(localStorage.getItem("invest")) || 0;

let history = JSON.parse(localStorage.getItem("history")) || [];

function updateScreen(){

document.getElementById("income").innerText = income + " ريال";
document.getElementById("expense").innerText = expense + " ريال";
document.getElementById("invest").innerText = invest + " ريال";
document.getElementById("balance").innerText = (income-expense-invest) + " ريال";

const list=document.getElementById("history");

list.innerHTML="";

history.forEach((item,index)=>{

let emoji="💵";

if(item.type==="expense") emoji="🛒";

if(item.type==="invest") emoji="🌱";

const date=item.date || "بدون تاريخ";

list.innerHTML+=`

<li style="background:#f8f8f8;
padding:15px;
margin-bottom:15px;
border-radius:15px;
box-shadow:0 2px 6px rgba(0,0,0,.1);">

<div style="font-size:22px;font-weight:bold;">
${item.category}
</div>

<div style="margin-top:8px;">
${emoji} ${item.amount} ريال
</div>

<div style="color:#666;margin-top:6px;">
📝 ${item.note}
</div>

<div style="color:#999;font-size:14px;margin-top:6px;">
🗓️ ${date}
</div>

<button onclick="deleteTransaction(${index})"
style="
margin-top:12px;
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

</li>

`;

});

}

function saveTransaction(){

const type = document.getElementById("type").value;

const amount = Number(document.getElementById("amount").value);

const category=document.getElementById("category").value;

const note=document.getElementById("note").value;
if(amount<=0){

alert("أدخل مبلغاً صحيحاً");

return;

}

if(type==="income"){

income += amount;

}

else if(type==="expense"){

expense += amount;

}

else{

invest += amount;

}

history.unshift({

type,

category,

amount,

note

});

localStorage.setItem("income",income);

localStorage.setItem("expense",expense);

localStorage.setItem("invest",invest);

localStorage.setItem("history",JSON.stringify(history));

document.getElementById("amount").value="";

document.getElementById("note").value="";

updateScreen();

}

function updateScreen(){

document.getElementById("income").innerText=income+" ريال";

document.getElementById("expense").innerText=expense+" ريال";

document.getElementById("invest").innerText=invest+" ريال";

document.getElementById("balance").innerText=(income-expense-invest)+" ريال";

const list=document.getElementById("history");

list.innerHTML="";

history.forEach(item=>{

let emoji="💵";

if(item.type==="expense") emoji="🛒";

if(item.type==="invest") emoji="🌱";

list.innerHTML+=`

<li>

<strong>${item.category}</strong>

<br>

${emoji} ${item.amount} ريال

<br>

<small>${item.note}</small>

<br>

<small style="color:gray">

🗓️ ${item.date}

</small>

</li>

`;

});

}

function deleteTransaction(index){

const item=history[index];

if(item.type==="income"){

income-=item.amount;

}

else if(item.type==="expense"){

expense-=item.amount;

}

else{

invest-=item.amount;

}

history.splice(index,1);

localStorage.setItem("income",income);
localStorage.setItem("expense",expense);
localStorage.setItem("invest",invest);
localStorage.setItem("history",JSON.stringify(history));

updateScreen();

}
