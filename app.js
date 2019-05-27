/*Celem projektu jest stworzenie PROSTEGO modułu jakim jest koszyk zakupów w sklepie internetowym. 
Główne założenie aplikacji to stworzenie REST API pozwalające na dodanie, wyświetlanie, zmodyfikowanie 
i usunięcie elementów z koszyka.
    Baza produktów i użytkowników może być ustawiona na sztywno(bez dodatkowego API do ich zarządzania, 
a jedynie pobierana z naszej 'bazy').
    Podczas dodawania elementów do koszyka powinniśmy operować na identyfikatorach produktów oraz użytkownika.
API powinno pozwolić obsługiwać wielu użytkowników i koszyków.

Wymagania na zaliczenie:
1. Podstawą zaliczenia jest wykonanie najprostszego REST API pozwalającego na zarządzanie koszykiem internetowym.
2.(*) Aplikacja powinna pozwolić na dodawanie produktów z poziomu REST API.
3.(*) Dodawanie produktów powinno być zabezpieczone hasłem (middleware z hasłem na sztywno)

Ma to być aplikacja serwerowa w postaci REST API. Interfejs graficzny nie jest wymagany! Tematyka sklepu jak 
i produktów jest dowolna (warzywniak, sklep ze sprzętem komputerowym, itp.)

Ważne!
Przetrzymywanie danych jak i ich struktura zależna jest od programisty! Pełna dowolność w wykorzystaniu bibliotek oraz 
bazy danych. Liczę na pomysłowość i kreatywność!

Zaliczenie odbędzie się na ostatnich zajęciach z NodeJS, czyli 25-26.05.2019.*/

const fs = require('fs');
const express = require('express');
const server = express();
const bodyParser = require('body-parser');

let products = JSON.parse(fs.readFileSync('./products.json'));
let users = JSON.parse(fs.readFileSync('./users.json'));
let orders = (() => {
        try {
            let result = JSON.parse(fs.readFileSync('./orders.json'));
            return result;
        } catch (error) {
            return [];
        }
    })();
let shoppingCart = [];
let loggedUserId = false;

server.use(bodyParser.json());

server.post('/login', (req, res) => {
    const { logout } = req.query;
    if (logout) {
        loggedUserId = false;
        res.status(201).send(`Logged out.`);
        //jeśli parametr logout jest prawdziwy, następuje wylogowanie użytkownika;
    } else {
        const id = req.body.id;
        let login;
        try {
            login = users.find(user => user.id == id);
            loggedUserId = id;
            res.status(201).send(`Logged as: ${login.username}.`);
            //jeśli w tablicy users znajduje się parametr id podany przez użytkownika,
            //nastąpi jego zalogowanie;
        } catch (error) {
            res.status(404).send();
        }
    }
});
//prymitywny moduł logowania; 
//http://localhost4000/login/1 - zalogowanie użytkownika z id 1;
//http://localhost4000/login?logout=true - wylogowanie użytkownika;

server.post('/buy', (req, res) => {
    if (loggedUserId && shoppingCart.length > 0) {
        const lastId = orders.reduce((max, order) => max < order.id ? order.id : max, 0);
        const newOrder = {
            id: lastId + 1,
            userId: loggedUserId,
            order: shoppingCart
        };
        orders.push(newOrder);
        shoppingCart = [];
        try {
            let newOrders = JSON.stringify(orders);
            fs.writeFileSync('./orders.json', newOrders);
            console.log('orders.json succesfuly saved');
        } catch (error) {
            console.log('error during saving orders');
        }
        res.status(201).send(newOrder);
        //jeśi użytkownik jest zalogowany oraz w koszyku znajdują się jakieś produkty,
        //nastąpi wypchnięcie koszyka z id użytkownika do tablicy orders, a także zapisanie
        //jej w oddzielnym jsonie;
    } else {
        res.status(404).send();
    }
});
//moduł potwierdzania zakupu;
//http://localhost4000/buy

