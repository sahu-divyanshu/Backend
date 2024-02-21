import mongoose,{Schema} from "mongoose";
import  jwt  from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true,// for searching
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    },
    fullName:{
        type:String,
        required:true,
        trim:true,
        index:true,
        
    },
    avatar:{
        type:String,// cloudinary url
        required:true,

    },
    coverImage:{
        type:String,
    },
    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:"Video",
        }
    ],
    password:{
        type:String,
        required:[true,"password is required"]
    },
    refreshToken:{
        type:String
    }


},{timestamps:true})

userSchema.pre("save",async function(next){
    if(!this.isModified("password")){
        return next();
    }
    this.password = bcrypt.hash(this.password,10)//pasword encryption 10 rounds
    next()
})


userSchema.methods.isPasswordCorrect = async function(password){
   return await bcrypt.compare(password,this.password)
};

userSchema.methods.generateAccessToken = function(){
    return jwt.sign({//sign method generates token
        _id:this._id,
        email:this.email,
        fullname:this.fullName,
        username:this.username,

    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
    )
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign({
        _id:this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn:process.env.REFRESH_TOKEN_EXPORY
    }
    )
}

export const User = mongoose.model("User",userSchema)