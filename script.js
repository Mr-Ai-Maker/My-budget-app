let income = Number(localStorage.getItem("income")) || 0;
let expense = Number(localStorage.getItem("expense")) || 0;
let invest = Number(localStorage.getItem("invest")) || 0;

let history = JSON.parse(localStorage.getItem("history")) || [];

updateScreen();

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
