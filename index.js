const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

//express dot env
require('dotenv').config();
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ecpul2e.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

//middleware
app.use(cors({
  origin:['http://localhost:5173'],
  credentials:true
}));
app.use(express.json());
app.use(cookieParser());

//personal created middle ware
const verifyToken = async(req, res, next) =>{
    const token = req?.cookies.token;
    if(!token){
        return res.status(401).send({message: 'not authorized'})
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(err, decoded)=>{
      //error
      if(err){
         console.log('invalid', err)
         return res.status(401).send({message: 'not valid'})
      }
      // if token is valid then it would be decoded
      console.log('decoded:', decoded)
      req.user = decoded;
      next();
    })
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // foods collection
    const foodCollection = client.db('foodDB').collection('foods');
    const requestCollection = client.db('requestDB').collection('requests');
    
    //create jwt token
    app.post('/jwt', async(req,res)=>{
      const user = req.body;
      //generating token
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'})

      res
      .cookie(
          "token",
          token,
          {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production" ? true: false,
              sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          }
      ) 
      .send({success: true});
    })

    //jwt logout token
    app.post('/logout',async(req,res)=>{
      const user = req.body;
      console.log('user logout', user);
      res
      .clearCookie('token',{maxAge:0})
      .send({success:true})
    })

    //create api to post data on server
    app.post('/addFood', verifyToken,async (req, res) => { 
      //verifying token
      if(req.user.email !== req.params.email){
        return res.status(403).send('unauthorized access');
     }
      const foodItem = req.body;
      const result = await foodCollection.insertOne(foodItem)
      res.send(result);
    })

    //get all the data from server
    app.get('/allFood', async (req, res) => {
      
      const statusk = req.query;
      // console.log(statusk);
      let query = {}
      if (statusk.status) {
        query = { status: statusk.status }
        // console.log(query)
      }
      const cursor = foodCollection.find(query);
      const foodArray = await cursor.toArray();
      // console.log(foodArray)
      res.send(foodArray);
    })

    //get the filter data from server
    app.get('/filter', async (req, res) => {
      const name = req.query;
      //  console.log(name)
      const query = { itemName: name.name }
      //  console.log(query)
      const cursor = foodCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })


    //get single food details
    app.get('/details/:id', verifyToken, async (req, res) => {
      console.log(req.query.userEmail)
      //verifying token
      if(req.user.email !== req.query.userEmail){
        return res.status(403).send('unauthorized access');
     }
      const id = req.params.id;
      //  console.log(id);
      const query = { _id: new ObjectId(id) }
      const result = await foodCollection.findOne(query);
      res.send(result);
    })

    //set requested food information to data base
    app.post('/request/', async (req, res) => {
      const requestedFood = req.body;
      const result = await requestCollection.insertOne(requestedFood);
      res.send(result);
    })

    //getting the request data by donnar email
    app.get('/request/:email', verifyToken, async (req, res) => {
      //verifying token
      if(req.user.email !== req.params.email){
         return res.status(403).send('unauthorized access');
      }
      const email = req.params.email;
      let foodId = {};
      if(req.query.foodId){
        foodId = req.query.foodId
        const filter = { requesterEmail: email, foodId: foodId };
        const result = await requestCollection.findOne(filter);
        res.send(result)
      }
      if(!req.query.foodId){
        const filter = { requesterEmail: email};
        const result = await requestCollection.findOne(filter);
        res.send(result);
      }
      
      
    })

    //get food data based on user email
    app.get('/userAllFood/:email', verifyToken, async(req,res)=>{
      console.log(req.user.email, req.params.email)
      //verifying token
      if(req.user.email !== req.params.email){
        return res.status(403).send('unauthorized access');
     }
      const email = req.params.email;
      const filter = {email: email};
      const result = await foodCollection.find(filter).toArray();
      res.send(result);

  })

    //to filter the requested food
    app.get('/filter/:email', async(req,res)=>{
       const email = req.params.email;
       const query = {requesterEmail: email};
       const result = await requestCollection.find(query).toArray();
       res.send(result);
    })


    //update food information
    app.patch('/update/:fooId', async(req,res)=>{
      const foodId = req.params.fooId;
      // console.log(foodId);
      const {itemName, quantity, expired, donnarLocations, photo, notes} = req.body;
      // console.log(itemName, quantity, expired, photo, donnarLocations, notes);
      const filter = {_id: new ObjectId(foodId)}
      const updateDoc = {
        $set:{
           itemName:itemName,
           quantity:quantity,
           expired:expired,
           donnarLocation:donnarLocations,
           photo:photo,
           notes:notes
        }
      }
      const result = await foodCollection.updateOne(filter, updateDoc);
      res.send(result);
      // console.log(photo)
    })


    //delete food
    app.delete('/delete/:id', async(req,res)=>{
      const foodId = req.params.id;
      const query = {_id: new ObjectId(foodId)}
      const result = await foodCollection.deleteOne(query)
      res.send(result);
    })


    //find all user requested data
    app.get('/allRequest/:email', async(req,res)=>{
          const email = req.params.email;
          const query = {requesterEmail: email};
          const result = await requestCollection.find(query).toArray();
          res.send(result)
    })










    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //   await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('food server is running')
})

app.listen(port, () => {
  console.log(`food Server is running on Port: ${port}`);
})
