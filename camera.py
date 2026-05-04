"""
camera.py — MediaPipe Pose wrapper.
Reads webcam frames, detects the player's body,
and returns which lane (0=left, 1=center, 2=right) they are in.
"""

import cv2
import mediapipe as mp
from settings import CAMERA_INDEX, CAMERA_WIDTH, CAMERA_HEIGHT, LEFT_ZONE, RIGHT_ZONE


class PoseCamera:
    def __init__(self):
        self.cap = cv2.VideoCapture(CAMERA_INDEX)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAMERA_WIDTH)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_HEIGHT)

        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            model_complexity=0,          # 0 = fastest (lite)
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.current_lane = 1  # default center
        self.active = self.cap.isOpened()

    def update(self) -> int:
        """Read one frame, detect pose, return lane (0/1/2)."""
        if not self.active:
            return self.current_lane

        ret, frame = self.cap.read()
        if not ret:
            return self.current_lane

        # Mirror the frame so left/right feel natural
        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb)

        if results.pose_landmarks:
            lm = results.pose_landmarks.landmark
            # Use average of LEFT_HIP (23) and RIGHT_HIP (24) as body center
            left_hip  = lm[self.mp_pose.PoseLandmark.LEFT_HIP]
            right_hip = lm[self.mp_pose.PoseLandmark.RIGHT_HIP]
            center_x  = (left_hip.x + right_hip.x) / 2.0  # 0.0–1.0

            if center_x < LEFT_ZONE:
                self.current_lane = 0
            elif center_x > RIGHT_ZONE:
                self.current_lane = 2
            else:
                self.current_lane = 1

        return self.current_lane

    def release(self):
        self.cap.release()
        self.pose.close()
