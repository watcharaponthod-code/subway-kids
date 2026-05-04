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
        # We no longer strictly need cv2.VideoCapture if the browser sends frames.
        # But we'll keep it as an optional fallback or just remove it if we want to be clean.
        self.cap = None 
        
        mp_pose = mp.solutions.pose
        self.pose = mp_pose.Pose(
            model_complexity=0,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.mp_pose    = mp_pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.current_lane = 1
        self.active = True

    def process_frame(self, frame):
        """Processes a single frame and returns (lane, jump, processed_frame)"""
        lane = 1
        jump = False
        
        # Mirror and process
        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb)

        if results.pose_landmarks:
            lm = results.pose_landmarks.landmark
            # Center of hips
            left_hip = lm[self.mp_pose.PoseLandmark.LEFT_HIP]
            right_hip = lm[self.mp_pose.PoseLandmark.RIGHT_HIP]
            nose = lm[self.mp_pose.PoseLandmark.NOSE]
            
            cx = (left_hip.x + right_hip.x) / 2.0
            if cx < LEFT_ZONE: lane = 0
            elif cx > RIGHT_ZONE: lane = 2
            
            # Jump: nose height (lower Y is higher in image)
            if nose.y < 0.3: jump = True

            # Draw pose
            self.mp_drawing.draw_landmarks(
                frame, results.pose_landmarks, self.mp_pose.POSE_CONNECTIONS)

        return lane, jump, frame

    def release(self):
        if self.cap:
            self.cap.release()
        self.pose.close()
