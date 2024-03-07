import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

 const generateAccessAndRefreshTokens = async (userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken() 
        
        user.refreshToken = refreshToken;// error aye toh capital use karna
        await user.save({validateBeforeSave:false})

        return{accessToken,refreshToken}


    } catch (error) {
        throw new ApiError(500,"something went wrong while generating refresh and access token")
    }
 }


const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation
    // check if user already exists : username,email
    // check for avatar & images 
    // upload them to cloudinary
    // create user object - create entry in db
    // remove pass and refresh token from response
    // check for user creation
    // return res

    const{fullName,email,username,password}=req.body
    // console.log("email: ",email);
    // console.log("pass: ",password);

    // if(fullName === ""){
    //     throw new ApiError(400,"fullname is required")
    // }

    // if(email === "" ){
    //     throw new ApiError(400,"email is required")
    // }

    // if(username === ""){
    //     throw new ApiError(400,"username is required")
    // }

    // if(password === ""){
    //     throw new ApiError(400,"password is required")
    // }

    if(
        [fullName,email,username,password].some((field)=>
        field?.trim() === "" )
        ){
            throw new ApiError(400,"All fields are required")
     }

     const existedUser = await User.findOne({
        $or:[{username},{email}]
     })

     if(existedUser){
        throw new ApiError(409," Username or email already exists ")
     }


    //  console.log(req.files)

    const avatarLocalpath =  req.files?.avatar[0]?.path;
    // fields use karna file ki jagah agar error aye toh
   // const coverImageLocalpath =  req.files?.coverImage[0]?.path;

   let coverImageLocalpath;

   if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0 ){
       coverImageLocalpath = req.files?.coverImage[0]?.path
   }

    if(!avatarLocalpath){
        throw new ApiError(400,"avatar is required")
    }


    const avatar = await uploadOnCloudinary(avatarLocalpath)
    if(coverImageLocalpath){
        var coverImage = await uploadOnCloudinary(coverImageLocalpath)
    }
   

    if(!avatar){
        throw new ApiError(400,"avatar is required")
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

   const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
   )
   if(!createdUser){
    throw new ApiError(500,"something went wrong while registering a user")
   }

   return res.status(201).json(
    new ApiResponse(200,createdUser,"user registered successfully")
   )
    

});


const loginUser = asyncHandler(async(req,res) =>{
    // req body se data lao
    // username or email
    // find ths user
    // if found check pass
    //access and refresh token
    // send cookies and response


    const {email,username,password} = req.body

    if(!username && !email){
        throw new ApiError(400,"username or email is required")
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"user does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"pass incorrect");
    }


    const {accessToken,refreshToken}= await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "user logged in successfully "
        )
    )

});


const logoutUser = asyncHandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )
    const options = {
        httpOnly:true,
        secure:true
    }
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))


})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken=  req.cookies.refreshAccessToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorised req")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken._id)
    
        if(!user){
            throw new ApiError(401,"invalid refresh token")
        }
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"refresh token is expired or used ")
        }
    
        const options = {
            httpOnly:true,
            secure:true
        }
        const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:newRefreshToken},
                "access token refreshed"
            )
        )
    
    } catch (error) {
        throw new ApiError(401,error?.message || "invalid refresh token")
    }



})


const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body

    const user  = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(401,"invalid old pass")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave:false})

    return res.status(200)
    .json(new ApiResponse(200,{},"pass changed successfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(new ApiResponse(200,req.user,"current user fetched successfully"))

})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body;
    
    if(!fullName || !email){
        throw new ApiError(400,"all fields are reqired")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName:fullName,
                email:email
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user,"account details updated successfully"))


})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalpath =  req.file?.path;
    if(!avatarLocalpath){
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalpath)

    if(!avatar.url){
        throw new ApiError(400,"error while uploading avatar")
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url,
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(200,user,"avatar updated successfully")

})


const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalpath =  req.file?.path;
    if(!coverImageLocalpath){
        throw new ApiError(400,"coverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalpath)

    if(!coverImage.url){
        throw new ApiError(400,"error while uploading coverImage")
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url,
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(200,user,"coverImage updated successfully")
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
};
