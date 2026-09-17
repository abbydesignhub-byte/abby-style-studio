# Abby's Custom Tees

Abby Design Hub

│

├── index.html

├── style.css

└── script.js












ABBY DESIGN HUB

Wear Your Identity, Designed For You



HomeShopCustom DesignPaymentTrack OrderContact







Premium Branded T-Shirts





Create your style. Promote your brand.




Shop Now














Our Products







Classic Black Tee





₦7000




Add To Cart
















Business Branding Shirt





₦10000




Add To Cart
















Custom Logo Shirt





₦12000




Add To Cart


















Your Cart










Total: ₦0
















Create Your Own Shirt






Upload your logo and create your personalised design.








Black ShirtWhite ShirtGold Shirt




Submit Design










Payment

Choose your payment method


Pay Online


Bank Transfer


Account Number:
8055256283


Account Name:
Abby Design Hub




Send Receipt On WhatsApp












Order Tracking


Track










Contact Us


WhatsApp:

08055256283





Email:
@gmail.com">
victayo12@gmail.com



















© 2026 Abby Design Hub










body{

font-family:Arial;

margin:0;

background:#f5f5f5;

}

header{

background:#000;

color:white;

padding:25px;

text-align:center;

}

nav a{

color:white;

margin:10px;

text-decoration:none;

}

.hero{

background:#d4af37;

padding:80px;

text-align:center;

}

button{

background:black;

color:white;

padding:12px 25px;

border:none;

cursor:pointer;

}

section{

padding:40px;

text-align:center;

}

.products{

display:flex;

justify-content:center;

gap:30px;

flex-wrap:wrap;

}

.card{

background:white;

padding:20px;

width:280px;

border-radius:10px;

}

.card img{

width:100%;

}

#payment,#cart{

background:white;

}

input,select{

padding:12px;

width:250px;

}

footer{

background:black;

color:white;

padding:20px;

text-align:center;

}



let total = 0;

function addCart(product,price){

let item=document.createElement("li");

item.innerHTML =

product+" - ₦"+price;

document.getElementById("cartItems")

.appendChild(item);

total += price;

document.getElementById("total")

.innerHTML=total;

}

function onlinePayment(){

alert(

"Connecting to secure payment gateway..."

);

}

function trackOrder(){

let order =

document.getElementById("orderNumber").value;

if(order==""){

document.getElementById("result")

.innerHTML="Enter your order number";

}

else{

document.getElementById("result")

.innerHTML=

"Order "+order+

" is being processed";

}

}

function scrollShop(){

document

.getElementById("shop")

.scrollIntoView();

}



let total = 0;

function addCart(product,price){

let item=document.createElement("li");

item.innerHTML =

product+" - ₦"+price;

document.getElementById("cartItems")

.appendChild(item);

total += price;

document.getElementById("total")

.innerHTML=total;

}

function onlinePayment(){

alert(

"Connecting to secure payment gateway..."

);

}

function trackOrder(){

let order =

document.getElementById("orderNumber").value;

if(order==""){

document.getElementById("result")

.innerHTML="Enter your order number";

}

else{

document.getElementById("result")

.innerHTML=

"Order "+order+

" is being processed";

}

}

function scrollShop(){

document

.getElementById("shop")

.scrollIntoView();

}



let total = 0;

function addCart(product,price){

let item=document.createElement("li");

item.innerHTML =

product+" - ₦"+price;

document.getElementById("cartItems")

.appendChild(item);

total += price;

document.getElementById("total")

.innerHTML=total;

}

function onlinePayment(){

alert(

"Connecting to secure payment gateway..."

);

}

function trackOrder(){

let order =

document.getElementById("orderNumber").value;

if(order==""){

document.getElementById("result")

.innerHTML="Enter your order number";

}

else{

document.getElementById("result")

.innerHTML=

"Order "+order+

" is being processed";

}

}

function scrollShop(){

document

.getElementById("shop")

.scrollIntoView();

}

Connect Paystack/Flutterwave

 Add real product database

 Add customer login

 Add admin dashboard

 Add real order tracking system

 Add real T-shirt images

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://abby-style-studio.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d41563c2-aab3-433a-89fc-02a6690cac42).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
