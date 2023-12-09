const express = require('express')
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')

const {
    MongoClient,
    ServerApiVersion,
    ObjectId
} = require('mongodb');

const app = express()
const port = process.env.PORT || 5000


app.use(cors({
    origin: [
        'https://foporbaz.web.app',
        'https://foporbaz.firebaseapp.com'
    ],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())


const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token

    if (!token) {
        return res.status(401).send({
            message: "UnAuthorized"
        })
    }
    jwt.verify(token, process.env.SECRET_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(401).send({
                message: "UnAuthorized"
            })
        }
        req.user = decoded
        next()
    });

}



const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSKEY}@cluster0.33tct4k.mongodb.net/?retryWrites=true&w=majority`;



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
        const assignmentCollection = client.db("faporbaz").collection("assignment")
        const submitCollection = client.db("faporbaz").collection("submitAssignment")


        //Auth Api Token create

        // Token create code ---- require('crypto').randomBytes(64).toString('hex')

        app.post('/api/v1/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.SECRET_TOKEN, {
                expiresIn: '24h'
            })
            console.log(token);

            res.cookie("token", token, {
                httpOnly: true,
                secure: true,
                sameSite: "none"

            }).send({
                success: true
            })
        })

        app.get('/api/v1/assignments/:id', async (req, res) => {
            const id = req.params.id
            const query = {
                _id: new ObjectId(id)
            }
            const result = await assignmentCollection.findOne(query)
            res.send(result)
        })

        app.get('/api/v1/submitted/:id',  async (req, res) => {
            const id = req.params.id
            const query = {
                _id: new ObjectId(id)
            }
            const result = await submitCollection.findOne(query)
            res.send(result)
        })
        app.get('/api/v1/assignments', verifyToken, async (req, res) => {
            const user = req.query.email;
            // const difficultyLevel = req.query.difficultyLevel;
            const page = Number(req.query.page);
            const size = Number(req.query.size);

            let query = {};

            if (user) {
                query.email = user;
            }

            // if (difficultyLevel) {
            //     query.difficultyLevel = difficultyLevel;
            // }

            const result = await assignmentCollection
                .find(query) //$or: [query]
                .skip(page * size)
                .limit(size)
                .toArray();

            res.send(result);
        });


        app.get("/api/v1/assignmentCount", async (req, res) => {
            const count = await assignmentCollection.estimatedDocumentCount()
            res.send({count})
        })

        app.get('/api/v1/submitted', async (req, res) => {
            const result = await submitCollection.find().toArray()
            res.send(result)
        })

        app.post('/api/v1/assignments',  async (req, res) => {
            const assignment = req.body
            const result = await assignmentCollection.insertOne(assignment)
            res.send(result)
        })

        app.post('/api/v1/submitted', async (req, res) => {
            const submitted = req.body
            const result = await submitCollection.insertOne(submitted)
            res.send(result)
        })

        app.put('/api/v1/assignments/:id', async (req, res) => {
            const id = req.params.id
            const assignment = req.body
            const queryEmail = req ?.query ?.email
            const paramsEmail = req.body.email
            console.log(paramsEmail);

            if (paramsEmail !== queryEmail) {
                return res.status(403).send({
                    message: "forbidden access"
                })
            }
            const query = {
                _id: new ObjectId(id)
            }
            const option = {
                upsert: true
            }
            const updateAssignment = {
                $set: {
                    title: assignment.title,
                    description: assignment.description,
                    marks: assignment.marks,
                    thumbnailUrl: assignment.thumbnailUrl,
                    difficultyLevel: assignment.difficultyLevel,
                    dueDate: assignment.dueDate
                }
            }
            const result = await assignmentCollection.updateOne(query, updateAssignment, option)
            res.send(result)
        })

        app.put('/api/v1/submitted/:id', async (req, res) => {
            const id = req.params.id
            const submitMark = req.body
            
            const query = {
                _id: new ObjectId(id)
            }
            // console.log("heet",submitMark);
            const option = {
                upsert: true
            }
            const updateMarkSubmit = {
                $set: {
                    pdfLink: submitMark.pdfLink,
                    feedback: submitMark.feedback,
                    marks: submitMark.marks,
                    node: submitMark.node,
                    status: submitMark.status
                }
            }

            const result = await submitCollection.updateOne(query, updateMarkSubmit, option)
            res.send(result)
        })
        app.delete('/api/v1/assignments/:id',  async (req, res) => {
            const id = req.params.id
            const queryEmail = req ?.query?.queryEmail
            const paramsEmail = req ?.query ?.userEmail
            console.log("User Email",paramsEmail);
            console.log("User query", queryEmail);


            if (paramsEmail !== queryEmail) {
                return res.status(403).send({
                    message: "forbidden access"
                })
            }

            const queryId = {
                _id: new ObjectId(id)
            }
            const result = await assignmentCollection.deleteOne(queryId)
            res.send(result)
        })






        // Send a ping to confirm a successful connection
        await client.db("admin").command({
            ping: 1
        });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Server is running..........!!')
})

app.listen(port, () => {
    console.log(`Server Running on port ${port}`)
})