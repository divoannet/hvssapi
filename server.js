require('dotenv').config();
const express = require("express");
const fs = require("fs");
const https = require("https");
const bodyParser = require('body-parser');
const needle = require("needle");
const cheerio = require("cheerio");
const { checkUrl } = require("./helpers");

const app = express();

const key = fs.readFileSync(process.env.KEY_PATH, 'utf8');
const cert = fs.readFileSync(process.env.CERT_PATH, 'utf8');

app.use(bodyParser.json());

app.get("/", (req, res, next) => {
    const { url } = req.query;

    const isValidUrl = checkUrl(url);

    if (!isValidUrl) {
        res.status(500).send({ code: 'nourl', error: 'Not correct URL' });
        return;
    }

    const urlObj = new URL(url);
    const indexUrl = urlObj.origin;
    const usersUrl = indexUrl + "/userlist.php"

    const response = {
        forums: [],
        groups: []
    }

    needle("get", indexUrl)
        .then(indexData => {
            const $ = cheerio.load(indexData.body);
            const pun = $('#pun');

            if (!pun) {
                res.status(500).send({ code: 'nopun', error: 'Not mybb URL' });
            }

            const links = $('.tclcon h3 a');

            links.each((index, element) => {
                response.forums.push($(element).text());
            })
        })
        .then(() => {
            return needle("get", usersUrl)
        })
        .then(usersData => {
            const $ = cheerio.load(usersData.body);
            const groups = $('#fld2 option');

            groups.each((index, element) => {
                const group = $(element).text();

                if (!['Все пользователи', 'Администраторы', 'Модераторы'].includes(group)) {
                    response.groups.push($(element).text());
                }
            })
            res.send(response);
        })
});

https.createServer({ key, cert }, app).listen(3001);
