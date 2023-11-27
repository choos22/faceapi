import React, { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";

const Image = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [detections, setDetections] = useState([]);
  const [wearingMask, setWearingMask] = useState(false);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  const handleImageChange = async (event) => {
    const file = event.target.files[0];

    try {
      if (file && /\.(jpe?g|png)$/i.test(file.name)) {
        const imageUrl = URL.createObjectURL(file);
        setSelectedImage(imageUrl);
        setDetections([]);

        // Load models and detect faces
        await loadModels();
        await detectFaces(imageUrl);
      } else {
        console.error(
          "Invalid file format. Please select a jpg, jpeg, or png file."
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  const loadModels = async () => {
    const MODEL_URL = "/models";
    try {
      console.log("Loading models...");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      ]);
      console.log("Models loaded successfully");
    } catch (error) {
      console.error("Error loading models:", error);
    }
  };

  const getAverageColor = (image) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, image.width, image.height);
    const imageData = ctx.getImageData(0, 0, image.width, image.height).data;

    let sumRed = 0;
    let sumGreen = 0;
    let sumBlue = 0;

    for (let i = 0; i < imageData.length; i += 4) {
      sumRed += imageData[i];
      sumGreen += imageData[i + 1];
      sumBlue += imageData[i + 2];
    }

    const totalPixels = imageData.length / 4;
    const averageRed = sumRed / totalPixels;
    const averageGreen = sumGreen / totalPixels;
    const averageBlue = sumBlue / totalPixels;

    return {
      red: averageRed,
      green: averageGreen,
      blue: averageBlue,
    };
  };

  const isMaskColor = (averageColor, threshold) => {
    // Kiểm tra xem màu sắc có phù hợp với màu của khẩu trang hay không
    return (
      averageColor.red > threshold &&
      averageColor.green > threshold &&
      averageColor.blue > threshold
    );
  };

  const hasMask = (
    leftEyeLandmarks,
    rightEyeLandmarks,
    mouthLandmarks,
    faceImage
  ) => {
    const maskWidth = rightEyeLandmarks[3].x - leftEyeLandmarks[0].x;
    const maskHeight = (mouthLandmarks[7].y - leftEyeLandmarks[1].y) * 1.5;

    // Điều chỉnh ngưỡng cho việc xác định đeo khẩu trang
    const maskThreshold = 20;
    const maskWidthThreshold = 50; // Điều chỉnh ngưỡng chiều rộng
    const maskHeightThreshold = 50; // Điều chỉnh ngưỡng chiều cao

    // Kiểm tra maskWidth và maskHeight để xác định maskSize
    const maskSize = Math.sqrt(maskWidth ** 2 + maskHeight ** 2);

    // Nếu maskSize lớn hơn ngưỡng và kích thước chiều rộng và chiều cao thỏa mãn
    const wearingMask =
      maskSize > maskThreshold &&
      maskWidth > maskWidthThreshold &&
      maskHeight > maskHeightThreshold;

    // Kiểm tra màu sắc của khuôn mặt để xác định xem có sự tương quan với khẩu trang hay không
    const averageFaceColor = getAverageColor(faceImage);
    const maskColorThreshold = 0.5; // Điều chỉnh ngưỡng màu sắc

    return wearingMask && isMaskColor(averageFaceColor, maskColorThreshold);
  };

  const drawCanvas = (image, detections) => {
    const canvas = canvasRef.current;

    if (!canvas || !image) {
      return;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Đặt wearingMask thành false mỗi lần vẽ canvas
    setWearingMask(false);

    // Loop through all detected faces
    detections.forEach((detection) => {
      const box = detection.detection.box;
      ctx.lineWidth = 2;

      const scaledBox = {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      };

      ctx.beginPath();
      ctx.rect(scaledBox.x, scaledBox.y, scaledBox.width, scaledBox.height);

      // Nếu có đeo khẩu trang, vẽ khung vàng và hiển thị chữ "Có khẩu trang"
      if (detection.hasMask) {
        setWearingMask(true); // Đặt wearingMask thành true
        ctx.strokeStyle = "yellow";
        ctx.stroke();
        ctx.font = "16px Arial";
        ctx.fillStyle = "yellow";
        ctx.fillText("Có khẩu trang", scaledBox.x, scaledBox.y - 5);
      } else {
        // Nếu không đeo khẩu trang, vẽ khung đỏ
        ctx.strokeStyle = "red";
        ctx.stroke();
        ctx.font = "16px Arial";
        ctx.fillStyle = "red";
        ctx.fillText("Không đeo khẩu trang", scaledBox.x, scaledBox.y - 5);
      }
    });
  };

  const detectFaces = async (imageUrl) => {
    const img = await faceapi.fetchImage(imageUrl);

    const detections = await faceapi
      .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    const updatedDetections = detections.map((detection) => {
      const hasMaskValue = hasMask(
        detection.landmarks.getLeftEye(),
        detection.landmarks.getRightEye(),
        detection.landmarks.getMouth(),
        img
      );

      return {
        ...detection,
        hasMask: hasMaskValue,
      };
    });

    setDetections(updatedDetections);

    // Vẽ canvas và thực hiện các hành động khác dựa trên trạng thái của khẩu trang
    drawCanvas(img, updatedDetections);
  };

  useEffect(() => {
    // Nếu có sự thay đổi trong selectedImage hoặc detections, vẽ lại canvas
    if (imageRef.current && canvasRef.current) {
      const image = imageRef.current;
      canvasRef.current.width = image.width;
      canvasRef.current.height = image.height;
      drawCanvas(image, detections);
    }
  }, [selectedImage, detections]);

  return (
    <div>
      <h1>Face Check</h1>
      <input type="file" accept="image/*" onChange={handleImageChange} />

      {selectedImage && (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img
            ref={imageRef}
            src={selectedImage}
            alt="Selected"
            onLoad={() => detectFaces(selectedImage)}
          />
          <canvas
            ref={canvasRef}
            style={{ position: "absolute", top: 0, left: 0 }}
          />
        </div>
      )}
    </div>
  );
};

export default Image;
