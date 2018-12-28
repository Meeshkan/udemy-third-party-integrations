import axios from 'axios';
import * as mongodb from 'mongo-mock';
import { createServer } from 'http'
import { parse } from 'url'
import * as next from 'next'

const unmockify = async () => {
  if (process.env.NODE_ENV !== "production") {
    const { unmock } = require("unmock");
    await unmock({ ignore: "story "});
  }
}

unmockify();

const MongoClient = mongodb.MongoClient;

const port = parseInt(process.env.PORT, 10) || 3000
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare()
.then(() => {
  createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true)
    const { pathname, query } = parsedUrl

    if (pathname === '/porterduff') {
      const url = 'mongodb://localhost:27017/myproject';
      const db = await MongoClient.connect(url);
      const collection = db.collection('users');
      const { email } = query;
      const findResult = await collection.find({ email });
      const findArray = await findResult.toArray();
      if (findArray.length === 0) {
        console.log('now inserting email');
        collection.insert({ email });
        await axios.post("https://api.sendgrid.com/v3/mail/send", {
          personalizations: [{
            to: {
              email,
            }
          }],
          subject: "hi there!",
          from: { email: "mike@porterduff.io", name: "Mike Solomon"}
        }, {
          headers: {
            Authorization: `Bearer u_n_m_o_c_k_200` // change to process.env
          }
        });
      } else {
        console.log('email already inserted - skipping insert');
      }
      app.render(req, res, '/porterduff')
    } else {
      handle(req, res, parsedUrl)
    }
  })
  .listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://localhost:${port}`)
  })
})