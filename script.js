let income = Number(localStorage.getItem("income")) || 0;
let expense = Number(localStorage.getItem("expense")) || 0;
let invest = Number(localStorage.getItem("invest")) || 0;

let history = JSON.parse(localStorage.getItem("history")) || [];

let editingIndex = -1;

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

  if(editingIndex!=-1){

const old=history[editingIndex];

if(old.type==="income"){
income-=old.amount;
}
else if(old.type==="expense"){
expense-=old.amount;
}
else{
invest-=old.amount;
}

history.splice(editingIndex,1);

editingIndex=-1;

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

  <br><br>

<button onclick="editTransaction(${index})"
style="
background:#2196F3;
color:white;
border:none;
padding:8px 15px;
border-radius:8px;
margin-left:8px;
cursor:pointer;
">

✏️ تعديل

</button>

<button onclick="deleteTransaction(${index})"
style="
background:#e53935;
color:white;
border:none;
padding:8px 15px;
border-radius:8px;
cursor:pointer;
">

🗑 حذف

</button>

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

<small style="color:gray;">
🗓️ ${item.date}
</small>

<br><br>

<button ...>
✏️ تعديل
</button>

<button ...>
🗑 حذف
</button>

</li>

function editTransaction(index){

editingIndex=index;

const item=history[index];

document.getElementById("type").value=item.type;

document.getElementById("category").value=item.category;

document.getElementById("amount").value=item.amount;

document.getElementById("note").value=item.note;

window.scrollTo({
top:0,
behavior:"smooth"
});

} 
