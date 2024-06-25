const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const Replicate = require("replicate");
const multer = require("multer");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: 'http://localhost:5174',  // Adjust to your React app's port
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer configuration for file upload handling
const upload = multer({
    dest: path.join(__dirname, "uploads"),
});

// Replicate API token from environment variables
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

// Function to convert image file to base64 string
const convertImageToBase64 = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            if (err) {
                return reject(err);
            }
            const base64Image = data.toString('base64');
            resolve(`data:image/jpeg;base64,${base64Image}`); // Adjust MIME type as necessary
        });
    });
};

// Endpoint to receive images, generate new image, and return URL
app.post("/api/generate-image", upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 }
]), async (req, res) => {
    try {
        const files = req.files;
        if (!files.image1 || !files.image2 || !files.image3 || !files.image4) {
            console.error("Not all images uploaded.");
            return res.status(400).send("All four images must be uploaded.");
        }

        // Convert images to base64
        const imagePaths = Object.keys(files).map(key => path.join(__dirname, "uploads", files[key][0].filename));
        const base64Images = await Promise.all(imagePaths.map(convertImageToBase64));

        // Prepare input for Replicate API
        const input = {
            prompt: "A photo of a young man img enjoying the party",
            num_steps: 50,
            input_image: base64Images[0],
            input_image2: base64Images[1],
            input_image3: base64Images[2],
            input_image4: base64Images[3],
            guidance_scale: 5,
            negative_prompt: "nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
            style_strength_ratio: 20
        };

        // Call Replicate API
        const response = await replicate.run(
            "tencentarc/photomaker:ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4",
            { input }
        );

        const generatedImageUrl = response; // Assuming response contains URL to generated image

        res.json({ generatedImageUrl });
    } catch (error) {
        console.error("Error generating image:", error);
        if (error.response) {
            console.error("Response data:", error.response.data);
            console.error("Response status:", error.response.status);
            console.error("Response headers:", error.response.headers);
        } else if (error.request) {
            console.error("Request data:", error.request);
        } else {
            console.error("Error message:", error.message);
        }
        res.status(500).send("Error generating image.");
    }
});

// Serve static files (optional)
app.use(express.static(path.join(__dirname, "public")));

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
