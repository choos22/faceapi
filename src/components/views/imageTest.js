import React, { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";

const ImageTest = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [detections, setDetections] = useState([]);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  // Hàm gọi khi có sự kiện thay đổi trong input file
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    try {
      setSelectedImage(URL.createObjectURL(file));
      setDetections([]);
    } catch (error) {
      console.log(error);
    }
  };

  // Tải các mô hình nhận diện khuôn mặt từ một địa chỉ URL.
  const loadModels = async () => {
    const MODEL_URL = "/models";
    try {
      console.log("Loading models...");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      console.log("Models loaded successfully");
    } catch (error) {
      console.error("Error loading models:", error);
    }
  };

  // Sử dụng thư viện face-api.js để nhận diện khuôn mặt trong ảnh và sau đó cập nhật state detections và vẽ canvas.
  const detectFaces = async () => {
    try {
      await loadModels();

      const img = await faceapi.fetchImage(selectedImage);

      const detections = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      let selectedFace = null;

      const updatedDetections = detections.map((detection) => {
        const landmarks = detection.landmarks;
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();

        const leftEyeSize = calculateEyeSize(leftEye);
        const rightEyeSize = calculateEyeSize(rightEye);

        const averageEyeSize = (leftEyeSize + rightEyeSize) / 2;
        const glassesThreshold = 22;

        const hasGlasses = averageEyeSize < glassesThreshold;

        if (hasGlasses && !selectedFace) {
          selectedFace = detection;
        }

        return {
          ...detection,
          hasGlasses,
        };
      });

      setDetections(updatedDetections);

      drawCanvas(img, updatedDetections, selectedFace);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Tính toán kích thước của mắt dựa trên landmarks của mắt.
  const calculateEyeSize = (eyeLandmarks) => {
    const eyeWidth = eyeLandmarks[3].x - eyeLandmarks[0].x;
    const eyeHeight = eyeLandmarks[5].y - eyeLandmarks[1].y;
    return Math.sqrt(eyeWidth ** 2 + eyeHeight ** 2);
  };

  // Hàm vẽ canvas dựa trên thông tin detections và selectedImage.
  const drawCanvas = (image, detections, selectedFace) => {
    const canvas = canvasRef.current;

    if (!canvas || !image) {
      return;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const detection of detections) {
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

      if (detection.hasGlasses) {
        if (!selectedFace || selectedFace === detection) {
          // Nếu chưa có gương mặt có đeo kính được chọn, hoặc gương mặt đang xét chính là gương mặt có đeo kính đầu tiên được phát hiện
          drawGlassesFrame(
            ctx,
            detection.landmarks.getLeftEye(),
            detection.landmarks.getRightEye()
          );
          ctx.strokeStyle = "blue";
          ctx.fillStyle = "blue";
          ctx.font = "18px Arial";
          ctx.fillText(
            "Có đeo kính",
            scaledBox.x,
            scaledBox.y + scaledBox.height + 18
          );
        } else {
          // Nếu đã có gương mặt có đeo kính được chọn, ẩn khung gương mặt không đeo kính
          ctx.globalCompositeOperation = "destination-over";
          ctx.fillStyle = "rgba(0, 0, 0, 0)";
          ctx.fillRect(box.x, box.y, box.width, box.height);
        }
      } else {
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "rgba(0, 0, 0, 0)";
        ctx.fillRect(box.x, box.y, box.width, box.height);
        ctx.fillStyle = "red";
        ctx.font = "18px Arial";
        ctx.fillText(
          "Không đeo kính",
          scaledBox.x,
          scaledBox.y + scaledBox.height + 18
        );
      }

      ctx.strokeStyle = detection.hasGlasses ? "blue" : "red";
      ctx.stroke();
      ctx.fillStyle = detection.hasGlasses ? "blue" : "red";
    }
  };

  // Hàm vẽ khung của chiếc kính
  const drawGlassesFrame = (ctx, leftEyeLandmarks, rightEyeLandmarks) => {
    // Vẽ khung của chiếc kính bằng cách sử dụng leftEyeLandmarks và rightEyeLandmarks
    // Bạn có thể tùy chỉnh kích thước và hình dạng của khung kính ở đây
    const frameWidth = rightEyeLandmarks[3].x - leftEyeLandmarks[0].x; // Điều chỉnh tỉ lệ rộng của khung
    const frameHeight = frameWidth * 0.5; // Chiều cao có thể được điều chỉnh tùy ý

    const frameX = leftEyeLandmarks[0].x; // Điều chỉnh vị trí khung theo x
    const frameY =
      (leftEyeLandmarks[1].y + rightEyeLandmarks[4].y) / 2 - frameHeight / 2;

    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    ctx.strokeRect(frameX, frameY, frameWidth, frameHeight);
  };

  // Effect này được gọi sau mỗi lần render và đặt lại kích thước canvas, sau đó gọi hàm vẽ lại canvas nếu có sự thay đổi trong selectedImage hoặc detections.
  useEffect(() => {
    if (imageRef.current && canvasRef.current) {
      const image = imageRef.current;
      // Đặt kích thước canvas theo kích thước của ảnh
      canvasRef.current.width = image.width;
      canvasRef.current.height = image.height;
      drawCanvas(image, detections);
    }
  }, [selectedImage, detections]);

  return (
    <div>
      <h1>Face Check</h1>
      <input type="file" accept="image/*" onChange={handleImageChange} />
      <button onClick={detectFaces}>Detect Faces</button>
      {selectedImage && (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img
            ref={imageRef}
            src={selectedImage}
            alt="Selected"
            onLoad={() => drawCanvas(imageRef.current, detections)}
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

export default ImageTest;
