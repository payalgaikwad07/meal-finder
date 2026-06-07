import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
const port = 3000;
const API_URL = "https://www.themealdb.com/api/json/v2/1"

app.use(bodyParser.urlencoded({extended:true}));

app.get("/", (req,res) =>{
    res.render("index.ejs", );
});


app.listen(port, ()=>{
    console.log(`Listening on port ${port}`);
})
