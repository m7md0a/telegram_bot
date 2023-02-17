const express = require('express');
const Telegram = require("node-telegram-bot-api");
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser')
require('dotenv').config();

const app = express();
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

// CONNECT DB SQLITE
const db = new sqlite3.Database(process.env.FILE_BD, sqlite3.OPEN_READWRITE, (err) => err && console.log(err.message))

let sql,
    token = process.env.BOT_TOKEN,
    opt = {polling : true},
    bot = new Telegram(token, opt);


// CREATE TABLE
sql = `CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, first_name, username)`
db.run(sql)

sql = `CREATE TABLE IF NOT EXISTS jokes(id INTEGER PRIMARY KEY, joke)`
db.run(sql)

sql = `CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, message, replay)`
db.run(sql)

// BOT 
bot.on('message', (msg) => {

    let admin = parseInt(process.env.ADMIN),
        id = msg.from.id,
        user = msg.from,
        msge = msg.text.toString().toLowerCase();
    if (msge.startsWith('/start') || msge === 'link' || msge === 'هات الينك' || msge === "الينك" || msge === "لينك" || msge === "صراحة") {
        sql = `INSERT INTO users(id ,first_name , username) VALUES (?,?,?)`;
        db.run(sql, [parseInt(user.id), user.first_name, user.username], (err) => {
            err && console.log(err.message);
        })
        bot.sendMessage(parseInt(user.id), process.env.URLWEB + id)
    }

    if (msg.text.startsWith('/sendAll')) {
        if (id === admin) {
            let text = msg.text.replace(/\/sendAll/g, '');
            db.all('SELECT * FROM users',[], (err, rows) => {
                err && console.log(err.message);
                rows.forEach(user => {
                    bot.sendMessage(user.id, text , {
                        'parse_mode' : 'Markdown'
                    })
                })
            })
        }
    }

    if (msg.text.startsWith('/add')) {
        if (id === admin) {
            let a = msg.text
            let b = a.slice(a.indexOf('[') + 1, a.indexOf(']')).split('>')
            bot.sendMessage(id, b[0].toString().toLowerCase() + ' - ' + b[1]);
            sql = `INSERT or ignore INTO messages(message , replay) VALUES (?,?)`;
            db.run(sql, [b[0].toString().toLowerCase() , b[1]], (err) => {
                err && console.log(err.message);
            })
        }
    }

    if (msg.text.startsWith('/jokeADD')) {
        if (id === admin) {
            let text = msg.text.replace(/\/jokeADD/g, '');
            sql = `INSERT INTO jokes(joke) VALUES (?)`;
            db.run(sql, [text], (err) => {
                err && console.log(err.message);
                bot.sendMessage(id, text + ' is added');
            })
        }
    }
    
    if (msg.text === 'قولي نكتة' || msg.text === 'joke' || msg.text === 'jokes' || msg.text === 'قولى نكتة' || msg.text === 'قولى نكته' || msg.text === 'قولي نكته') {
        db.all('SELECT * FROM jokes',[], (err, rows) => {
            let rand = Math.floor(Math.random() * rows.length)
            bot.sendMessage(id , rows[rand].joke)
        });
    }

    if (msg.text) {
        db.all('SELECT * FROM messages WHERE message like ?',[msg.text.toString().toLowerCase() + "%"], (err, rows) => {
            err && console.log(err);
            if (rows.length > 0) {
                let rand = Math.floor(Math.random() * rows.length)
                bot.sendMessage(id , rows[rand].replay)
            }
            else{
                let text = msg.text.toString().toLowerCase().split(' ');
                text.every(e => {
                    if (e.length > 3) {
                        db.all('SELECT * FROM messages WHERE message LIKE ?', [e + '%'], (err, rows) => {
                            err && console.log(err);
                            if (rows.length > 0) {
                                let rand = Math.floor(Math.random() * rows.length)
                                bot.sendMessage(id , rows[rand].replay)
                                return false;
                            }
                        }); 
                    }
                    return true;
                  });
            }
        });
    }

})
 


// CORS 
let ALLOWED_ORIGINS = ["https://sa-app-me.surge.sh", "http://localhost:5500"];
app.use((req, res, next) => {
    let origin = req.headers.origin;
    let theOrigin = (ALLOWED_ORIGINS.indexOf(origin) >= 0) ? origin : ALLOWED_ORIGINS[0];
    res.header("Access-Control-Allow-Origin", theOrigin);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
})


// EXPORSS API WITH SQLITE
app.get('/api/user/:id', (req, res) => {
    db.all('SELECT * FROM users WHERE id = ?',[req.params.id], (err, rows) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        else {
            if (rows.length > 0) {
                res.status(200).json(rows)
            }
            else {
                res.status(404).json({"error": 'no user'});
                return;
            }
        }
    });
});

app.post('/api/send', (req, res) => {
    let {id , message} = req.body;
    db.all('SELECT * FROM users WHERE id = ?',[id], (err, rows) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        else {
            if (rows.length > 0) {
                bot.sendMessage(id, message);
                res.status(200).json({'success':'Message has been sent'})
            }
            else {
                res.status(404).json({"error": 'no user'});
                return;
            }
        }
    });
});
// START EXPRESS SERVER
app.listen(process.env.PORT || 3000, () =>
  console.log(`Example app listening on port 3000!`),
);

// db.close()