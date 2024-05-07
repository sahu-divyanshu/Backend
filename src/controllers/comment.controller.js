import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
   
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const isVideo = await Video.findById(videoId)

    if(!isVideo){
        throw new ApiError(404, "video not found")
    }

    const comments = await Comment.find({video: videoId})
        .sort({createdAt: -1})
        .limit(limit * 1)
        .skip((page - 1) * limit)

    const total = await Comment.countDocuments({video: videoId})

    res.status(200).json(new ApiResponse(200,{total,comments}, "comments aa gye"))
})

const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const isVideo = await Video.findById(videoId)
    if(!isVideo){
        throw new ApiError(404, "video not found")
    }
    const {comment} = req.body
    if(!comment){
        throw new ApiError(400, "comment is required")
    }
    const newComment = await Comment.create({
        owner: req.user._id,
        video: videoId,
        content:comment
    })
    res.status(200).json(new ApiResponse(200, newComment, "comment added"))


})

const updateComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    
    const isVideo = await Video.findById(videoId)

    if(!isVideo){
        throw new ApiError(404, "video not found")
    }
    const {comment} = req.body
    if(!comment){
        throw new ApiError(400, "comment is required")
    }
    const commentToUpdate = await Comment.findByIdAndUpdate(req.params.commentId,{
        $set:{
            content: comment
        }
    })
    res.status(200).json(new ApiResponse(200, commentToUpdate, "comment updated"))

})

const deleteComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const isVideo = await Video.findById(videoId)

    if(!isVideo){
        throw new ApiError(404, "video not found")
    }
    const {commentId} = req.params
    const isComment = await Comment.findById(commentId)
    if(!isComment){
        throw new ApiError(400,"comment not found")
    }

    const user = req.user?._id
    if(user.toString() !== isVideo.owner.toString() && user.toString() !== isComment.owner.toString() ){
        throw new ApiError(403, "you are not authorized to delete this comment")
    }
    await Comment.findByIdAndDelete(req.params.commentId)

    return res.status(200).json(new ApiResponse(200,"comment deleted successfully"))

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }