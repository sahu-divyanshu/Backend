import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {User} from "../models/user.model.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const user =  req.user._id;
    if(!user) {throw new ApiError(400,"user not found")}
    const channelStats = User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(user)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"_id",
                foreignField:"owner",
                as:"videolist",
                pipeline:[
                    {
                        $lookup:{
                            from:"likes",
                            localField:"_id",
                            foreignField:"video",
                            as:"likes",
                        },
  
                    },
                    {
                        $group: {
                          _id: null,
                          totalViews: { $sum: "$views" },
                          totalLikes: { $sum: 1 },
                        },
                      },
                ]
            }
        },
        {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
        },
        {
            $addFields: {
              totalSubscribers: {
                $size: "$subscribers",
              },
              totalLikes: { $first: "$videoList.totalLikes" },
              totalViews: { $first: "$videoList.totalViews" },
            },
          },
    ])
    if(!channelStats){
        throw new ApiError(500, "stats can not calculated");
    }
    return res.status(200).json(new ApiResponse(200,{channelStats},"channel stats fetched successfully"))
})

const getChannelVideos = asyncHandler(async (req, res) => {  
    const videos = await Video.aggregate([
        {
          $match: {
            owner: new mongoose.Types.ObjectId(req.user._id),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "createdBy",
            pipeline: [
              {
                $project: {
                  fullName: 1,
                  userName: 1,
                  avatar: 1,
                },
              },
            ],
          },
        },
        {
          $addFields: {
            createdBy: {
              $first: "$createdBy",
            },
          },
        },
      ]);
    console.log(videos);
    if (!videos.length) throw new ApiError(500, "videos is missing");
  
    return res
      .status(200)
      .json(new ApiResponse(200, videos, "channel videos fetch successfully"));
  });

export {
    getChannelStats, 
    getChannelVideos
    }