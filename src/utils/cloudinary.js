import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "./ApiError";
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async(localFilePath)=>{
    try {
        if(!localFilePath) return null;
        // upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        // console.log("file is uploded on cloudinary",response.url);
      //  fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temp file as the upload failed
        return null; 
    }
}
const deleteOnCloudinary = async(url) =>{
  try {
    let publicId = await extractPublicId(url)
    if(!publicId) {
      throw new ApiError(400, "invalid cloudinary url")
    }
    const deletionResult = await cloudinary.uploader.destroy(publicId);
    if(deletionResult.result !== "ok"){
      throw new ApiError(400, "failed to delete file on cloudinary")
    }
    return deletionResult;

  } catch (error) {
    console.log("error while deleting : ",error)
    throw error;
  }
}

export {uploadOnCloudinary,deleteOnCloudinary}