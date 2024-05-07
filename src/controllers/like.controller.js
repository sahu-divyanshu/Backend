import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import {Tweet} from "../models/tweet.model.js"
import {Comment} from "../models/comment.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    if (!videoId) throw new ApiError(400, "video id is requred");
    const isVideo = await Video.findById(videoId);
    if (!isVideo) throw new ApiError(400, "video id is invalid");

    const like = await Like.aggregate([{
        $match: {
            $and: [
                { video: new mongoose.Types.ObjectId(videoId) },
                { likeBy: new mongoose.Types.ObjectId(req.user._id) },
              ],
        }
    }])
    if(!like?.length){
        const addLike = await Like.create({
            video: videoId,
            likeBy: req.user._id
        })
        if (!addLike) throw new ApiError(500, "like toggle failed");
        res.status(200).json(new ApiResponse(200, "like added", addLike))
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if (!commentId) throw new ApiError(400, "comment id is requred");
    const isComment = await Comment.findById(commentId);
    if (!isComment) throw new ApiError(400, "comment id is invalid");
    const like = await Like.aggregate([
      {
        $match: {
          comment: new mongoose.Types.ObjectId(commentId),
          likeBy: new mongoose.Types.ObjectId(req.user._id),
        },
      },
    ]);
    if (!like?.length) {
      const addLike = await Like.create({
        comment: commentId,
        likeBy: req.user._id,
      });
      if (!addLike) throw new ApiError(500, "like toggle failed");
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "user like this comment"));
    }
    console.log("like", like);
    const deleteLike = await Like.findByIdAndDelete(like[0]?._id);
    if (!deleteLike) throw new ApiError(500, "like toggle failed");
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "user not like this comment"));
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    if (!tweetId) throw new ApiError(400, "tweet id is requred");
    const isTweet = await Tweet.findById(tweetId);
    if (!isTweet) throw new ApiError(400, "tweet id is invalid");
    const like = await Like.aggregate([
      {
        $match: {
          tweet: new mongoose.Types.ObjectId(tweetId),
          likeBy: new mongoose.Types.ObjectId(req.user._id),
        },
      },
    ]);
    if (!like?.length) {
      const addLike = await Like.create({
        tweet: tweetId,
        likeBy: req.user._id,
      });
      if (!addLike) throw new ApiError(500, "like toggle failed");
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "user like this video"));
    }
    console.log("like", like);
    const deleteLike = await Like.findByIdAndDelete(like[0]?._id);
    if (!deleteLike) throw new ApiError(500, "like toggle failed");
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "user not like this video"));
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    const likeVideos = await Like.aggregate([
        {
          $match: {
            likeBy: new mongoose.Types.ObjectId(req.user._id),
            video: { $exists: true },
          },
        },
        {
          $lookup: {
            from: "videos",
            localField: "video",
            foreignField: "_id",
            as: "likeVideos",
            pipeline: [
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
                        username: 1,
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
            ],
          },
        },
        {
          $addFields: {
            likeVideos: {
              $first: "$likeVideos",
            },
          },
        },
      ]);
      return res
        .status(200)
        .json(new ApiResponse(200, likeVideos, "like videos fetch successfully"));
          
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}