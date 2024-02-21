import { express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";


const app = express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
})) 

app.use(express.json({limit:"20kb"})) // for form
app.use(express.urlencoded({extended:true,limit:"20kb"})) //for url

app.use(express.static("public")) // for public assets

app.use(cookieParser()) // for doing curd operations on cookies of user from server



export {app}