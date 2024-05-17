import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    
    if(!name || !description) {
        throw new ApiError(400, "Please provide all required fields")
    }
    const user = req.user._id;
    const isPlaylist = await Playlist.aggregate([
        {
            $match: {
                name: name,
                owner: mongoose.Types.ObjectId(user)
            }
        }
    ]) 
  
    if (isPlaylist?.length) throw new ApiError(401, "playlist already exist");



    const playlist = await Playlist.create({
        name,
        description,
        owner
    })

    if (!playlist) throw new ApiError(500, "Error while creating playlist ");

    return res.status(200).json(new ApiResponse(200,{playlist},"playlist created successfully"))
    
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
  
    if (!userId) throw new ApiError(401, "userId is missing");

    const getPlaylist  = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
              from: "videos",
              localField: "videos",
              foreignField: "_id",
              as: "playlistVideos",
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
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "creator",
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
              owner: {
                $first: "$creator",
              },
            },
          },
        ]);
        console.log(getPlaylist);
        return res
          .status(200)
          .json(
            new ApiResponse(200, getPlaylist, "User's playlist fetch Successfully")
    );

})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if(!playlistId){
        throw new ApiError(400,"playlist not found")
    } 
    const playlist = await Playlist.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(playlistId),
          },
        },
        {
          $lookup: {
            from: "videos",
            localField: "videos",
            foreignField: "_id",
            as: "playlistVideos",
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
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "creator",
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
            isUserOwner: {
              $eq: [new mongoose.Types.ObjectId(req.user._id), "$owner"],
            },
            creator: {
              $first: "$creator",
            },
          },
        },
      ]);
      if (!playlist.length) throw new ApiError(401, "playlist id is not valid");
      return res
        .status(200)
        .json(new ApiResponse(200, playlist[0], "playlist fetch Successfully"));
    
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
   
        const { videoId, playlistId } = req.params;
        if (!videoId || !playlistId)
          throw new ApiError(400, "video id and playlist id are required");
      
        const playlist = await Playlist.findById(playlistId);
        if (!playlist)
          throw new ApiError(404, "Playlist not found");
      
        if (playlist.owner.toString() !== req.user._id.toString())
          throw new ApiError(403, "User is not authorized");
      
        if (playlist.videos.some(item => item.toString() === videoId))
          throw new ApiError(400, "Video already present in playlist");
      
        const updatedPlaylist = await Playlist.findByIdAndUpdate(
          playlistId,
          { $push: { videos: videoId } },
          { new: true } // This ensures that the updated document is returned
        );
      
        if (!updatedPlaylist)
          throw new ApiError(500, "Failed to add video to playlist");
      
        res.status(200).json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully"));
    });
      


const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if (!videoId || !playlistId)
        throw new ApiError(400, "video id and playlist id is required");
      const playlist = await Playlist.findById(playlistId);
      if (!playlist) throw new ApiError(401, "playlist id is not valid");
      if (playlist.owner.toString() !== req.user._id.toString())
        throw new ApiError(402, "User is not authorized");
      const removeVideo = await Playlist.findByIdAndUpdate(playlistId, {
        $pull: {
          videos: videoId,
        },
      });
      console.log("remove videos", removeVideo);
      if (!removeVideo) throw new ApiError(500, "video is not removed in playlist");
      res
        .status(200)
        .json(new ApiResponse(200, {}, "video removed to playlist Successfully"));

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    if (!playlistId) throw new ApiError(400, "playlist id is required");
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(401, "playlist id is not valid");
    if (playlist.owner.toString() !== req.user._id.toString())
      throw new ApiError(402, "User is not authorized");
    const deletePlaylist = await Playlist.findByIdAndDelete(playlistId);
   
    if (!deletePlaylist) throw new ApiError(500, "playlist delete failed");
    res
      .status(200)
      .json(new ApiResponse(500, {}, "delete playlist Successfully"));
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    if (!name || !description)
        throw new ApiError(400, "name and discription is required");
    if (!playlistId) throw new ApiError(400, "playlist id is required");
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(401, "playlist id is not valid");
    if (playlist.owner.toString() !== req.user._id.toString())
        throw new ApiError(402, "User is not authorized");
    const update = await Playlist.findByIdAndUpdate(playlistId, {
        name,
        description,
    });
    if (!update) throw new ApiError(500, "playlist is not updated");
    return res
        .status(200)
        .json(new ApiResponse(200, update, "playlist is updated Successfully"));
    
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}