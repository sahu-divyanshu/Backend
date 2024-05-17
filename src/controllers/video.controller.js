import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import { User } from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary,deleteOnCloudinary} from "../utils/cloudinary.js"


const checkVideoAuth = async(videoId,owner) =>{
    const isVideo = await Video.findById(videoId)
    if(!isVideo){
        throw new ApiError(400,"invalid video id")
    }
    if(owner.toString() !== isVideo.owner.toString()){
        throw new ApiError(200, "User is not authenticated");
    }
    return isVideo 
}

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    const options = {
        page: page,
        limit: limit,
    };


    try {
        const videos = await Video.aggregate([
            {
                $match: {
                    isPublished: true,
                    ...(query && { $text: { $search: query } }),
                    ...(userId && { owner: new mongoose.Types.ObjectId(userId) }),
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "createdBy",
                }
            },
            {
                $addFields: {
                    createdBy: { $arrayElemAt: ["$createdBy", 0] }
                }
            },
            {
                $project: {
                    title: 1,
                    description: 1,
                    createdAt: 1,
                    createdBy: {
                        fullName: 1,
                        username: 1,
                        avatar: 1
                    }
                }
            },
            {
                $sort: {
                    [sortBy || 'createdAt']: sortType === 'desc' ? -1 : 1
                }
            },
            {
                $skip: (page - 1) * limit
            },
            {
                $limit: limit
            }
        ]);

        // const sendVideos = await Video.aggregatePaginate(videos, options);

        if (!videos.length) {
            throw new ApiError(500, "Videos are missing");
        }

        return res.status(200).json(new ApiResponse(200, { videos }, "Videos fetched successfully"));

    } catch (err) {
        console.log(err);
        return res.status(500).json(new ApiResponse(500, null, "An error occurred while fetching videos"));
    }
});


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    if(!title){
        throw new ApiError(400, "Title is required")
    }

    const videoLocalPath = req.files?.videoFile[0]?.path;
    let thumbnailLocalPath;
    if(req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0){
        thumbnailLocalPath = req.files?.thumbnail[0]?.path;  
    }

    if(!videoLocalPath){
        throw new ApiError(400,"video is required")
    }
    const video = await uploadOnCloudinary(videoLocalPath)
    console.log(video)
    const thumbnail = thumbnailLocalPath ? await uploadOnCloudinary(thumbnailLocalPath) : null;
     console.log(thumbnail)
    const videoUpload = await Video.create({
        title,
        description,
        videoFile:video.url,
        thumbnail:thumbnail.url,
        duration: video.duration,
        owner: req.user._id,    
    })
    if(!videoUpload){
        throw new ApiError(500,"unable to upload ")
    }
    return res.status(200).json(new ApiResponse(200,{videoUpload},"video uploaded successfully"))

    
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId){
        throw new ApiError(400,"video id is required")
    }
    const user = req.user?._id;
    if(!user) throw new ApiError(400,"user not found")
    // remove from previous place in watch history
    await User.findByIdAndUpdate(user,{
        $pull:{
            watchHistory:{
                $each:[videoId],
            }
        }
    })
    await User.findByIdAndUpdate(user,{
        $push:{
            watchHistory:{
                $each:[videoId],
                $position:0,
            }
        }
    })
    await Video.findByIdAndUpdate(videoId,{
        $inc:{
            views:1
        }
    })
    const video = await Video.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"createdBy",
                pipeline:[
                    {
                        $lookup:{
                            from:"subscriptions",
                            localField:"_id",
                            foreignField:"channel",
                            as:"subscribers"
                        }
                    },
                    {
                        $addFields:{
                            subscribersCount:{
                                $size:"$subscribers"
                            },
                            isSubscribed:{
                                $cond:{
                                    if:{
                                        $in:[req.user._id,"$subscribers.subscriber"]
                                    },
                                    then:true,
                                    else:false
                                }
                            }
                        }
                    },{
                    $project:{
                        fullName: 1,
                        username: 1,
                        suscribersCount: 1,
                        isSubscribed: 1,
                        avatar: 1,
                    }
                }
                ]
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"like",

            }
        },{
        $addFields:{
            isLikeByUser: {
                $cond: {
                  if: { $in: [req?.user?._id, "$like.likeBy"] },
                  then: true,
                  else: false,
                },
              },
              like: {
                $size: "$like",
              },
              createdBy: {
                $first: "$createdBy",
              },
        }}

    ])
    if (!video.length) throw new ApiError(401, "video id is Invalid");
    return res
      .status(200)
      .json(new ApiResponse(200, video[0], "video fetched Successfully"));
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body
    if(!title){
        throw new ApiError(400,"title is required")
    }
    //TODO: update video details like title, description, thumbnail

    const thumbnailLocalPath = req.file?.path;
    if (!thumbnailLocalPath) throw new ApiError(401, "Thumbnail file is missing");

    const thumbnail = await uploadOnCloudinary(avatarLocalPath);
    if (!thumbnail.url) throw new ApiError(500, "Error while uploading file");

    if(!videoId) throw new ApiError(400,"unable to get video id")

    
    const isVideo = await checkVideoAuth(videoId, req.user?._id);
    await deleteOnCloudinary(isVideo.thumbnail);

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                title:title,
                description:description,
                thumbnail: thumbnail.url,
            }
        }
    )
   
    return res.status(200).json(new ApiResponse(200,{video},"updated succcessfully"))

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const isVideo = await checkVideoAuth(videoId,req.user?._id)

    const deleteVideo = await deleteOnCloudinary(isVideo.videoFile)
    const deleteVideoThumbnail = await deleteOnCloudinary(isVideo.thumbnail)
    if(!deleteVideoThumbnail) throw new ApiError(500,"thumbnail is not deleted from cloudinary")
    if(!deleteVideo) throw new ApiError(500,"video is not deleted from cloudinary")

    const deleteVideoDatabase = await Video.findByIdAndDelete(videoId)

    if(!deleteVideoDatabase) throw new ApiError(500,"video is not deleted from database")
    return res.status(200).json(new ApiResponse(200,"deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const isVideo = await checkVideoAuth(videoId,req.user?._id)

    if (!isVideo) throw new ApiError(404, "video not found");


    const video = await Video.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(videoId),
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"createdBy",
                pipeline:[{
                    $project:{
                        fullName:1,
                        username:1,
                        avatar:1,
                        
                    }
                }]
            }
        },
        {
            $addFields: {
                createdBy: { $arrayElemAt: ["$createdBy", 0] }
            }
        }
    ])
    if (!video.length) throw new ApiError(401, "video id is invalid");
    const toggleStatus = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{isPublished: !video[0].isPublished,}
        },
        { new: true }
    )
    return res.status(200).json(new ApiResponse(200,{ ...video[0], isPublished: toggleStatus.isPublished },
        "Publish status toggled Successfully"))
    
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}