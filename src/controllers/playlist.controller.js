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
            
        }
    ])

})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
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