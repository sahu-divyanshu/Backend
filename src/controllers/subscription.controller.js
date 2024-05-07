import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const subscriberId = req.user._id;

    const isChannel = await User.findById(channelId);
    if (!isChannel) throw new ApiError(400, "channel id is invalid");
    if(channelId.toString() === subscriberId.toString()){
        throw new ApiError(400, "you can't subscribe to your channel")
    }
    const isSubscribed = await Subscription.aggregate([
      {
        $match: {
          $and: [
            { channel: new mongoose.Types.ObjectId(channelId) },
            { subscriber: new mongoose.Types.ObjectId(subscriberId) },
          ],
        },
      },
    ]);
   if (!isSubscribed.length ){
        const addSubscription = Subscription.create({
            subscriber: subscriberId,
            channel: channelId
        })
        if (!addSubscription)
        throw new ApiError(500, "subscription is not toggle successfully");
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "Subscription is toggle successfully"));

   }
   else{
        const removeSubscription = Subscription.findByIdAndDelete(isSubscribed[0]._id)
        if (!removeSubscription)
        throw new ApiError(500, "subscription is not toggle successfully");
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Subscription is toggle successfully"));
   }
})

const getSubscribedChannels = asyncHandler(async(req,res)=>{
    // channel ne kitno ko subscribe kiya hai
    const { subscriberId } = req.params;
    if (!subscriberId) throw new ApiError(400, "subscriber id is requred");
    const isSubscriber = await User.findById(subscriberId);
    if (!isSubscriber) throw new ApiError(400, "subscriber id is invalid");

    const subscribedChannels = await Subscription.aggregate([
        {
            $match:{
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField: "_id",
                as:"subscribed",
                pipeline:[
                    {
                        from:"subscriptions",
                        localField: "_id",
                        foreignField: "subscriber",
                        as:"subscribers",
                    },
                    {
                        $addFields: {
                            subscribedCount: {
                                $size: "$subscribers"
                            }
                        }
                    },
                    {
                        $project:{
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                            subscribedCount: 1,
                        }
                        
                    }
                ]
            },
            
        },{
            $addFields:{
                subscribed: {
                    $arrayElemAt: ["$subscribed", 0]
                }
            }
        }
    ])
    return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannels,
        "SubscribedChannels are fetch successfully"
      )
    );

})

const getUserChannelSubscribers = asyncHandler(async(req,res)=>{
    // channel ke kitne subscriber
    const { channelId } = req.params;
    console.log(channelId);
    if (!channelId) throw new ApiError(400, "channel id is requred");
    const isChannel = await User.findById(channelId);
    if (!isChannel) throw new ApiError(400, "channelId  is invalid");
    const subscribers = await Subscription.aggregate([
        {
            $match:{
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup:{
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribers",
                pipeline:[
                    {
                        $lookup:{
                            from:"subscriptions",
                            localField:"_id",
                            foreignField:"channel",
                            as: "subscribers",
                        }
                    },
                    {
                        $addFields:{
                            subscribersCount:{$size:"$subscribers"}
                        }
                    },
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1,
                          },
                    }
                ]
            }
        },
        {
            $addFields: {
              subscribers: {
                $first: "$subscribers",
              },
            },
        },   
    ])
    return res.status(200).json(new ApiResponse(200,{subscribers},"subscribers count fetched successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}