server.route('/shopping-cart/:id?')
    .get((req, res) => {
        const { id } = req.params;
        const result = id ? shoppingCart.find(product => product.id === +id) : shoppingCart;
        if (result) {
            res.send(result);
        } else {
            res.status(404).send();
        }
    })
    //wyświetlanie koszyka;
    //http://localhost4000/shopping-cart - wyświetla cały;
    //http://localhost4000/shopping-cart/1 - wyświetla po id;
    .post((req, res) => {
        const { id } = req.params;
        const { amount } = req.query;
        const lastId = shoppingCart.reduce((max, product) => max < product.id ? product.id : max, 0);
        const addToCart = {
            id: lastId + 1,
            productId: products.find(product => product.id == id),
            amount: (amount => amount ? amount : 1)(amount)
        }
        if (addToCart.productId) {
            addToCart.productId = id;
            shoppingCart.push(addToCart);
            res.status(201).send(addToCart);
        } else {
            res.send(404).send();
        }
    })
    //dodawanie produktu do koszyka (po id produktów);
    //http://localhost4000/shopping-cart/1 - gdzie 1 to id produktu z tablicy products, który ma zostać dodany do koszyka;
    .delete((req, res) => {
        const { id } = req.params;
        shoppingCart = shoppingCart.filter(product => product.id != id);
        res.send();
    })
    //usuwanie produktu z koszyka (po id koszyka);
    //http://localhost4000/shopping-cart/1 - gdzie 1 to id elementu koszyka, który ma zostać usunięty;
    .put((req, res) => {
        const { id } = req.params;
        const { put, amount } = req.query;
        const cartIndex = shoppingCart.findIndex(product => product.id == put);
        if (cartIndex === -1) {
            return res.status(404).send();
        }
        const addToCart = {
            id: put,
            productId: products.find(product => product.id == id),
            amount: (amount => amount ? amount : 1)(amount)
        }
        if (addToCart.productId) {
            addToCart.productId = id;
            shoppingCart[cartIndex] = addToCart;
            res.status(201).send(addToCart);
        } else {
            res.send(404).send();
        }
    });
    //podmienianie produktu w koszyku;
    //http://localhost4000/shopping-cart/1 - gdzie 1 to id elementu koszyka, który ma zostać podmieniony;
    //http://localhost4000/shopping-cart/1?amount=2&put=2 - gdzie 1 to id produktu z tablicy products, amount=2 to ich ilość,
    //a put=2 to miejsce na które ma wejść nowy produkt; w przypadku braku parametru amount, domyślna wartość jest przyjęta jako 1;


const password = (req, res, next) => {
    if (req.headers['password'] === 'superHardUnhackablePassword') {
        next();
    } else {
        res.status(401).send('wrong password');
    }
};
//middleware z hasłem do autoryzacji dodawania nowych produktów do tablicy products;

server.route('/products/:id?')
    .get((req, res) => {
        const { id } = req.params;
        const result = id ? products.find(product => product.id === +id) : products;
        if (result) {
            res.send(result);
        } else {
            res.status(404).send();
        }
    })
    //wyświetlanie listy produktów z tablicy products;
    //http://localhost4000/products - wyświetla całą tablicę products;
    //http://localhost4000/products/1 - wyświetla element products z id 1;
    .post(password, (req, res) => {
        const lastId = products.reduce((max, product) => max < product.id ? product.id : max, 0);
        const newProduct = {
            id: lastId + 1,
            ...req.body
        };
        products.push(newProduct);
        try {
            const newProducts = JSON.stringify(products);
            fs.writeFileSync('./products.json', newProducts);
            console.log('products.json succesfuly saved');
        } catch (error) {
            console.log('error during saving the file');
        }
        res.status(201).send(newProduct);
    });
    //dodawanie nowego produktu do tablicy products, wymaga podania hasła w nagłówku;
    //http://localhost4000/products
    //header - key: password, value: superHardUnhackablePassword;
    //body - {"productName": "nazwa_produktu"};

server.listen(4000, () => console.log('let fun begins'));