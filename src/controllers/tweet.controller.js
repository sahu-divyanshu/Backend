import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"

import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body
    
   const user =  await req.user?._id

   if (!content) {
    throw new ApiError(400, "Content is required")
   }
   const tweet = await Tweet.create({
        content,
        user
   })

   return res.status(201).json(new ApiResponse(201, "Tweet created successfully", tweet))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const user =  await req.user?._id
    const { channelId } = req.params;
    console.log("chanel Id", channelId);
    if (!channelId) throw new ApiError(401, "user id is not present");
    const tweets = await Tweet.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "userDetails",
                pipeline:[
                    {
                        $project:{
                            fullName:1,
                            username:1,
                            avatar:1,
                        }
                    }
                ]
            }
        }, 
        {
            $lookup: {
              from: "likes",
              localField: "_id",
              foreignField: "tweet",
              as: "like",
            },
        },
        {
            $addFields: {
              userDetail: {
                $first: "$userDetail",
              },
              isLikeByUser: {
                $cond: {
                  if: { $in: [user, "$like.likeBy"] },
                  then: true,
                  else: false,
                },
              },
              like: {
                $size: "$like",
              },
            },
        },
        ]);
        
        if (!tweets.length)
          throw new ApiError(400, "no tweets");
        return res
          .status(200)
          .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
    

})

const updateTweet = asyncHandler(async (req, res) => {

    const {tweetId} =req.params

    const {content} =req.body
    if(!tweetId){
        throw new ApiError(400, "Tweet id is required")
    }
    
    const istweet = await Tweet.findById(tweetId);
    
    if (!istweet) throw new ApiError(401, "tweet id is invalid");

    if(!content){
        throw new ApiError(400, "Content is required")
    }
   const user =  await req.user?._id

   if(istweet.owner.toString() !== user.toString()){
    throw new ApiError(400,"You can't update someone else's tweet")
   }

   const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set:{
                content:content
            }
    },
    {new:true}
)
    return res.status(200).json(new ApiResponse(200,updatedTweet,"tweet updated"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params

    if(!tweetId){
        throw new ApiError(400, "Tweet id is required")
    }

    const istweet = await Tweet.findById(tweetId);
    
    if (!istweet) throw new ApiError(401, "tweet id is invalid");

    const user =  await req.user?._id

    if(istweet.owner.toString() !== user.toString()){
            throw new ApiError(400,"You cant delete someone else's tweet")
    }

    const tweet = await Tweet.findByIdAndDelete(tweetId)

    if(!tweet){
        throw new ApiError(400, "Unable to delete tweet")
    }

    return res.status(200).json(new ApiResponse(200,{tweet},"tweet deleted"))
    
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}