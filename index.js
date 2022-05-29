const express = require('express')
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000


app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zbpyf.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next){
  const authHeader = req.headers.authorization;
  if( !authHeader ){
    return res.status(401).send({message: 'UnAuthorized Access'});
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
    if(err){
      return res.status(403).send({message: 'Forbidden Access'});
    }
    req.decoded = decoded;
    next()
  });
}

async function run(){
    try{
        await client.connect();
        const productCollection = client.db("computer-organs").collection("products");
        const orderCollection = client.db("computer-organs").collection("order");
        const userCollection = client.db("computer-organs").collection("users");

        app.get('/product', async(req, res) =>{
            const query = {}
            const cursor = productCollection.find(query)
            const products = await cursor.toArray()
            res.send(products)
        })

        
      app.get('/product/:id', async(req, res) =>{
        const id = req.params.id;
        const query = {_id: ObjectId(id)};
        const product = await productCollection.findOne(query);
        res.send(product);
      })

      app.delete('/product/:id', async(req, res) =>{
        const id = req.params.id;
        const query = {_id: ObjectId(id)};
        const result = await productCollection.deleteOne(query);
        res.send(result);
      })


      app.get('/user', verifyJWT, async(req, res) =>{
        const users = await userCollection.find().toArray();
        res.send(users);
      });

      app.get('/admin/:email', async(req, res) =>{
        const email = req.params.email;
        const user = await userCollection.findOne({email: email});
        const isAdmin = user.role === 'admin';
        res.send({admin: isAdmin})
      })

      app.put('/user/admin/:email', verifyJWT, async( req, res ) =>{
        const email = req.params.email;
        const requester = req.decoded.email;
        const requesterAccount = await userCollection.findOne({email: requester});
        if( requesterAccount.role === 'admin'){
          const filter = {email: email};
          const updateDoc = {
            $set: {role: 'admin'},
          };
          const result = await userCollection.updateOne(filter, updateDoc);
          res.send(result);
        }else{
          res.status(403).send({message: 'Forbidden'});
        }
      })


      app.put('/user/:email', async( req, res ) =>{
        const email = req.params.email;
        const user = req.body;
        const filter = {email: email};
        const options = {upsert: true};
        const updateDoc = {
          $set: user,
        };
        const result = await userCollection.updateOne(filter, updateDoc, options);
        const token = jwt.sign({email: email}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h'})
        res.send({result, token});
      })






      app.post('/order', async( req, res) =>{
        const order = req.body;
        const result = await orderCollection.insertOne(order);
        res.send(result);
      })

      app.get('/order', verifyJWT, async(req, res) =>{
        const email = req.query.email;
        const decodedEmail = req.decoded.email;
        if( email === decodedEmail){
          const query = {email};
          const cursor = orderCollection.find(query);
          const myitems = await cursor.toArray();
          res.send(myitems); 
        }else{
          return res.status(403).send({message: 'Forbidden Access'});
        }
      })

      app.delete('/order/:id', async(req, res) =>{
        const id = req.params.id;
        const query = {_id: ObjectId(id)};
        const result = await orderCollection.deleteOne(query);
        res.send(result);
      })

    }finally{}
}
run().catch(console.dir)



app.get('/', (req, res) => {
  res.send('Hello Computer Organs!')
})

app.listen(port, () => {
  console.log(`Computer Organs app listening on port ${port}`)
})