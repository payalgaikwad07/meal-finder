import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
const port = 3000;
const API_URL = "https://www.themealdb.com/api/json/v1/1"

app.use(express.static("public"));

app.use(bodyParser.urlencoded({extended:true}));

app.get("/", (req,res) =>{
    res.render("index.ejs", );
});

app.post("/search/name", async(req,res)=>{
    const mealName = req.body.mealName;
    try {
        const response = await axios.get(`${API_URL}/search.php?s=${mealName}`)
        const meals = response.data.meals;

        res.render("result.ejs", {
            meals: meals || [],
            query: mealName
        });
        
    } catch (error) {
        console.error(error);
        res.render("result.ejs", { meals: [], query: mealName });
    }
   
});

app.post("/search/cuisine", async (req, res) => {
  const cuisine = req.body.cuisine;
  try {
    const response = await axios.get(`${API_URL}/filter.php?a=${cuisine}`);
    const meals = response.data.meals || [];
    
    res.render("result.ejs", {
      meals: meals,
      query: cuisine + " cuisine"
    });
  } catch (error) {
    console.error(error);
    res.render("result.ejs", { meals: [], query: cuisine });
  }
});

app.get("/meal/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const response = await axios.get(`${API_URL}/lookup.php?i=${id}`);
    const meal = response.data.meals[0];
    res.render("detail.ejs", { meal });
  } catch (error) {
    res.redirect("/");
  }
});

app.post("/search/random", async (req, res) => {
  try {
    const response = await axios.get(`${API_URL}/random.php`);
    const meals = response.data.meals || [];
    res.render("result.ejs", {
      meals: meals,
      query: "Random Meal"
    });
  } catch (error) {
    console.error(error);
    res.render("result.ejs", { meals: [], query: "Random" });
  }
});


app.listen(port, ()=>{
    console.log(`Listening on port ${port}`);
})
