const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//express dot env
require('dotenv').config();
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ecpul2e.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

//middleware
app.use(cors());
app.use(express.json());

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


      //create api to post data on server
        app.post('/addFood',async(req, res)=>{
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
        app.get('/filter', async(req,res)=>{
           const name = req.query;
          //  console.log(name)
           const query = {itemName:name.name}
          //  console.log(query)
          const cursor = foodCollection.find(query);
          const result = await cursor.toArray();
          res.send(result);
        })


        //get single food details
        app.get('/details/:id', async(req,res)=>{
             const id = req.params.id;
            //  console.log(id);
             const query = {_id: new ObjectId(id)}
             const result = await foodCollection.findOne(query);
             res.send(result);
        })

        //set requested food information to data base
        app.post('/request/', async(req,res)=>{
          const requestedFood = req.body;
          const result = await requestCollection.insertOne(requestedFood);
          res.send(result);
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
    res.send('coffee server is running')
  })
  
  app.listen(port, () => {
    console.log(`Coffee Server is running on Port: ${port}`);
  })
