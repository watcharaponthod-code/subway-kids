"""
server/camera.py — MediaPipe Pose wrapper (server edition).
Reuses the same logic as the original, adapted for use inside FastAPI.
"""

import cv2
import mediapipe as mp

CAMERA_INDEX = 0
CAMERA_W     = 640
CAMERA_H     = 480
LEFT_ZONE    = 0.38   # body-center x < this  → lane 0 (left)
RIGHT_ZONE   = 0.62   # body-center x > this  → lane 2 (right)


class PoseCamera:
    def __init__(self):
        self.cap  = cv2.VideoCapture(CAMERA_INDEX)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH,  CAMERA_W)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_H)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)   # reduce latency

        mp_pose = mp.solutions.pose
        self.pose = mp_pose.Pose(
            model_complexity=0,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.mp_pose    = mp_pose
        self.current_lane = 1
        self.active     = self.cap.isOpened()

    def update(self) -> int:
        if not self.active:
            return self.current_lane

        ret, frame = self.cap.read()
        if not ret:
            return self.current_lane

        frame  = cv2.flip(frame, 1)                         # mirror
        rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = self.pose.process(rgb)

        if result.pose_landmarks:
            lm       = result.pose_landmarks.landmark
            LEFT_HIP  = lm[self.mp_pose.PoseLandmark.LEFT_HIP]
            RIGHT_HIP = lm[self.mp_pose.PoseLandmark.RIGHT_HIP]
            cx        = (LEFT_HIP.x + RIGHT_HIP.x) / 2.0   # 0.0–1.0

            if cx < LEFT_ZONE:
                self.current_lane = 0
            elif cx > RIGHT_ZONE:
                self.current_lane = 2
            else:
                self.current_lane = 1

        return self.current_lane

    def release(self):
        self.cap.release()
        self.pose.close()
