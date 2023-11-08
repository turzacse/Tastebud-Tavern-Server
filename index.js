const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// [
//   'https://tastebud-tavern.web.app',
//   'https://tastebud-tavern.firebaseapp.com',
//   '*'
// ]
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bnzewy6.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//my middlewares 
const logger = (req, res, next) =>{
  console.log('loginfo : ', req.method, req.url);
  next();
}

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log('token in the middleware', token);
  // next();
  if(!token) {
    return res.status(401).send({message: 'unauthorized access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err) {
      return res.status(401).send({message: 'unauthorized access'})
    }
    req.user = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db('tastebudDB').collection('users');
    const foodCollection = client.db('tastebudDB').collection('allfoods');

    const orderCollection = client.db('tastebudDB').collection('order');


    app.post('/jwt', async(req, res) => {
      const logged = req.body;
      console.log('user for token', logged);
      const token = jwt.sign(logged, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
      
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
      .send({success: true});
    })

    app.post('/logout', async(req, res) =>{
      const logged = req.body;
      console.log('logging out', logged);
      res.clearCookie('token', {maxAge: 0}).send({success: true})
    })


    //user related api
    app.get('/users', async(req, res) =>{
      const users = await userCollection.find().toArray();
      res.send(users);
    })

    app.post('/users', async(req, res)=>{
      const user = req.body;
      console.log(user);
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    //food related API
    // app.get('/foods', async(req,res) =>{
    //   const foods = await foodCollection.find().toArray();
    //   res.send(foods);
    // })
    // app.get('/allfoods', async(req, res) =>{
    //   const cursor = foodCollection.find();
    //   const result = await cursor.toArray();
    //   res.send(result);
    // })

    app.get('/allfoods', async(req,res)=>{
      const food = foodCollection.find();
      const result = await food.toArray();
      res.send(result);
    })
  
    app.post('/allfoods', async(req, res)=>{
      const food = req.body;
      console.log(food);
      const result = await foodCollection.insertOne(food);
      res.send(result);
    })

    app.put('/allfoods/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upset: true };
      const updatedProduct = req.body;
      const food = {
        $set: {
          foodName: updatedProduct.foodName,
          foodCategory: updatedProduct.foodCategory,
          quantity: updatedProduct.quantity,
          origin: updatedProduct.origin,
          price: updatedProduct.price,
          descriptions: updatedProduct.descriptions,
        }
      }
      const result = await foodCollection.updateOne(filter, food, options);
      res.send(result);
    })

    //order related API
    app.get('/order', logger, verifyToken, async(req, res) =>{
      console.log(req.body);
      console.log('owener info: ', req.user);
      //console.log('cookkkkkiee', req.cookies);
      const order = orderCollection.find();
      const result = await order.toArray();
      res.send(result);
    })

    app.post('/order', async(req,res) => {
      const order = req.body;
      console.log(order);

      // added 
      await foodCollection.updateOne(
        {_id: new ObjectId(order.foodID)},
        { $inc: { ordersCount: 1}}
      );
      //
      const result = await orderCollection.insertOne(order);
      res.send(result);
    })

    app.get('/topfoods', async(req, res) =>{
      const topFood = await foodCollection
      .find()
      .sort({ ordersCount: -1 })
      .limit(6)
      .toArray();

      res.send(topFood);
    })

    app.delete('/order/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res)=>{
    res.send('server is running');
})


app.listen(port, () =>{
    console.log(`server is runnin on port: ${port}`);
})

module.exports = app;